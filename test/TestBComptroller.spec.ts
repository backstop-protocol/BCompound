import * as b from "../types/index";

import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import { expect } from "chai";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const BEther: b.BEtherContract = artifacts.require("BEther");

contract("BComptroller", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);
  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();
    bComptroller = bProtocol.bComptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("BComptroller: constructor", async () => {
    it("should have addresses set", async () => {
      expect(await bComptroller.comptroller()).to.be.not.equal(ZERO_ADDRESS);
      expect(await bComptroller.comptroller()).to.be.equal(comptroller.address);
    });

    it("should not have registry set at construction", async () => {
      const _comptroller = a.dummy1;
      const _bComptroller = await BComptroller.new(_comptroller);

      expect(await _bComptroller.comptroller()).to.be.equal(_comptroller);
      expect(await _bComptroller.registry()).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe("BComptroller.setRegistry()", async () => {
    it("should set registry address", async () => {
      const _registry = a.dummy1;
      const _bComptroller = await BComptroller.new(a.other);
      expect(await _bComptroller.registry()).to.be.equal(ZERO_ADDRESS);

      await _bComptroller.setRegistry(_registry);
      expect(await _bComptroller.registry()).to.be.equal(_registry);
    });

    it("should fail once registry address already set", async () => {
      const _registry = a.dummy1;
      const _bComptroller = await BComptroller.new(a.other);
      await _bComptroller.setRegistry(_registry);

      expect(await _bComptroller.registry()).to.be.equal(_registry);
      await expectRevert(_bComptroller.setRegistry(a.dummy2), "BComptroller: registry-already-set");
      expect(await _bComptroller.registry()).to.be.equal(_registry);
    });
  });

  describe("BComptroller.newBToken()", async () => {
    describe("BErc20:", async () => {
      it("should create new BErc20 for cZRX", async () => {
        const cZRX_addr = compoundUtil.getContracts("cZRX");
        const ZRX_addr = compoundUtil.getTokens("ZRX");

        const bZRX_addr = await bComptroller.newBToken.call(cZRX_addr);
        const tx = await bComptroller.newBToken(cZRX_addr);
        expectEvent(tx, "NewBToken", { cToken: cZRX_addr, bToken: bZRX_addr });

        const bZRX: b.BErc20Instance = await BErc20.at(bZRX_addr);

        expect(await bZRX.cToken()).to.be.equal(cZRX_addr);
        expect(await bZRX.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bZRX.underlying()).to.be.equal(ZRX_addr);

        expect(await bComptroller.c2b(cZRX_addr)).to.be.equal(bZRX_addr);
        expect(await bComptroller.b2c(bZRX_addr)).to.be.equal(cZRX_addr);
      });

      it("should fail when BErc20 for cZRX already exists", async () => {
        const cZRX_addr = compoundUtil.getContracts("cZRX");
        const bZRX = await engine.deployNewBErc20("cZRX");
        const bZRX_addr = bZRX.address;
        expect(await bComptroller.c2b(cZRX_addr)).to.be.equal(bZRX_addr);
        expect(await bComptroller.b2c(bZRX_addr)).to.be.equal(cZRX_addr);

        await expectRevert(
          bProtocol.bComptroller.newBToken(cZRX_addr),
          "BComptroller: BToken-already-exists",
        );

        expect(await bComptroller.c2b(cZRX_addr)).to.be.equal(bZRX_addr);
        expect(await bComptroller.b2c(bZRX_addr)).to.be.equal(cZRX_addr);
      });

      it("should fail when cToken is not listed on Compound", async () => {
        expect(await bComptroller.c2b(a.dummy1)).to.be.equal(ZERO_ADDRESS);

        await expectRevert(
          bComptroller.newBToken(a.dummy1),
          "BComptroller: cToken-not-listed-on-compound",
        );

        expect(await bComptroller.c2b(a.dummy1)).to.be.equal(ZERO_ADDRESS);
      });

      it("should deploy BErc20 for multiple cToken", async () => {
        const cZRX_addr = compoundUtil.getContracts("cZRX");
        const bZRX_addr = await bComptroller.newBToken.call(cZRX_addr);
        const bZRX = await engine.deployNewBErc20("cZRX");
        expect(await bComptroller.c2b(cZRX_addr)).to.be.equal(bZRX_addr);
        expect(await bComptroller.b2c(bZRX_addr)).to.be.equal(cZRX_addr);
        expect(await bZRX.cToken()).to.be.equal(cZRX_addr);

        const cBAT_addr = compoundUtil.getContracts("cBAT");
        const bBAT_addr = await bComptroller.newBToken.call(cBAT_addr);
        const bBAT = await engine.deployNewBErc20("cBAT");
        expect(await bComptroller.c2b(cBAT_addr)).to.be.equal(bBAT_addr);
        expect(await bComptroller.b2c(bBAT_addr)).to.be.equal(cBAT_addr);
        expect(await bBAT.cToken()).to.be.equal(cBAT_addr);
      });
    });

    describe("BEther:", async () => {
      it("should deploy BEther", async () => {
        const cETH_addr = compoundUtil.getContracts("cETH");
        expect(await bComptroller.c2b(cETH_addr)).to.be.equal(ZERO_ADDRESS);

        const bETH_addr = await bComptroller.newBToken.call(cETH_addr);
        const tx = await bComptroller.newBToken(cETH_addr);
        expectEvent(tx, "NewBToken", { cToken: cETH_addr, bToken: bETH_addr });
        const bETH = await BEther.at(bETH_addr);

        expect(await bETH.cToken()).to.be.equal(cETH_addr);
        expect(await bETH.registry()).to.be.equal(bProtocol.registry.address);

        expect(await bComptroller.c2b(cETH_addr)).to.be.equal(bETH_addr);
        expect(await bComptroller.b2c(bETH_addr)).to.be.equal(cETH_addr);
      });

      it("should not have underlying storage", async () => {
        const cETH_addr = compoundUtil.getContracts("cETH");
        const bETH_BEther = await engine.deployNewBEther("cETH");
        expect(await bETH_BEther.cToken()).to.be.equal(cETH_addr);
        expect(await bETH_BEther.registry()).to.be.equal(bProtocol.registry.address);

        // convert to BErc20 TypeScript object
        const bETH_BErc20 = await BErc20.at(bETH_BEther.address);
        await expectRevert.unspecified(bETH_BErc20.underlying());
      });

      it("should fail when BEther already deployed", async () => {
        const cETH_addr = compoundUtil.getContracts("cETH");
        const bETH_addr = await bComptroller.newBToken.call(cETH_addr);
        const bETH = await engine.deployNewBEther("cETH");

        expect(await bComptroller.c2b(cETH_addr)).to.be.equal(bETH_addr);
        expect(await bComptroller.b2c(bETH_addr)).to.be.equal(cETH_addr);

        await expectRevert(
          bComptroller.newBToken(cETH_addr),
          "BComptroller: BToken-already-exists",
        );

        expect(await bComptroller.c2b(cETH_addr)).to.be.equal(bETH_addr);
        expect(await bComptroller.b2c(bETH_addr)).to.be.equal(cETH_addr);
      });
    });
  });

  describe("BComptroller.isBToken()", async () => {
    it("should return true when BErc20 token supported", async () => {
      const bBAT = await engine.deployNewBErc20("cBAT");
      expect(await bComptroller.isBToken(bBAT.address)).to.be.equal(true);
    });

    it("should return true when BEther token supported", async () => {
      const bETH = await engine.deployNewBEther("cETH");
      expect(await bComptroller.isBToken(bETH.address)).to.be.equal(true);
    });

    it("should return false when BToken not supported", async () => {
      expect(await bComptroller.isBToken(a.dummy1)).to.be.equal(false);
    });
  });

  describe("BComptroller.enterMarket()", async () => {
    // TODO log MarketEntered on compound
    it("user (not have avatar) can enter an existing market on compound");

    it("user (already has an avatar) can enter an existing market on compound");

    it("user can enter a market again");

    it("should fail when BToken not exists for given market");

    it("should fail when a market is not listed on compound");
  });

  describe("BComptroller.enterMarkets()", async () => {
    // TODO log MarketEntered on compound
    it("user (not have avatar) can enter into multiple markets on compound");

    it("user (already has an avatar) can enter into multiple markets on compound");

    it("user can enter into multiple market again");

    it("should fail when BToken not exists for a given market");

    it("should fail when a market is not listed on compound");
  });

  describe("BComptroller.exitMarket()", async () => {
    it("user (not have avatar) can exit from a market he is in");

    it("user (already has an avatar) can exit from a market he is in");
  });

  describe("BComptroller.getAccountLiquidity()", async () => {
    it("should get account liquidity of a user");

    it("should get account shortFall of a user");

    it("should get zero when user does not have any liquidity");
  });

  describe("BComptroller.claimComp()", async () => {
    it("user claims his COMP tokens from Compound");

    it("user gets nothing, when not earned COMP tokens on Compound");
  });

  describe("BComptroller.claimComp(cTokens[])", async () => {
    it("user claims his COMP tokens from Compound");

    it("user gets COMP tokens he earned on different markets");

    it("user gets nothing, when not earned COMP tokens on Compound");
  });

  describe("BComptroller.oracle()", async () => {
    it("should get compound oracle", async () => {
      expect(await bComptroller.oracle()).to.be.equal(await comptroller.oracle());
    });
  });

  describe("Contract public storage:", async () => {
    describe("BComptroller.comptroller()", async () => {
      it("");
    });

    describe("BComptroller.registry()", async () => {
      it("");
    });

    describe("BComptroller.c2b()", async () => {
      it("should return cToken for existing bToken", async () => {
        const cZRX_addr = compoundUtil.getContracts("cZRX");
        const bZRX = await engine.deployNewBErc20("cZRX");

        expect(await bComptroller.c2b(cZRX_addr)).to.be.equal(bZRX.address);
      });

      it("should return 0x0 for non existing cToken", async () => {
        expect(await bComptroller.c2b(a.dummy1)).to.be.equal(ZERO_ADDRESS);
      });
    });

    describe("BComptroller.b2c()", async () => {
      it("should return bToken for existing cToken", async () => {
        const cZRX_addr = compoundUtil.getContracts("cZRX");
        const bZRX = await engine.deployNewBErc20("cZRX");

        expect(await bComptroller.b2c(bZRX.address)).to.be.equal(cZRX_addr);
      });

      it("should return 0x0 cToken for non existing bToken", async () => {
        expect(await bComptroller.b2c(a.dummy1)).to.be.equal(ZERO_ADDRESS);
      });
    });
  });

  describe("BComptroller: Integration tests:", async () => {
    it("user enterMaker and exitMaket");

    it("TODO: what should happen when token all max approval is used?");
  });
});
