const {deployments, getNamedAccounts} = require("hardhat");
/**
 * Deploys the EBL contract using the first named account.
 * Logs the first account and the deployment process.
 */
module.exports = async({deployments, getNamedAccounts}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount;
    console.log(`firstAccount is ${firstAccount}`);
    const{deploy, log} = deployments;
    console.log("Deploying EBL...");
    await deploy("EBL_dest", {
        contract: "EBL",
        from: firstAccount,
        args: [firstAccount],
        log: true,
    });

    log("EBL contract deployed on dest chain successfully")
}

module.exports.tags = ["all", "destChain"]