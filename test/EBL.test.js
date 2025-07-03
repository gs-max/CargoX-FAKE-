const { ethers, deployments } = require("hardhat");
const { assert, expect } = require("chai");

describe("EBL", function () {
    let owner, ebl;

    beforeEach(async function () {
        await deployments.fixture(["all"]);
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        const eblDeployment = await deployments.get("EBL");
        ebl = await ethers.getContractAt("EBL", eblDeployment.address);
        
    });

    it("only owner can mint nft", async function(){
        const tx = await ebl.issueBillOfLoading(owner.address, {
            shipper: "shipper",
            consignee: "consignee",
            portOfloading: "portOfloading",
            portOfDischarge: "portOfDischarge",
            vesselName: "vesselName",
            cargoDescription: "cargoDescription"
        });
        /*await expect(tx)
        .to.emit("ebl", "BillOfLoadingIssued").withArgs(
            1,
            owner.address,
            {
                shipper: "shipper",
                consignee: "consignee",
                portOfloading: "portOfloading",
                portOfDischarge: "portOfDischarge",
                vesselName: "vesselName",
                cargoDescription: "cargoDescription"
            }
        )*/
       assert.equal(await ebl.totalSupply(), 1);
       expect(await ebl.ownerOf(1)).to.equal(owner.address);

    });
})