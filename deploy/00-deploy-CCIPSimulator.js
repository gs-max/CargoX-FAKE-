
const {network} = require("hardhat")
module.exports = async({getNamedAccounts, deployments}) => {
    if(developmentChains.includes(network.name)){
        const {firstAccount} = await getNamedAccounts()
        const {deploy, log} = deployments
        console.log("Deploying CCIPSimulator...");
        await deploy("CCIPLocalSimulator", {
            from: firstAccount,
            args:[],
            log:true
        });
        log("CCIP simulator contract deployed successfully")
    }
}

module.exports.tags = ["test", "all"]