// deploy/deploy-system.js
const { networkConfig } = require("../helper-hardhat-config.js");

// 接受 hre (Hardhat Runtime Environment) 作为唯一参数。这是最标准、最可靠的做法。
module.exports = async (hre) => {
    // 从 hre 中解构所有需要的对象。这样可以确保我们使用的都是被正确初始化的对象。
    const { getNamedAccounts, deployments, companionNetworks, ethers, network } = hre;
    const { deploy, log } = deployments;

    // --- 准备源链信息 (当前网络) ---
    // 从 hre.getNamedAccounts() 获取账户，并用 hre.ethers.getSigner() 获取签名者。
    const { firstAccount } = await getNamedAccounts();
    const sourceSigner = await ethers.getSigner(firstAccount);
    const sourceDeployer = firstAccount; // Alias for clarity in deployment 'from' field
    const sourceChainId = network.config.chainId;
    const sourceRouter = networkConfig[sourceChainId].router;
    
    // --- 准备目标链信息 ---
    // 使用 hre.companionNetworks 访问伴侣网络。
    // 用你的别名 "destChain" 来获取目标网络的环境。
    const destNetwork = companionNetworks.destChain;
    if (!destNetwork) {
        throw new Error(`Companion network 'destChain' not found for network '${network.name}'. Check hardhat.config.js`);
    }
    // 从目标网络环境中获取它的账户和签名者。
    // destNetwork.ethers can be unreliable. We'll create the signer manually for robustness.
    // First, get the destination network's name from the *source* network's configuration.
    const currentNetworkName = network.name;
    const destNetworkName = hre.config.networks[currentNetworkName].companionNetworks.destChain;
    if (!destNetworkName) {
        throw new Error(`'companionNetworks.destChain' is not defined for network '${currentNetworkName}' in hardhat.config.js`);
    }

    // Now, use that name to get the full configuration for the destination network.
    const destNetworkConfig = hre.config.networks[destNetworkName];
    if (!destNetworkConfig || !destNetworkConfig.url || !destNetworkConfig.accounts || destNetworkConfig.accounts.length === 0) {
        throw new Error(`Config for destination network '${destNetworkName}' is incomplete in hardhat.config.js`);
    }

    // Finally, create the provider and signer.
    const destProvider = new ethers.JsonRpcProvider(destNetworkConfig.url);
    const destPrivateKey = destNetworkConfig.accounts[0]; // Assumes firstAccount (deployer) is at index 0
    const destSigner = new ethers.Wallet(destPrivateKey, destProvider);
    const destDeployer = destSigner.address; // Get the address from the new signer
    const destChainId = await destNetwork.getChainId();
    const destRouter = networkConfig[destChainId].router;

    // ... (打印配置信息的 log) ...

    // --- 1. 在源链部署 ---
    // 使用顶层的 deploy 函数，它与源链绑定。
    const eblSource = await deploy("EBL_source", 
        { contract: "EBL",
        from: sourceDeployer,
        args:[sourceDeployer],
        log: true });
    const eblBridgeSource = await deploy("EBLBridge_source", 
        { contract: "EBLBridge",
        from: sourceDeployer,
        args:[sourceRouter, eblSource.address],
        log: true });
    
    // --- 2. 在目标链部署 ---
    // 使用 destNetwork.deployments.deploy，它与目标链绑定。
    const eblDest = await destNetwork.deployments.deploy("EBL_dest", 
        { contract: "EBL",
        from: destDeployer,
        args:[destDeployer],
        log: true });
    const eblBridgeDest = await destNetwork.deployments.deploy("EBLBridge_dest", 
        { contract: "EBLBridge",
        from: destDeployer,
        args:[destRouter, eblDest.address],
        log: true });

    // --- 3. 执行跨链初始化设置 ---
    log("\n>> Performing cross-chain setup...");

    // a. 获取所有合约实例
    // 对于源链合约，直接使用顶层的 ethers 对象。
    const eblSourceContract = await ethers.getContractAt("EBL", eblSource.address, sourceSigner);
    const eblBridgeSourceContract = await ethers.getContractAt("EBLBridge", eblBridgeSource.address, sourceSigner);
    
    // 对于目标链合约，我们不再使用不稳定的 destNetwork.ethers。
    // 我们使用顶层的 ethers 对象，并传入为目标链手动创建的 destSigner。
    const eblDestContract = await ethers.getContractAt("EBL", eblDest.address, destSigner);
    const eblBridgeDestContract = await ethers.getContractAt("EBLBridge", eblBridgeDest.address, destSigner);

    // b. 在目标链桥上设置白名单
    // ... (调用 eblBridgeDestContract.setWhitelistedSourceChain) ...
    
    // c. 在源链桥上设置白名单
    // ... (调用 eblBridgeSourceContract.setWhitelistedSourceChain) ...

    // d. 在源链 NFT 合约上设置操作员
    // ... (调用 eblSourceContract.setOperator) ...

    // e. 在目标链 NFT 合约上设置操作员
    // ... (调用 eblDestContract.setOperator) ...

    log("\n✅ All contracts deployed and cross-chain setup completed!");
    log("\n>> Performing cross-chain setup...");
    
    const sourceChainSelector = networkConfig[sourceChainId].myChainSelector;
    

    const tx = await eblBridgeDestContract.setWhitelistedSourceChain(sourceChainSelector, eblBridgeSource.address);
    await tx.wait(3);
    const setOperatorDestTx = await eblDestContract.setOperator(eblBridgeDest.address);
    await setOperatorDestTx.wait(3);
    console.log("✅ Dest Operator set successfully!");
    
    

    
    const destChainSelector = networkConfig[destChainId].companionChainSelector;

    const tx2 = await eblBridgeSourceContract.setWhitelistedSourceChain(destChainSelector, eblBridgeDest.address);
    await tx2.wait(3);

    const setOperatorSourceTx = await eblSourceContract.setOperator(eblBridgeSource.address);
    await setOperatorSourceTx.wait(3);
    console.log("✅ Source Operator set successfully!");
    log("Cross-chain setup completed.");
    };

module.exports.tags = ["all", "gemini"];