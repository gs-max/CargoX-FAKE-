# Hardhat & Ethers.js 测试核心要点笔记

这份笔记总结了在使用 Hardhat 和 Ethers.js 对 Solidity 智能合约进行单元测试时，最常见的问题和最佳实践解决方案。

---

### 1. 异步操作与 `await`：第一黄金法则

**问题现象**:
在测试中断言失败，错误通常为 `AssertionError: expected undefined to equal ...`。这是因为你试图从一个尚未完成的异步操作中读取数据。

**核心原因**:
与智能合约的所有交互（无论是读数据还是写数据）都是异步的，并返回一个 Promise 对象，而不是直接的结果。

**解决方案与代码模式**:

**法则**: **任何对合约方法的调用，前面几乎永远都要加 `await`。**

**正确语法**: `await` 必须等待整个 Promise 解析完毕后，才能访问其结果的属性。不要将 `.property` 直接链在 Promise 后面。

```javascript
// 错误 ❌
const status = contract.bookings(id).status; // status 是一个 Promise

// 同样错误 ❌
const status = await contract.bookings(id).status; // status 是 undefined

// 正确 ✅
const booking = await contract.bookings(id); // 先 await 拿到完整的对象
const status = booking.status; // 然后从对象中安全地获取属性
```

---

### 2. 事件测试：黄金标准

**问题现象**:
难以验证事件是否被正确触发，或无法捕获事件中动态生成的参数（如 ID）。

**核心原因**:
手动解析交易回执 `receipt.events` 的方法不稳定，在某些环境下可能返回 `undefined`。

**解决方案与代码模式**:

**法则**: **使用 `hardhat-chai-matchers` 插件的 `emit/withArgs` 链式调用。**

```javascript
// 1. 在测试用例的外部作用域声明一个变量来“捕获”动态值
let capturedAmendmentId;

// 2. 在 expect 中使用 .to.emit 和 .withArgs
await expect(tx)
    .to.emit(contract, "EventName") // 断言触发了名为 EventName 的事件
    .withArgs(
        // 参数一：一个动态生成的ID，我们需要捕获它
        (dynamicId) => {
            capturedAmendmentId = dynamicId; // 在回调函数中捕获值
            return true; // 返回 true 表示断言通过
        },
        // 参数二：一个我们已知的确切值，用于严格匹配
        "some_known_value",
        // 参数三：另一个已知地址
        shipper_1.address
    );

// 3. 在后续的测试中，使用已捕获的变量
const newAmendment = await contract.amendments(capturedAmendmentId);
// ...进行更多断言
```

---

### 3. 访问控制测试

**问题现象**:
需要验证某个函数调用会因为调用者权限不足而失败。

**核心原因**:
OpenZeppelin v5+ 的访问控制合约在权限不足时，会抛出特定的**自定义错误 (Custom Error)**。

**解决方案与代码模式**:

**法则**: **使用 `.to.be.revertedWithCustomError()` 进行精确断言。**

```javascript
// 验证一个非管理员账户调用一个仅限管理员的函数
await expect(
    contract.connect(nonAdminSigner).adminOnlyFunction()
).to.be.revertedWithCustomError(
    contract,
    "AccessControlUnauthorizedAccount"
);
```
这个方法远比检查一个通用的 `reverted` 字符串要健壮和明确。
