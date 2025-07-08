const {task} = require("hardhat/config");
const {networkConfig} = require("../helper-hardhat-config");
const { AbiCoder } = require("ethers");
task("check-cross").addOptionalParam("chainSelector", "chainselector of destchain")
                    .addOptionalParam("receiver", "receiver of destchain")
                    .addOptionalParam("tokenid", "tokenid for crossing")
                    .setAction(async(taskArgs, hre) => {
    let chainSelector;
    let receiver;
    const tokenId = taskArgs.tokenid;
    const {firstAccount} = await getNamedAccounts();
    if(taskArgs.chainSelector){
        chainSelector = taskArgs.chainSelector;
    }else{
        chainSelector = networkConfig[network.config.chainId].companionChainSelector;
    }
    if(taskArgs.receiver){
        receiver = taskArgs.receiver;
    }else{
        const destDeployment = 
            await hre.companionNetworks["destChain"].deployments.get("EBLBridge_dest");
        receiver = destDeployment.address;
    }
    const coder   = AbiCoder.defaultAbiCoder();   // v6 写法
    const encoded = coder.encode(["address"], [receiver]);  // bytesLike
    




    const linkTokenAddress = networkConfig[network.config.chainId].linkToken;
    const signer = await ethers.getSigner(firstAccount);
    const linkToken = await ethers.getContractAt("LinkToken", linkTokenAddress, signer);
    const sourceChainbridgeDeployment = await deployments.get("EBLBridge_source");
    const sourceChainbridge = await ethers.getContractAt("EBLBridge", sourceChainbridgeDeployment.address, signer);
    const eblsourceDeployment = await deployments.get("EBL_source");
    const ebl_source = await ethers.getContractAt("EBL", eblsourceDeployment.address, signer);
    await ebl_source.approve(sourceChainbridge.target, tokenId);    
    /*try {
        const setOperatorTx = await ebl_source.setOperator(sourceChainbridge.target);
        await setOperatorTx.wait(1);
        console.log("✅ Operator set successfully!");
    } catch (error) {
        console.error("❌ Failed to set operator. Is `firstAccount` the owner of the EBL contract?");
        console.error(error);
        return; // 如果设置失败，后续操作无意义，直接退出
    }*/

    const fees = await sourceChainbridge.estimateFee.staticCall(chainSelector, firstAccount, receiver, tokenId, linkTokenAddress); // 假设你在桥合约里暴露了 getFee
    //console.log(`Calculated fees: ${ethers.formatEther(fees)} LINK`);

    const approvalAmount = fees * BigInt(2); // 授权两倍的费用，以防万一
    console.log(`Approving ${ethers.formatEther(approvalAmount)} LINK to the bridge...`);

    //const tx = await linkToken.transfer(sourceChainbridge.target, ethers.parseEther("5"));
    const tx = await linkToken.approve(sourceChainbridge.target, approvalAmount);
    await tx.wait(3);
    const balance = await linkToken.balanceOf(sourceChainbridge.target);
    console.log("balance: ", balance);







    console.log("approved");
    const owner = await ebl_source.ownerOf(tokenId);
    console.log(`Owner of token ${tokenId} is: ${owner}`);
    console.log(`Caller (firstAccount) is: ${firstAccount}`);
    const tx2 = await sourceChainbridge.crossChainTransfer(chainSelector, firstAccount, receiver, tokenId, "0x0000000000000000000000000000000000000000",{value:ethers.parseEther("0.2")});
    console.log( `tx2 is ${tx2.hash}`);
    await tx2.wait(6);
    console.log("crossed");
})
                        
module.exports = {}
    