const {ethers} = require("hardhat");
const{networkConfig} = require("../helper-hardhat-config.js")

module.exports = async (hre) => {
    const { deployments, getNamedAccounts, network, companionNetworks, ethers } = hre;
    const { firstAccount } = await getNamedAccounts();
    const signer = await ethers.getSigner(firstAccount); // This is the SOURCE signer

    const { deploy, log } = deployments;
    const sourceChainId = network.config.chainId;
    const destChainId = await companionNetworks.destChain.getChainId();



    //log(`\n>> Deploying contracts on Source Chain: ${network.name}...`);
    const sourceRouter = networkConfig[sourceChainId].router;


    const eblSource = await deploy("EBL_source", {
        contract: "EBL",
        from: firstAccount,
        args: [firstAccount],
        log: true,
    });

    const eblBridgeSource = await deploy("EBLBridge_source", {
        contract: "EBLBridge",
        from: firstAccount,
        args: [sourceRouter, eblSource.address],
        log: true,
    });
    log("Source chain contracts deployed.");

    log(`\n>> Deploying contracts on Destination Chain via companion network...`);
    const destRouter = networkConfig[destChainId].router;


    const eblDest = await companionNetworks.destChain.deployments.deploy("EBL_dest", {
        contract: "EBL",
        from: firstAccount,
        args: [firstAccount],
        log: true,
    });
    
    const eblBridgeDest = await companionNetworks.destChain.deployments.deploy("EBLBridge_dest", {
        contract: "EBLBridge",
        from: firstAccount,
        args: [destRouter, eblDest.address],
        log: true,
    });
    log("Destination chain contracts deployed.");

    // --- Create a dedicated signer for the destination chain ---
    log("\n>> Creating a signer for the destination network...");
    const destNetworkName = network.config.companionNetworks.destChain;
    const destNetworkConfig = hre.config.networks[destNetworkName];
    const destProvider = new ethers.JsonRpcProvider(destNetworkConfig.url);
    const destPrivateKey = destNetworkConfig.accounts[0]; // Assumes firstAccount is at index 0
    const destSigner = new ethers.Wallet(destPrivateKey, destProvider);
    log(`Destination signer address: ${destSigner.address}`);

    log("\n>> Performing cross-chain setup...");
    // Get destination contract instances using the DESTINATION signer
    const eblBridgeDestContract = await ethers.getContractAt("EBLBridge", eblBridgeDest.address, destSigner);
    const sourceChainSelector = networkConfig[sourceChainId].myChainSelector;
    const eblDestContract = await ethers.getContractAt("EBL", eblDest.address, destSigner);

    const tx = await eblBridgeDestContract.setWhitelistedSourceChain(sourceChainSelector, eblBridgeSource.address);
    await tx.wait(3);
    const setOperatorDestTx = await eblDestContract.setOperator(eblBridgeDest.address);
    await setOperatorDestTx.wait(3);
    console.log("✅ Dest Operator set successfully!");
    
    

    const eblBridgeSourceContract = await ethers.getContractAt("EBLBridge", eblBridgeSource.address, signer);
    const destChainSelector = networkConfig[destChainId].companionChainSelector;
    const eblSourceContract = await ethers.getContractAt("EBL", eblSource.address, signer);
    const tx2 = await eblBridgeSourceContract.setWhitelistedSourceChain(destChainSelector, eblBridgeDest.address);
    await tx2.wait(3);

    const setOperatorSourceTx = await eblSourceContract.setOperator(eblBridgeSource.address);
    await setOperatorSourceTx.wait(3);
    console.log("✅ Source Operator set successfully!");
    log("Cross-chain setup completed.");
}
module.exports.tags = ["all", "system"]