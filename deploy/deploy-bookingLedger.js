const {deployments, getNamedAccounts} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const firstAccount = (await getNamedAccounts()).firstAccount;
    console.log(`firstAccount is ${firstAccount}`);
    const {deploy} = deployments;
    console.log("Deploying BookingLedger...");
    await deploy("BookingLedger", {
        from: firstAccount,
        args: [],
        log: true,
    });
}
module.exports.tags = ["all", "BookingLedger"]