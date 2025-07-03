const {deployments, getNamedAccounts} = require("hardhat");
/**
 * Deploys the EBL contract using the first named account.
 * Logs the first account and the deployment process.
 */
module.exports = async({deployments, getNamedAccounts}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount;
    console.log(`firstAccount is ${firstAccount}`);
    const{deploy} = deployments;
    console.log("Deploying EBL...");
    await deploy("EBL", {
        from: firstAccount,
        args: [firstAccount],
        log: true,
    });
}

module.exports.tags = ["all", "EBL"]