import * as b from "../types/index";

import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";

const { expectRevert } = require("@openzeppelin/test-helpers");

const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");

contract("BComptroller", async (accounts) => {
  const engine = new BProtocolEngine(accounts);
  const compound = new CompoundUtils();
  let bProtocol: BProtocol;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();
  });

  it("should create new BToken for cZRX", async () => {
    const cZRX_addr = compound.getContracts("cZRX");
    const bToken: b.BErc20Instance = await engine.deployNewBErc20("cZRX");
    expect(await bToken.cToken()).to.be.equal(cZRX_addr);
    expect(await bToken.registry()).to.be.equal(bProtocol.registry.address);
    // TODO validate entries in c2b and b2c
  });

  it("should fail when BToken for cZRX already exists", async () => {
    const cZRX_addr = compound.getContracts("cZRX");
    await expectRevert(
      bProtocol.bComptroller.newBToken(cZRX_addr),
      "BComptroller: BToken-already-exists",
    );
    // TODO validate entries in c2b and b2c
  });

  it("should fail when try to ser registry again");

  it("should return bToken for existing cToken");

  it("should return cToken for existing bToken");

  it("should return 0x0 bToken for non existing cToken");

  it("should return 0x0 cToken for non existing bToken");
});
