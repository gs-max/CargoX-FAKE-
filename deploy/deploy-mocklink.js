// deploy/00-deploy-mocks.js
const {developmentChains} = require("../helper-hardhat-config")
const {network} = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments, network }) => {
    if(developmentChains.includes(network.name)){
        const { deploy, log } = deployments;
        const firstAccount = (await getNamedAccounts()).firstAccount;
        const chainId = network.config.chainId;
    
        // 只在本地开发链上部署 Mocks
        if (chainId == 31337) {
            log("Local network detected! Deploying mocks...");
            await deploy("MockLink", { // 部署名就是 "MockLink"
                contract: "MockLink",
                from: firstAccount,
                log: true,
                args: [],
            });
            log("Mocks Deployed!");
            log("----------------------------------------------------");
        }
    }
};
module.exports.tags = ["all", "mocks"];