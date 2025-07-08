const {task} = require("hardhat/config");


task("check-ebl").setAction(async(taskArgs, hre) => {
    const {firstAccount} = await getNamedAccounts();
    const signer = await ethers.getSigner(firstAccount);
    const eblDeployments = await deployments.get("EBL_source");
    const ebl_source = await ethers.getContractAt("EBL", eblDeployments.address, signer);
    const totalSupply = await ebl_source.totalSupply();
    console.log("totalSupply: ", totalSupply);
    for(let tokenId = 1; tokenId <= totalSupply; tokenId++){
        const owner = await ebl_source.ownerOf(tokenId);
        console.log("owner: ", owner);
    }
    /*await ebl_source.issueBillOfLoading(firstAccount, {
        shipper: "MSC",
        consignee: "CPC",
        portOfloading: "Hamburg",
        portOfDischarge: "Shanghai",
        vesselName: "Royal Tanker",
        cargoDescription: "One million barrels of oil"
    });*/
})
module.exports = {}