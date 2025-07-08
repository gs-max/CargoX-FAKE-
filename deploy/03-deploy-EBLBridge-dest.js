const {getNamedAccounts, deployments} = require("hardhat");
const {developmentChains} = require("../helper-hardhat-config")
const {networkConfig} = require("../helper-hardhat-config")

let destChainRouter;
let linkTokenAddr;

module.exports = async({deployments, getNamedAccounts}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount;
    const {deploy, log} = deployments;
    if(developmentChains.includes(network.name)){
        const ccipSimulatorDeployment = await deployments.get("CCIPLocalSimulator");
        const ccipSimulator = await ethers.getContractAt("CCIPLocalSimulator", ccipSimulatorDeployment.address);
        const ccipCfg = await ccipSimulator.configuration();
        //部署mock合约就是为了拿到配置信息
        destChainRouter = ccipCfg.destinationRouter_
        linkTokenAddr = ccipCfg.linkToken_
    }else{
        destChainRouter = networkConfig[network.config.chainId].router
        linkTokenAddr = networkConfig[network.config.chainId].linkToken
    }
    const eblDeployment = await deployments.get("EBL_dest");
    const eblAdder = eblDeployment.address;

    await deploy("EBLBridge_dest",{
        contract: "EBLBridge",
        from: firstAccount,
        args:[destChainRouter, linkTokenAddr, eblAdder],
        log: true
    })

    log("EBL bridge contract deployed on dest chain successfully")
}

module.exports.tags = ["all", "destChain"]