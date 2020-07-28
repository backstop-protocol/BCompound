import * as t from "types/index";
import { BProtocolEngine, BProtocol } from "../TestUtils/BProtocolEngine";
import { CompoundUtils } from "TestUtils/CompoundUtils";

const { expectRevert } = require("@openzeppelin/test-helpers");
const BComptroller: t.BComptrollerContract = artifacts.require("BComptroller");

contract("BComptroller", async (accounts) => {
    const engine = new BProtocolEngine();
    const compound = new CompoundUtils();
    let bProtocol: BProtocol;

    before(async () => {
        //await testUtils.deployCompound();
        bProtocol = await engine.deployBProtocol();
    });

    it("should create new BToken for cZRX", async () => {
        const cZRX_addr = compound.getContracts("cZRX");
        const bToken: t.BTokenInstance = await engine.deployNewBToken(cZRX_addr);
        expect(await bToken.cToken()).to.be.equal(cZRX_addr);
        expect(await bToken.isCEther()).to.be.equal(false);
        expect(await bToken.registry()).to.be.equal(bProtocol.registry.address);
    });

    it("should fail when BToken for cZRX already exists", async () => {
        const cZRX_addr = compound.getContracts("cZRX");
        await expectRevert(
            bProtocol.bComptroller.newBToken(cZRX_addr),
            "A BToken with given CToken exists",
        );
    });
});
