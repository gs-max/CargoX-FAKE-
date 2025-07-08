// contracts/test/MockLink.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 这是一个简单的 ERC20 代币，用于模拟 LINK
contract MockLink is ERC20 {
    constructor() ERC20("Mock LINK Token", "mLINK") {
        _mint(msg.sender, 1000000 * 10**18); // 给部署者发大量的币
    }
}