const {task} = require("hardhat/config");

task("mint-ebl").setAction(async(taskArgs, hre) => {
    const {firstAccount} = await getNamedAccounts();
    const{secondAccount} = await getNamedAccounts();
    const signer1 = await ethers.getSigner(firstAccount);
    const eblDeployments = await deployments.get("EBL_source");
    const ebl_source = await ethers.getContractAt("EBL", eblDeployments.address, signer1);
    const tx = await ebl_source.issueBillOfLoading(secondAccount, {
        shipper: "MSC_2",
        consignee: "CPC_2",
        portOfloading: "Hamburg_2",
        portOfDischarge: "Shanghai_2",
        vesselName: "Royal Tanker_2",
        cargoDescription: "One million barrels of oil_2"
    });
    tx.wait(6);
})
module.exports = {}