pragma solidity ^0.8.27;

// 引入 EBL 合约，以便 Bridge 可以调用它
import {EBL, BillOfLadingData} from "./EBL.sol"; 

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

    // 我们将在这里添加状态变量和函数

    // 构造函数
    constructor(address _router, address _link, address _eblToken) 
        CCIPReceiver(_router) 
        Ownable(msg.sender) // 将部署者设为 Owner
    {
        i_eblToken = EBL(_eblToken);
        i_linkToken = LinkTokenInterface(_link);
        
        // 我们将在这里初始化状态变量
    }

    function setWhitelistedSourceChain(uint64 _sourceChainSelector, address _sourceAddress) public onlyOwner {
        s_whitelistedSourceChains[_sourceChainSelector] = _sourceAddress;
    }

    function crossChainTransfer(uint64 _destinationChainSelector, address _receiver, uint256 _tokenId, address _feeToken) public payable returns(bytes32 messageId){
        BillOfLadingData memory data = i_eblToken.getBillOfLoadingData(_tokenId);
        i_eblToken.burnFrom(_tokenId);
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver:abi.encode(this.getRouter()),
            data:abi.encode(_receiver, data),
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

        

        if (_feeToken == address(0)){
            if(msg.value < fees){
                revert NotEnoughBalance(msg.value, fees);
            }
            messageId = router.ccipSend{value: fees}(_destinationChainSelector, evm2AnyMessage);
        }else{
            LinkTokenInterface feeTokenContract = LinkTokenInterface(_feeToken);
            if (fees > feeTokenContract.balanceOf(address(this))){
            revert NotEnoughBalance(feeTokenContract.balanceOf(address(this)), fees);
            }
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
        require(sourceChainContract != address(0), "Source chain contract not allowlisted");
        require(abi.decode(message.sender, (address)) == sourceChainContract, "Sender not allowlisted");
       (address receiver,BillOfLadingData memory data ) = abi.decode(message.data, (address, BillOfLadingData));
        
        i_eblToken.issueBillOfLoading(receiver, data);
        emit BillOfLadingReceived(
            message.messageId,
            0,
            message.sourceChainSelector,
            abi.decode(message.sender, (address))
        );
    }


}