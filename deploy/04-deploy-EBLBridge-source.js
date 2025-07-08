const {getNamedAccounts, deployments} = require("hardhat");
const {developmentChains} = require("../helper-hardhat-config")
const {networkConfig} = require("../helper-hardhat-config")

let sourceChainRouter;
let linkTokenAddr;
module.exports = async({deployments, getNamedAccounts}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount;
    const {deploy, log} = deployments;
    if(developmentChains.includes(network.name)){
        const ccipSimulatorDeployment = await deployments.get("CCIPLocalSimulator");
        const ccipSimulator = await ethers.getContractAt("CCIPLocalSimulator", ccipSimulatorDeployment.address);
        const ccipCfg = await ccipSimulator.configuration();
    
        sourceChainRouter = ccipCfg.sourceRouter_
        linkTokenAddr = ccipCfg.linkToken_
    }else{
        sourceChainRouter = networkConfig[network.config.chainId].router
        linkTokenAddr = networkConfig[network.config.chainId].linkToken
    }
    const eblDeployment = await deployments.get("EBL_source");
    const eblAdder = eblDeployment.address;

    await deploy("EBLBridge_source",{
        contract: "EBLBridge",
        from: firstAccount,
        args:[sourceChainRouter, linkTokenAddr, eblAdder],
        log: true
    })

    log("EBL bridge contract deployed on source chain successfully")
}

module.exports.tags = ["all", "sourceChain"]