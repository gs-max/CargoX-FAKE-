const { task } = require("hardhat/config");

task("check-ebl", "Checks the state of the EBL contract on the destination chain (Amoy)")
.setAction(async (taskArgs, hre) => {
    const { deployments, ethers, config } = hre;

    // --- 1. Define Target Network and Get Signer ---
    const targetNetwork = "amoy";
    console.log(`>> Checking EBL contract on network: ${targetNetwork}`);

    const destNetworkConfig = config.networks[targetNetwork];
    if (!destNetworkConfig) {
        throw new Error(`Network configuration for '${targetNetwork}' not found.`);
    }
    const provider = new ethers.JsonRpcProvider(destNetworkConfig.url);
    const privateKey = destNetworkConfig.accounts[0];
    const signer = new ethers.Wallet(privateKey, provider);

    // --- 2. Get Contract Instance ---
    let eblDeployment;
    try {
        // We must specify the network for deployments.get to find the correct file.
        eblDeployment = await deployments.get("EBL_dest");
    } catch (error) {
        console.error(`\n❌ Could not find 'EBL_dest' deployment on network '${hre.network.name}'.`);
        console.error("Please ensure you have run the deployment script and are checking on the correct network.");
        return;
    }
    
    const eblContract = await ethers.getContractAt("EBL", eblDeployment.address, signer);
    console.log(`   Contract Address: ${eblContract.target}`);

    // --- 3. Check Total Supply and Ownership using tokenByIndex ---
    const totalSupply = await eblContract.totalSupply();
    console.log(`   Total Supply: ${totalSupply.toString()}`);

    if (totalSupply == 0) {
        console.log("\n✅ No EBL tokens exist on this chain yet.");
        return;
    }

    console.log("\n--- Token Ownership ---");
    for (let i = 0; i < totalSupply; i++) {
        try {
            const tokenId = await eblContract.tokenByIndex(i);
            const owner = await eblContract.ownerOf(tokenId);
            console.log(`   - Token ID ${tokenId.toString()} is owned by: ${owner}`);
        } catch (e) {
            console.log(`   - Could not query owner for token at index ${i}. It may have been burned or the contract may not support enumeration correctly.`);
        }
    }
    console.log("\n✅ Check complete.");
});
module.exports = {}