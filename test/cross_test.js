const {getNamedAccounts, ethers, deployments} = require("hardhat");
const { assert, expect } = require("chai");

let firstAccount;
let secondAccount;

let ccipSimulator;
let ebl_source;
let ebl_dest;
let eblBridge_source;
let eblBridge_dest;
let signer_1;
let signer_2;

let ChainSelector;
let bridgeSourceAddr;
let bridgeDestAddr;

let mockLinkAddr;
let mockLinkInstance;

beforeEach(async function(){
    
    firstAccount = (await getNamedAccounts()).firstAccount;
    secondAccount = (await getNamedAccounts()).secondAccount;

    console.log("firstAccount: ", firstAccount);

    await deployments.fixture(["all"]);
    signer_1 = await ethers.getSigner(firstAccount);
    signer_2 = await ethers.getSigner(secondAccount);

    const ccipAddr = (await deployments.get("CCIPLocalSimulator")).address;
    ccipSimulator = await ethers.getContractAt("CCIPLocalSimulator", ccipAddr, signer_1);

    const eblSourceAddr = (await deployments.get("EBL_source")).address;
    ebl_source = await ethers.getContractAt("EBL", eblSourceAddr, signer_1);
    const eblDestAddr = (await deployments.get("EBL_dest")).address;
    ebl_dest = await ethers.getContractAt("EBL", eblDestAddr, signer_1);

    bridgeSourceAddr = (await deployments.get("EBLBridge_source")).address;
    eblBridge_source = await ethers.getContractAt("EBLBridge", bridgeSourceAddr, signer_1);
    bridgeDestAddr = (await deployments.get("EBLBridge_dest")).address;
    eblBridge_dest = await ethers.getContractAt("EBLBridge", bridgeDestAddr, signer_1);

    const config = await ccipSimulator.configuration();
    ChainSelector = config.chainSelector_;
    console.log("bridgeSourceAddr:", bridgeSourceAddr);
    console.log("bridgeDestAddr:", bridgeDestAddr);
    console.log("ChainSelector:", ChainSelector);
    await ebl_source.setOperator(bridgeSourceAddr); // 源链：桥可烧毁 NFT
    await ebl_dest.setOperator(bridgeDestAddr); // 目标链：桥可铸造 NFT
    await eblBridge_dest.setWhitelistedSourceChain(ChainSelector, bridgeSourceAddr);
    await eblBridge_source.setWhitelistedSourceChain(ChainSelector, bridgeDestAddr); // 目标桥白名单源桥

    mockLinkAddr = (await deployments.get("MockLink")).address;
    singerLinkInstance = await ethers.getContractAt("MockLink", mockLinkAddr, signer_1);
    singerLinkInstance.transfer(signer_2.address, ethers.parseEther("10"));

})


describe("source chain 2 dest chain", async function(){
    it("a ebl has been minted", async function(){
        await ebl_source.setOperator(signer_2.address);
        await ebl_source.issueBillOfLoading(signer_2.address, {
            shipper: "MSC",
            consignee: "CPC",
            portOfloading: "Hamburg",
            portOfDischarge: "Shanghai",
            vesselName: "Royal Tanker",
            cargoDescription: "One million barrels of oil"
        });
        const owner = await ebl_source.ownerOf(1);
        assert.equal(owner, secondAccount);
    })

    it("burn on source and mint on dest by link", async function(){
        await ebl_source.issueBillOfLoading(signer_2.address, {
            shipper: "MSC",
            consignee: "CPC",
            portOfloading: "Hamburg",
            portOfDischarge: "Shanghai",
            vesselName: "Royal Tanker",
            cargoDescription: "One million barrels of oil"
        });
        const fees = ethers.parseEther("1");
        const mockLinkToken = await ethers.getContractAt("MockLink", mockLinkAddr, signer_2)
        await mockLinkToken.approve(bridgeSourceAddr, fees);
        await ebl_source.connect(signer_2).approve(bridgeSourceAddr, 1);
        await eblBridge_source.connect(signer_2).crossChainTransfer(ChainSelector, signer_2.address, bridgeDestAddr, 1, mockLinkAddr);
        const owner = await ebl_dest.ownerOf(1);
        assert.equal(owner, secondAccount);
    })

    it("burn on source and mint on dest by native token", async function(){
        await ebl_source.issueBillOfLoading(signer_2.address, {
            shipper: "MSC",
            consignee: "CPC",
            portOfloading: "Hamburg",
            portOfDischarge: "Shanghai",
            vesselName: "Royal Tanker",
            cargoDescription: "One million barrels of oil"
        });
        const fees = ethers.parseEther("1");
        await ebl_source.connect(signer_2).approve(bridgeSourceAddr, 1);
        await eblBridge_source.connect(signer_2).crossChainTransfer(ChainSelector, signer_2.address, bridgeDestAddr, 1, "0x0000000000000000000000000000000000000000", {value: fees});
        const owner = await ebl_dest.ownerOf(1);
        assert.equal(owner, secondAccount);
    })
})