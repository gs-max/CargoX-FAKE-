const { ethers, deployments } = require("hardhat");
const { assert, expect } = require("chai");

describe("BookingLedger", function () {
    let bookingLedger, deployer, shipper_1, shipper_2;

    beforeEach(async function () {
        await deployments.fixture(["all"]);
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        shipper_1 = accounts[1];
        shipper_2 = accounts[2];
        captureBookingId = "";
        const bookingLedgerDeployment = await deployments.get("BookingLedger");
        bookingLedger = await ethers.getContractAt("BookingLedger", bookingLedgerDeployment.address);
    });

    it("mainCarrier is the deployer", async function () {
        const mainCarrier = await bookingLedger.mainCarrier();
        assert.equal(mainCarrier, deployer.address);
    })

    it("actor init", async function(){
        const adminRole = await bookingLedger.DEFAULT_ADMIN_ROLE();
        const carrierRole = await bookingLedger.CARRIER_ROLE();
        const result_admin = await bookingLedger.hasRole(adminRole, deployer.address);
        const result_carrier = await bookingLedger.hasRole(carrierRole, deployer.address);
        assert.equal(result_admin, true, 'deployer is admin');
        assert.equal(result_carrier, true, 'deployer is carrier')
    })

    it("grant shipper role", async function () {
        const tx = await bookingLedger.connect(deployer).grantShipperRole(shipper_1.address);
        await tx.wait(1);
        const shipperRole = await bookingLedger.SHIPPER_ROLE();
        const result_shipper = await bookingLedger.hasRole(shipperRole, shipper_1.address);
        assert.equal(result_shipper, true, 'shipper_1 is shipper');
        await expect(
            bookingLedger.connect(shipper_1).grantShipperRole(shipper_2.address)
        ).to.be.revertedWithCustomError(bookingLedger, "AccessControlUnauthorizedAccount");
    })

    /*it("Test Case 2.1: shipper_1 create booking successfully", async function () {
        await bookingLedger.grantShipperRole(shipper_1.address);
        const tx = await bookingLedger.connect(shipper_1).createBooking("1000 containers");
        await expect(tx)
        .to.emit(bookingLedger, "BookingCreated")
        .withArgs(
            ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
            shipper_1.address, // shipper: 我们知道确切值
            deployer.address,  // carrier: 我们知道确切值
            0,                 // amendmentCount: 初始值为 0
            0,                 // status: BookingStatus.CONFIRMED 的 enum 值是 0
            "1000 containers"  // details: 我们知道确切值
        );
    })*/
    it("Test Case 2.1: shipper_1 create booking successfully", async function () {
        await bookingLedger.grantShipperRole(shipper_1.address);
        const tx = await bookingLedger.connect(shipper_1).createBooking("1000 containers");
        let captureBookingId;
        await expect(tx)
            .to.emit(bookingLedger, "BookingCreated")
            .withArgs(
                (bookingId) => {
                    // 1. 用回调函数捕获动态生成的 bookingId
                    console.log("成功捕获到的 bookingId:", bookingId);
                    captureBookingId = bookingId;
                    // 2. 对它进行断言，比如确保它不是空的
                    expect(bookingId).to.not.be.null;
                    // 3. 回调函数必须返回 true 表示验证通过
                    return true;
                },
                shipper_1.address, // shipper: 我们知道确切值
                deployer.address,  // carrier: 我们知道确切值
                0,                 // amendmentCount: 初始值为 0
                0,                 // status: BookingStatus.CONFIRMED 的 enum 值是 0
                "1000 containers"  // details: 我们知道确切值
            );
        const shipperBookingsArray = await bookingLedger.shipperBookings(shipper_1.address, 0);
        const carrierBookingsArray = await bookingLedger.carrierBookings(deployer.address, 0);
        assert.equal(captureBookingId, shipperBookingsArray);
        assert.equal(captureBookingId, carrierBookingsArray);
    });

    it("shipper_2 create booking failed", async function(){
        await expect(bookingLedger.connect(shipper_2).createBooking("1000 containers"))
        .to.be.revertedWithCustomError(bookingLedger, "AccessControlUnauthorizedAccount");
    })


    /**Test Case 3.1: 原始托运人成功请求修改
        目标: 验证订舱的原始托运人可以成功发起修改请求。
        步骤: shipper1 对他创建的订舱调用 requestAmendment。
        断言:
        AmendmentRequested 事件被正确触发。
        原订舱状态变为 PENDING_AMENDMENT。
        amendments mapping 中创建了新的修改记录（这个目前我无法实现，只能实现确认有新的修改）。
        amendmentByBooking 索引数组中包含了这个新的 amendmentId。 */
    it("shipper_1 request amendment successfully", async function(){
        await bookingLedger.grantShipperRole(shipper_1.address);
        await bookingLedger.connect(shipper_1).createBooking("1000 containers");
        const bookingId = await bookingLedger.shipperBookings(shipper_1.address, 0);
        const amendmentCountBefore = await bookingLedger.amendmentCount();
        let captureAmendmentId;

        const tx = await bookingLedger.connect(shipper_1).requestAmendment(bookingId, "100 containers");
        const amendmentCountAfter = await bookingLedger.amendmentCount();
        assert.equal(amendmentCountAfter, amendmentCountBefore + BigInt(1));
        await expect(tx)
        .to.emit(bookingLedger, "AmendmentRequested")
        .withArgs(
            (amendmentId) => {
                console.log("捕获到amendmentId:", amendmentId);
                captureAmendmentId = amendmentId;
                return true;
            },
            (bookingId) => {
                console.log("捕获到bookingId:",bookingId);
                return true;
            },
            shipper_1.address,
            "100 containers",
            0,
        );
        const status = await bookingLedger.bookings(bookingId);
        console.log("booking status:", status.status);
        assert.equal(status.status, 1);
        const amendmentByBooking = await bookingLedger.amendmentByBooking(bookingId, 0);
        assert.equal(captureAmendmentId, amendmentByBooking);
        
        /*
        Test Case 1.1: 成功部署
        目标: 验证合约成功部署。
        步骤: 部署合约。
        断言: 合约地址有效；mainCarrier 变量被正确设置为部署者的地址。
        Test Case 1.2: 角色初始化
        目标: 验证部署者自动获得管理员和承运人角色。
        步骤: 部署合约。
        断言: hasRole(DEFAULT_ADMIN_ROLE, deployer) 应为 true；hasRole(CARRIER_ROLE, deployer) 应为 true。
        Test Case 1.3: 授权托运人角色
        目标: 验证管理员可以授予托运人角色，而非管理员不能。
        步骤:
        使用管理员账户调用 grantShipperRole 为一个新地址（shipper1）授权。
        使用一个普通账户（shipper1）尝试为另一个地址（shipper2）授权。
        断言:
        hasRole(SHIPPER_ROLE, shipper1) 应为 true。
        第二次调用应失败，并提示 "AccessControl: account is missing role"。
        测试组 2：核心流程 - 创建订舱 (Booking Creation)
        Test Case 2.1: 托运人成功创建订舱
        目标: 验证一个已授权的托运人可以成功创建订舱。
        步骤: shipper1 调用 createBooking。
        断言:
        BookingCreated 事件被正确触发，且 shipper, carrier, bookingId 等参数正确。
        通过 bookingId 查询，bookings mapping 中的新订舱数据完整且正确。
        shipperBookings[shipper1] 和 carrierBookings[mainCarrier] 索引数组中都包含了这个新的 bookingId。
        Test Case 2.2: 无权限账户创建订舱失败
        目标: 验证未授权的账户无法创建订舱。
        步骤: 一个未被授予 SHIPPER_ROLE 的账户尝试调用 createBooking。
        断言: 交易应失败，提示 "AccessControl: account is missing role"。
        测试组 3：核心流程 - 修改请求 (Amendment Request)
        Test Case 3.1: 原始托运人成功请求修改
        目标: 验证订舱的原始托运人可以成功发起修改请求。
        步骤: shipper1 对他创建的订舱调用 requestAmendment。
        断言:
        AmendmentRequested 事件被正确触发。
        原订舱状态变为 PENDING_AMENDMENT。
        amendments mapping 中创建了新的修改记录。
        amendmentByBooking 索引数组中包含了这个新的 amendmentId。
        Test Case 3.2: 非原始托运人请求修改失败
        目标: 验证只有订舱的创建者才能发起修改。
        步骤: 另一个托运人 shipper2 尝试对 shipper1 的订舱调用 requestAmendment。
        断言: 交易应失败，提示 "Only shipper can request amendment"。
        Test Case 3.3: 对非 CONFIRMED 状态的订舱请求修改失败
        目标: 验证不能对一个已经是 PENDING_AMENDMENT 状态的订舱再次发起修改。
        步骤: shipper1 对一个已经是 PENDING_AMENDMENT 的订舱再次调用 requestAmendment。
        断言: 交易应失败，提示 "Booking must be confirmed"。
        测试组 4：核心流程 - 处理修改 (Amendment Processing)
        这是最复杂的流程，需要覆盖确认和拒绝两种情况。

        Test Case 4.1: 承运人确认修改
        目标: 验证承运人确认修改后，所有状态和数据都按规范更新。
        步骤: 承运人对一个 PENDING_AMENDMENT 的订舱调用 processAmendment，并设置 isConfirmed = true。
        断言:
        AmendmentConfirmed 事件被触发。
        订舱状态恢复为 CONFIRMED。
        关键：订舱的 details 被更新为修改单中的 newsDetails。
        修改单状态变为 AMENDMENT_CONFIRMED。
        Test Case 4.2: 承运人拒绝修改
        目标: 验证承运人拒绝修改后，所有状态和数据都按规范更新。
        步骤: 承运人调用 processAmendment，设置 isConfirmed = false 并提供 reason。
        断言:
        AmendmentDeclined 事件被触发，且包含 reason。
        订舱状态恢复为 CONFIRMED。
        关键：订舱的 details 保持不变。
        修改单状态变为 AMENDMENT_DECLINED，且 reason 字段被记录。
        Test Case 4.3: 非承运人处理修改失败
        目标: 验证只有承运人才能处理修改。
        步骤: shipper1 尝试调用 processAmendment。
        断言: 交易应失败，提示 "AccessControl: account is missing role"。
        测试组 5：辅助流程与数据检索
        Test Case 5.1: 托运人取消被拒绝的修改
        目标: 验证托运人可以“归档”一个被拒绝的修改。
        步骤: 在 4.2 的基础上，shipper1 调用 cancelAmendment。
        断言:
        AmendmentCancelled 事件被触发。
        修改单状态变为 AMENDMENT_CANCELLED。
        Test Case 5.2: Getter 函数功能验证
        目标: 验证 getAmendmentDetailsForBooking 能返回正确的数据。
        步骤:
        为一个订舱创建 2-3 个修改请求。
        调用 getAmendmentDetailsForBooking。
        断言:
        返回的数组长度正确。
        数组中每个 Amendment 结构体的内容都与链上数据一致。
*/
    })



});

