const {task} = require("hardhat/config");

task("mint-ebl").setAction(async(taskArgs, hre) => {
    const{firstAccount} = await getNamedAccounts();
    const signer = await ethers.getSigner(firstAccount);
    const eblDeployments = await deployments.get("EBL_source");
    const ebl_source = await ethers.getContractAt("EBL", eblDeployments.address, signer);
    const tx = await ebl_source.issueBillOfLoading(firstAccount, {
        shipper: "MSC",
        consignee: "CPC",
        portOfloading: "Hamburg",
        portOfDischarge: "Shanghai",
        vesselName: "Royal Tanker",
        cargoDescription: "One million barrels of oil"
    });
    tx.wait(6);
})
module.exports = {}