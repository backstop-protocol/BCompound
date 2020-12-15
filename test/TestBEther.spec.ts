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

const CEther: b.CEtherContract = artifacts.require("CEther");

const BEther: b.BEtherContract = artifacts.require("BEther");

const chai = require("chai");
const expect = chai.expect;
const ONE_ETH = new BN(10).pow(new BN(18));
const ZERO = new BN(0);

contract("BEther", async (accounts) => {
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

  describe("BEther", async () => {
    const ONE_ETH = new BN(10).pow(new BN(18));
    const HALF_ETH = ONE_ETH.div(new BN(2));

    let cETH_addr: string;
    let cETH: b.CEtherInstance;

    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    beforeEach(async () => {
      cETH_addr = compoundUtil.getContracts("cETH");
      cETH = await CEther.at(cETH_addr);

      bETH = await engine.deployNewBEther();
      bETH_addr = bETH.address;
    });

    describe("BEther: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bETH.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bETH.cToken()).to.be.equal(cETH_addr);
      });
    });

    describe("BEther.mint()", async () => {
      it("user can mint cTokens", async () => {
        await bETH.mint.call({ from: a.user1, value: ONE_ETH.toString() });
        await bETH.mint({ from: a.user1, value: ONE_ETH });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.mintOnAvatar()", async () => {
      it("delegatee can mint on behalf of user", async () => {
        const delegator = a.user1;
        const delegatee = a.user2;

        await bProtocol.registry.newAvatar({ from: delegator });
        const avtOfDelegator = await bProtocol.registry.avatarOf(a.user1);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        await bETH.mintOnAvatar.call(avtOfDelegator, { from: delegatee, value: ONE_ETH });

        await bETH.mintOnAvatar(avtOfDelegator, { from: delegatee, value: ONE_ETH });

        expect(await cETH.balanceOfUnderlying.call(avtOfDelegator)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.repayBorrow()", async () => {
      it("");
    });

    describe("BEther.liquidateBorrow()", async () => {
      it("");
    });

    // BToken
    describe("BEther.myAvatar()", async () => {
      it("");
    });

    describe("BEther.borrowBalanceCurrent()", async () => {
      it("");
    });

    describe("BEther.redeem()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        const userETH_BalBefore = await balance.current(a.user1);

        const tx = await bETH.mint({ from: a.user1, value: ONE_ETH, gasPrice: 1 });
        let txFee = new BN(tx.receipt.gasUsed);

        const userETH_BalAfterMint = await balance.current(a.user1);
        expect(userETH_BalAfterMint).to.be.bignumber.equal(
          userETH_BalBefore.sub(ONE_ETH).sub(txFee),
        );

        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ONE_ETH);
      });

      it("user can redeem all cETH", async () => {
        const cTokensAmount = await cETH.balanceOf(avatar1);
        const err = await bETH.redeem.call(cTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        const userETH_BalBeforeRedeem = await balance.current(a.user1);
        const tx = await bETH.redeem(cTokensAmount, { from: a.user1, gasPrice: 1 });
        const userETH_BalAfterRedeem = await balance.current(a.user1);
        const txFee = new BN(tx.receipt.gasUsed);
        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(
          userETH_BalBeforeRedeem.add(ONE_ETH).sub(txFee),
        );

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);
      });

      it("user can redeem some of his cETH", async () => {
        const cTokensAmount = await cETH.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));
        const err = await bETH.redeem.call(halfCTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        let userETH_BalBeforeRedeem = await balance.current(a.user1);
        let tx = await bETH.redeem(halfCTokensAmount, { from: a.user1, gasPrice: 1 });
        let userETH_BalAfterRedeem = await balance.current(a.user1);
        let txFee = new BN(tx.receipt.gasUsed);
        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(
          userETH_BalBeforeRedeem.add(HALF_ETH).sub(txFee),
        );

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(HALF_ETH);

        userETH_BalBeforeRedeem = await balance.current(a.user1);
        tx = await bETH.redeem(halfCTokensAmount, { from: a.user1, gasPrice: 1 });
        userETH_BalAfterRedeem = await balance.current(a.user1);
        txFee = new BN(tx.receipt.gasUsed);
        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(
          userETH_BalBeforeRedeem.add(HALF_ETH).sub(txFee),
        );

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.redeemOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await bETH.mint({ from: delegator, value: ONE_ETH });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        avatar1 = await bProtocol.registry.avatarOf(delegator);
        expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);
      });

      it("delegatee should redeem cETH on behalf of user", async () => {
        const delegatorEthBalBeforeRedeem = await balance.current(delegator);
        const delegateeEthBalBeforeRedeem = await balance.current(delegatee);

        const cTokensAmount = await cETH.balanceOf(avatar1);
        const err = await bETH.redeemOnAvatar.call(avatar1, cTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);

        const tx = await bETH.redeemOnAvatar(avatar1, cTokensAmount, {
          from: delegatee,
          gasPrice: 1,
        });
        const txFee = new BN(tx.receipt.gasUsed);

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(ONE_ETH).sub(txFee),
        );
      });

      it("delegatee should redeem some cETH on behalf of user", async () => {
        let delegatorEthBalBeforeRedeem = await balance.current(delegator);
        let delegateeEthBalBeforeRedeem = await balance.current(delegatee);

        const cTokensAmount = await cETH.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));

        let err = await bETH.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        let tx = await bETH.redeemOnAvatar(avatar1, halfCTokensAmount, {
          from: delegatee,
          gasPrice: 1,
        });
        let txFee = new BN(tx.receipt.gasUsed);

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(halfCTokensAmount);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(HALF_ETH).sub(txFee),
        );

        delegatorEthBalBeforeRedeem = await balance.current(delegator);
        delegateeEthBalBeforeRedeem = await balance.current(delegatee);
        err = await bETH.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        tx = await bETH.redeemOnAvatar(avatar1, halfCTokensAmount, {
          from: delegatee,
          gasPrice: 1,
        });
        txFee = new BN(tx.receipt.gasUsed);

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(HALF_ETH).sub(txFee),
        );
      });
    });

    describe("BEther.redeemUnderlying()", async () => {
      it("");
    });

    describe("BEther.redeemUnderlyingOnAvatar()", async () => {
      it("");
    });

    describe("BEther.borrow()", async () => {
      it("");
    });

    describe("BEther.borrowOnAvatar()", async () => {
      it("");
    });

    // ERC20
    describe("BEther.transfer()", async () => {
      it("");
    });

    describe("BEther.transferOnAvatar()", async () => {
      it("");
    });

    describe("BEther.transferFrom()", async () => {
      it("");
    });

    describe("BEther.transferFromOnAvatar()", async () => {
      it("");
    });

    describe("BEther.approve()", async () => {
      it("");
    });

    describe("BEther.approveOnAvatar()", async () => {
      it("");
    });

    describe("BEther.allowance()", async () => {
      it("");
    });

    describe("BEther.balanceOf()", async () => {
      it("");
    });

    describe("BEther.name()", async () => {
      it("should get token name", async () => {
        expect(await bETH.name()).to.be.equal("cETH");
      });
    });

    describe("BEther.symbol()", async () => {
      it("should get token symbol", async () => {
        expect(await bETH.symbol()).to.be.equal("cETH");
      });
    });

    describe("BEther.decimals()", async () => {
      it("should get token decimals", async () => {
        expect(await bETH.decimals()).to.be.bignumber.equal(new BN(8));
      });
    });

    describe("BEther.totalSupply()", async () => {
      it("should get zero totalSupply", async () => {
        expect(await bETH.totalSupply()).to.be.bignumber.equal(ZERO);
      });

      it("should get non-zero totalSupply", async () => {
        expect(await bETH.totalSupply()).to.be.bignumber.equal(ZERO);

        await bETH.mint({ from: a.user1, value: toWei("1", "ether") });

        const exchangeRateCurrent = await cETH.exchangeRateCurrent.call();

        const expectedTotalSupply = ONE_ETH.mul(ONE_ETH).div(exchangeRateCurrent);
        expect(await bETH.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);
      });
    });
  });
});
