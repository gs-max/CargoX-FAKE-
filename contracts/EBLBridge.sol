// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// 引入 EBL 合约，以便 Bridge 可以调用它
import {EBL} from "./EBL.sol"; 

// 引入 OpenZeppelin 的 Ownable
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// 引入 Chainlink CCIP 的核心组件
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/CCIPReceiver.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

contract EBLBridge is CCIPReceiver, Ownable {
    EBL private immutable i_eblToken;
    LinkTokenInterface private immutable i_linkToken;
    mapping(uint64 => address) public s_whiteListedSourceChains;
    event BillOfLadingTransferred(
        bytes32 indexed messageId,
        uint256 indexed tokenId,
        uint64 destinationChainSelector,
        address receiver
    );

    event BillOfLadingReceived(
        bytes32 indexed messageId,
        uint256 indexed tokenId,
        uint64 sourceChainSelector,
        address sender
    );
    // 我们将在这里添加状态变量和函数

    // 构造函数
    constructor(address _router, address _link, address _eblToken) 
        CCIPReceiver(_router) 
        Ownable(msg.sender) // 将部署者设为 Owner
    {
        i_eblToken = EBL(_eblToken);
        i_linkToken = LinkTokenInterface(_link);
    }

    // 这是 CCIP 必须的接收函数，暂时留空
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        // 接收逻辑将在后续步骤中实现
    }

    function setWhiteListedSourceChain(uint64 _chainSelector, address _sourceChain) public onlyOwner{
        s_whiteListedSourceChains[_chainSelector] = _sourceChain;
    }

    
}   