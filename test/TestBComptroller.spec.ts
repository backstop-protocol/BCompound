import * as b from "../types/index";

import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import BN from "bn.js";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const BEther: b.BEtherContract = artifacts.require("BEther");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

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
  });

  describe("BComptroller.setRegistry()", async () => {
    it("should set registry address", async () => {
      const _registry = a.dummy1;
      const _bComptroller = await BComptroller.new(a.other);
      expect(await _bComptroller.registry()).to.be.equal(ZERO_ADDRESS);

      await _bComptroller.setRegistry(_registry);
      expect(await _bComptroller.registry()).to.be.equal(_registry);
    });

    it("should fail when registry address already set", async () => {
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

      it("should not have 'underlying' contract public variable", async () => {
        const cETH_addr = compoundUtil.getContracts("cETH");
        const bETH_BEther = await engine.deployNewBEther();
        expect(await bETH_BEther.cToken()).to.be.equal(cETH_addr);
        expect(await bETH_BEther.registry()).to.be.equal(bProtocol.registry.address);

        // convert to BErc20 TypeScript object
        const bETH_BErc20 = await BErc20.at(bETH_BEther.address);
        await expectRevert.unspecified(bETH_BErc20.underlying());
      });

      it("should fail when BEther already deployed", async () => {
        const cETH_addr = compoundUtil.getContracts("cETH");
        const bETH_addr = await bComptroller.newBToken.call(cETH_addr);
        const bETH = await engine.deployNewBEther();

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
      const bETH = await engine.deployNewBEther();
      expect(await bComptroller.isBToken(bETH.address)).to.be.equal(true);
    });

    it("should return false when BToken not supported", async () => {
      expect(await bComptroller.isBToken(a.dummy1)).to.be.equal(false);
    });
  });

  describe("BComptroller.enterMarket()", async () => {
    let cZRX_addr: string;
    let bZRX_addr: string;

    let cETH_addr: string;
    let bETH_addr: string;

    beforeEach(async () => {
      cZRX_addr = compoundUtil.getContracts("cZRX");
      cETH_addr = compoundUtil.getContracts("cETH");

      await bComptroller.newBToken(cZRX_addr);
      await bComptroller.newBToken(cETH_addr);

      bZRX_addr = await bComptroller.c2b(cZRX_addr);
      bETH_addr = await bComptroller.c2b(cETH_addr);
    });

    it("user (doesn't have an avatar) can enter an existing CErc20 market on compound", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(ZERO_ADDRESS);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);

      const err = await bComptroller.enterMarket.call(bZRX_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bZRX_addr, { from: a.user1 });

      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
    });

    it("user (doesn't have an avatar) can enter an existing CEther market on compound", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(ZERO_ADDRESS);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      const err = await bComptroller.enterMarket.call(bETH_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bETH_addr, { from: a.user1 });

      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("user (have an avatar) can enter an existing CErc20 market on compound", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

      await bProtocol.registry.newAvatar({ from: a.user1 });
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);

      const err = await bComptroller.enterMarket.call(bZRX_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bZRX_addr, { from: a.user1 });

      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
    });

    it("user (have an avatar) can enter an existing CEther market on compound", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

      await bProtocol.registry.newAvatar({ from: a.user1 });
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      const err = await bComptroller.enterMarket.call(bETH_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bETH_addr, { from: a.user1 });

      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("user can enter a CErc20 market again", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      await bProtocol.registry.newAvatar({ from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);

      let err = await bComptroller.enterMarket.call(bZRX_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bZRX_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);

      err = await bComptroller.enterMarket.call(bZRX_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bZRX_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
    });

    it("user can enter a CEther market again", async () => {
      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      await bProtocol.registry.newAvatar({ from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      const err = await bComptroller.enterMarket.call(bETH_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.enterMarket(bETH_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);

      await bComptroller.enterMarket(bETH_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("should fail when BErc20 not exists for given market", async () => {
      const cBAT_addr = compoundUtil.getContracts("cBAT");
      await expectRevert(
        bComptroller.enterMarket(cBAT_addr, { from: a.user1 }),
        "BComptroller: CToken-not-exist-for-bToken",
      );
    });
  });

  describe("BComptroller.enterMarkets()", async () => {
    let cZRX_addr: string;
    let bZRX_addr: string;

    let cETH_addr: string;
    let bETH_addr: string;

    beforeEach(async () => {
      cZRX_addr = compoundUtil.getContracts("cZRX");
      cETH_addr = compoundUtil.getContracts("cETH");

      await bComptroller.newBToken(cZRX_addr);
      await bComptroller.newBToken(cETH_addr);

      bZRX_addr = await bComptroller.c2b(cZRX_addr);
      bETH_addr = await bComptroller.c2b(cETH_addr);
    });

    it("user (doesn't have an avatar) can enter multiple existing markets on compound", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");
      const cETH_addr = compoundUtil.getContracts("cETH");

      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(ZERO_ADDRESS);

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      const errArr = await bComptroller.enterMarkets.call([bZRX_addr, bETH_addr], {
        from: a.user1,
      });
      await Promise.all(errArr.map((e) => expect(e).to.be.bignumber.equal(ZERO)));

      await bComptroller.enterMarkets([bZRX_addr, bETH_addr], { from: a.user1 });

      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("user (have an avatar) can enter multiple existing markets on compound", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");
      const cETH_addr = compoundUtil.getContracts("cETH");

      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(ZERO_ADDRESS);

      await bProtocol.registry.newAvatar({ from: a.user1 });
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      const errArr = await bComptroller.enterMarkets.call([bZRX_addr, bETH_addr], {
        from: a.user1,
      });
      await Promise.all(errArr.map((e) => expect(e).to.be.bignumber.equal(ZERO)));
      await bComptroller.enterMarkets([bZRX_addr, bETH_addr], { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("user can enter into multiple market again", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");

      const avatar1 = await bProtocol.registry.newAvatar.call({ from: a.user1 });

      await bProtocol.registry.newAvatar({ from: a.user1 });
      expect(await bProtocol.registry.avatarOf(a.user1)).to.be.equal(avatar1);

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);

      const errArr = await bComptroller.enterMarkets.call([bZRX_addr, bZRX_addr], {
        from: a.user1,
      });
      await Promise.all(errArr.map((e) => expect(e).to.be.bignumber.equal(ZERO)));
      await bComptroller.enterMarkets([bZRX_addr, bZRX_addr], { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
    });

    it("should fail when BToken not exists for a given market", async () => {
      const cBAT_addr = compoundUtil.getContracts("cBAT");
      await expectRevert(
        bComptroller.enterMarkets([cBAT_addr], { from: a.user1 }),
        "BComptroller: CToken-not-exist-for-bToken",
      );
    });
  });

  describe("BComptroller.exitMarket()", async () => {
    let cZRX_addr: string;
    let bZRX_addr: string;

    let cETH_addr: string;
    let bETH_addr: string;

    beforeEach(async () => {
      cZRX_addr = compoundUtil.getContracts("cZRX");
      cETH_addr = compoundUtil.getContracts("cETH");

      await bComptroller.newBToken(cZRX_addr);
      await bComptroller.newBToken(cETH_addr);

      bZRX_addr = await bComptroller.c2b(cZRX_addr);
      bETH_addr = await bComptroller.c2b(cETH_addr);

      await bComptroller.enterMarkets([bZRX_addr, bETH_addr], { from: a.user1 });
    });

    it("should fail when user not have avatar", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");

      await expectRevert.unspecified(bComptroller.exitMarket(cZRX_addr, { from: a.user2 }));
    });

    it("user can exit from a market he is in", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");
      const cETH_addr = compoundUtil.getContracts("cETH");

      const avatar1 = await bProtocol.registry.avatarOf(a.user1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);

      const err = await bComptroller.exitMarket.call(bZRX_addr, { from: a.user1 });
      expect(err).to.be.bignumber.equal(ZERO);
      await bComptroller.exitMarket(bZRX_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });
  });

  describe("BComptroller.getAccountLiquidity()", async () => {
    let cZRX_addr: string;
    let bZRX_addr: string;

    let cETH_addr: string;
    let bETH_addr: string;

    beforeEach(async () => {
      cZRX_addr = compoundUtil.getContracts("cZRX");
      cETH_addr = compoundUtil.getContracts("cETH");

      await bComptroller.newBToken(cZRX_addr);
      await bComptroller.newBToken(cETH_addr);

      bZRX_addr = await bComptroller.c2b(cZRX_addr);
      bETH_addr = await bComptroller.c2b(cETH_addr);

      await bComptroller.enterMarkets([bZRX_addr, bETH_addr], { from: a.user1 });
    });

    it("should get account liquidity of a user");

    it("should get account shortFall of a user");

    it("should get zero when user does not have any liquidity", async () => {
      const result = await bComptroller.getAccountLiquidity({ from: a.user1 });
      const err = result[0];
      const liquidity = result[1];
      const shortFall = result[2];
      expect(err).to.be.bignumber.equal(ZERO);
      expect(liquidity).to.be.bignumber.equal(ZERO);
      expect(shortFall).to.be.bignumber.equal(ZERO);
    });
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
    it("should get oracle add of compound", async () => {
      expect(await bComptroller.oracle()).to.be.equal(await comptroller.oracle());
    });
  });

  describe("Contract public storage:", async () => {
    describe("BComptroller.comptroller()", async () => {
      it("should set comptroller at construction", async () => {
        const _comptroller = a.dummy1;
        const _bComptroller = await BComptroller.new(_comptroller);

        expect(await _bComptroller.comptroller()).to.be.equal(_comptroller);
      });
    });

    describe("BComptroller.registry()", async () => {
      it("should not have registry set at construction", async () => {
        const _comptroller = a.dummy1;
        const _bComptroller = await BComptroller.new(_comptroller);

        expect(await _bComptroller.registry()).to.be.equal(ZERO_ADDRESS);
      });
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
    let cZRX_addr: string;
    let bZRX_addr: string;

    let cETH_addr: string;
    let bETH_addr: string;

    beforeEach(async () => {
      cZRX_addr = compoundUtil.getContracts("cZRX");
      cETH_addr = compoundUtil.getContracts("cETH");

      await bComptroller.newBToken(cZRX_addr);
      await bComptroller.newBToken(cETH_addr);

      bZRX_addr = await bComptroller.c2b(cZRX_addr);
      bETH_addr = await bComptroller.c2b(cETH_addr);
    });

    it("user enterMakert, exitMarket then enterMarket", async () => {
      const cZRX_addr = compoundUtil.getContracts("cZRX");
      const cETH_addr = compoundUtil.getContracts("cETH");

      await bProtocol.registry.newAvatar({ from: a.user1 });
      const avatar1 = await bProtocol.registry.avatarOf(a.user1);
      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(false);

      await bComptroller.enterMarkets([bZRX_addr, bETH_addr], { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);

      await bComptroller.exitMarket(bZRX_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(false);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);

      await bComptroller.enterMarket(bZRX_addr, { from: a.user1 });

      expect(await comptroller.checkMembership(avatar1, cZRX_addr)).to.be.equal(true);
      expect(await comptroller.checkMembership(avatar1, cETH_addr)).to.be.equal(true);
    });

    it("TODO: what should happen when token all max approval is used?");
  });
});
