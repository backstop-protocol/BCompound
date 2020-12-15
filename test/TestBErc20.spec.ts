import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const chai = require("chai");
const expect = chai.expect;
const ONE_ETH = new BN(10).pow(new BN(18));
const ZERO = new BN(0);

contract("BErc20", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;

  before(async () => {
    // await engine.deployCompound();
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

  describe("BErc20", async () => {
    const ONE_ZRX = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);

    let ZRX_addr: string;
    let ZRX: b.Erc20DetailedInstance;

    let cZRX_addr: string;
    let cZRX: b.CErc20Instance;

    let bZRX_addr: string;
    let bZRX: b.BErc20Instance;

    beforeEach(async () => {
      ZRX_addr = compoundUtil.getTokens("ZRX");
      ZRX = await Erc20Detailed.at(ZRX_addr);

      cZRX_addr = compoundUtil.getContracts("cZRX");
      cZRX = await CErc20.at(cZRX_addr);

      bZRX = await engine.deployNewBErc20("cZRX");
      bZRX_addr = bZRX.address;

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    });

    describe("BErc20: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bZRX.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bZRX.cToken()).to.be.equal(cZRX_addr);
        expect(await bZRX.underlying()).to.be.equal(ZRX_addr);
      });
    });

    describe("BErc20.mint()", async () => {
      it("user can mint cTokens", async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        const err = await bZRX.mint.call(ONE_THOUSAND_ZRX, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await ZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });
    });

    describe("BErc20.mintOnAvatar()", async () => {
      it("delegatee can mint on behalf of user", async () => {
        const delegator = a.user1;
        const delegatee = a.user2;

        await bProtocol.registry.newAvatar({ from: delegator });
        const avtOfDelegator = await bProtocol.registry.avatarOf(a.user1);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegatee });
        const err = await bZRX.mintOnAvatar.call(avtOfDelegator, ONE_THOUSAND_ZRX, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.mintOnAvatar(avtOfDelegator, ONE_THOUSAND_ZRX, { from: delegatee });

        expect(await cZRX.balanceOfUnderlying.call(avtOfDelegator)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });
    });

    describe("BErc20.repayBorrow()", async () => {
      it("");
    });

    describe("BErc20.liquidateBorrow()", async () => {
      it("");
    });

    describe("BErc20.borrowBalanceCurrent()", async () => {
      it("");
    });

    describe("BErc20.redeem()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const userZRX_BalAfterMint = await ZRX.balanceOf(a.user1);
        expect(userZRX_BalAfterMint).to.be.bignumber.equal(ZERO);

        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });

      it("user can redeem all cTokens", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        const err = await bZRX.redeem.call(cTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeem(cTokensAmount, { from: a.user1 });

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

        const userZRX_BalAfter = await ZRX.balanceOf(a.user1);
        expect(userZRX_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("user can redeem some of his cToken", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        const half_cTokens = cTokensAmount.div(new BN(2));
        const err = await bZRX.redeem.call(half_cTokens, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.redeem(half_cTokens, { from: a.user1 });

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX.div(new BN(2)),
        );

        await bZRX.redeem(half_cTokens, { from: a.user1 });

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

        const userZRX_BalAfter = await ZRX.balanceOf(a.user1);
        expect(userZRX_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });
    });

    describe("BErc20.redeemOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        avatar1 = await bProtocol.registry.avatarOf(delegator);
        expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);
      });

      it("delegatee should redeem cTokens on behalf of user", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        const err = await bZRX.redeemOnAvatar.call(avatar1, cTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.redeemOnAvatar(avatar1, cTokensAmount, { from: delegatee });

        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("delegatee should redeem some cTokens on behalf of user", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));

        let err = await bZRX.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(halfCTokensAmount);
        expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(FIVE_HUNDRED_ZRX);

        err = await bZRX.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });
    });

    describe("BErc20.redeemUnderlying()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        avatar1 = await bProtocol.registry.avatarOf(a.user1);
      });

      it("user should redeem all underlying tokens", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(a.user1);

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        const err = await bZRX.redeemUnderlying.call(underlyingBalance, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlying(underlyingBalance, { from: a.user1 });

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("user should reedeem some underlying tokens", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(a.user1);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        let err = await bZRX.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

        err = await bZRX.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });
    });

    describe("BErc20.redeemUnderlyingOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        avatar1 = await bProtocol.registry.avatarOf(delegator);
      });

      it("delegatee should redeem all underlying tokens of the user", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        const err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, underlyingBalance, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: delegatee });

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("delegatee should reedeem some underlying tokens of the user", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        let err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

        err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });
    });

    describe("BErc20.borrow()", async () => {
      it("");
    });

    describe("BErc20.borrowOnAvatar()", async () => {
      it("");
    });

    // ERC20
    describe("BErc20.transfer()", async () => {
      it("");
    });

    describe("BErc20.transferOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.transferFrom()", async () => {
      it("");
    });

    describe("BErc20.transferFromOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.approve()", async () => {
      it("");
    });

    describe("BErc20.approveOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.allowance()", async () => {
      it("");
    });

    describe("BErc20.balanceOf()", async () => {
      it("");
    });

    describe("BErc20.name()", async () => {
      it("should get token name", async () => {
        expect(await bZRX.name()).to.be.equal("cZRX");
      });
    });

    describe("BErc20.symbol()", async () => {
      it("should get token symbol", async () => {
        expect(await bZRX.symbol()).to.be.equal("cZRX");
      });
    });

    describe("BErc20.decimals()", async () => {
      it("should get token decimals", async () => {
        expect(await bZRX.decimals()).to.be.bignumber.equal(new BN(8));
      });
    });

    describe("BErc20.totalSupply()", async () => {
      it("should get zero totalSupply", async () => {
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);
      });

      it("should get non-zero totalSupply", async () => {
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const exchangeRateCurrent = await cZRX.exchangeRateCurrent.call();

        const expectedTotalSupply = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(exchangeRateCurrent);
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);
      });
    });
  });
});
