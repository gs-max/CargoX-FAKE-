pragma solidity ^0.8.27;

// 引入 EBL 合约，以便 Bridge 可以调用它
import {EBL, BillOfLadingData} from "./EBL.sol"; 
import "hardhat/console.sol";
// 引入 OpenZeppelin 的 Ownable
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// 引入 Chainlink CCIP 的核心组件
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {OwnerIsCreator} from "@chainlink/contracts/src/v0.8/shared/access/OwnerIsCreator.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract EBLBridge is CCIPReceiver, Ownable {
    EBL private immutable i_eblToken;
    LinkTokenInterface private immutable i_linkToken;

    mapping(uint64 => address) public s_whitelistedSourceChains;

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
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);

    

    // 构造函数
    constructor(address _router, address _eblToken) 
        CCIPReceiver(_router) 
        Ownable(msg.sender) // 将部署者设为 Owner
    {
        // 我们将在这里初始化状态变量
        i_eblToken = EBL(_eblToken);
        //i_linkToken = LinkTokenInterface(_link);
    }

    function setWhitelistedSourceChain(uint64 _sourceChainSelector, address _sourceAddress) public onlyOwner {
        s_whitelistedSourceChains[_sourceChainSelector] = _sourceAddress;
    }

    function crossChainTransfer(uint64 _destinationChainSelector, address newOwner, address _receiver, uint256 _tokenId, address _feeToken) public payable returns(bytes32 messageId){
        require(i_eblToken.ownerOf(_tokenId) == msg.sender, "Caller is not the owner of the ebl");
        i_eblToken.transferFrom(msg.sender, address(this), _tokenId);
        BillOfLadingData memory data = i_eblToken.getBillOfLoadingData(_tokenId);
        i_eblToken.burnFrom(_tokenId);
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver:abi.encode(_receiver),
            data:abi.encode(newOwner,data,_tokenId),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs:Client._argsToBytes(
                Client.GenericExtraArgsV2({
                    gasLimit:500_000,
                    allowOutOfOrderExecution:true
                })
            ),
            feeToken:_feeToken
        });
        IRouterClient router = IRouterClient(this.getRouter());
        uint256 fees = router.getFee(_destinationChainSelector, evm2AnyMessage);
        console.log("Calculated fees:", fees);

        if (_feeToken == address(0)){
            if(msg.value < fees){
                revert NotEnoughBalance(msg.value, fees);
            }
            messageId = router.ccipSend{value: fees}(_destinationChainSelector, evm2AnyMessage);
        }else{

            LinkTokenInterface feeTokenContract = LinkTokenInterface(_feeToken);
            uint256 allowance = feeTokenContract.allowance(msg.sender, address(this));
            require(allowance >= fees, "Insufficient LINK allowance for the bridge");
            feeTokenContract.transferFrom(msg.sender, address(this), fees);
            feeTokenContract.approve(address(router), fees);
            messageId = router.ccipSend(_destinationChainSelector, evm2AnyMessage);
        }

        
        emit BillOfLadingTransferred(
            messageId,
            _tokenId,
            _destinationChainSelector,
            _receiver
        );
        return messageId;
    }
    
    // 这是 CCIP 必须的接收函数，暂时留空
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        address sourceChainContract = s_whitelistedSourceChains[message.sourceChainSelector];
        //首先要在白名单里面
        require(sourceChainContract != address(0), "Source chain contract not allowlisted");
        //然后是消息的发送者必须是白名单里面的合约
        require(abi.decode(message.sender, (address)) == sourceChainContract, "Sender not allowlisted");
        (address newOwner, BillOfLadingData memory data, uint256 tokenId) = abi.decode(message.data, (address, BillOfLadingData, uint256));
        i_eblToken.remint(newOwner, tokenId, data);
        emit BillOfLadingReceived(
            message.messageId,
            tokenId,
            message.sourceChainSelector,
            newOwner
        );
    }

    function  estimateFee(uint64 _destinationChainSelector, address newOwner, address _receiver, uint256 _tokenId, address _feeToken) public view returns(uint256){
        BillOfLadingData memory data = i_eblToken.getBillOfLoadingData(_tokenId);
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver:abi.encode(_receiver),
            data:abi.encode(newOwner,data,_tokenId),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs:Client._argsToBytes(
                Client.GenericExtraArgsV2({
                    gasLimit:200_000,
                    allowOutOfOrderExecution:true
                })
            ),
            feeToken:_feeToken
        });
        IRouterClient router = IRouterClient(this.getRouter());
        uint256 fees = router.getFee(_destinationChainSelector, evm2AnyMessage);
        return fees;
    }
}