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
const TEN_ETH = new BN(10).mul(ONE_ETH);
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

  describe("BErc20", async () => {
    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);

    let ZRX_addr: string;
    let ZRX: b.Erc20DetailedInstance;

    let BAT_addr: string;
    let BAT: b.Erc20DetailedInstance;

    let cZRX_addr: string;
    let cZRX: b.CErc20Instance;

    let bZRX_addr: string;
    let bZRX: b.BErc20Instance;

    let bBAT_addr: string;
    let bBAT: b.BErc20Instance;

    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    beforeEach(async () => {
      ZRX_addr = compoundUtil.getTokens("ZRX");
      ZRX = await Erc20Detailed.at(ZRX_addr);

      BAT_addr = compoundUtil.getTokens("BAT");
      BAT = await Erc20Detailed.at(BAT_addr);

      cZRX_addr = compoundUtil.getContracts("cZRX");
      cZRX = await CErc20.at(cZRX_addr);

      // deploy BErc20
      bZRX = await engine.deployNewBErc20("cZRX");
      bZRX_addr = bZRX.address;

      bBAT = await engine.deployNewBErc20("cBAT");
      bBAT_addr = bBAT.address;

      // deploy BEther
      bETH = await engine.deployNewBEther();
      bETH_addr = bETH.address;

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);
      expect((await BAT.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);
    });

    // describe("BErc20: Constructor", async () => {
    //   it("should set addresses", async () => {
    //     expect(await bZRX.registry()).to.be.equal(bProtocol.registry.address);
    //     expect(await bZRX.cToken()).to.be.equal(cZRX_addr);
    //     expect(await bZRX.underlying()).to.be.equal(ZRX_addr);
    //   });
    // });

    // describe("BErc20.mint()", async () => {
    //   it("user can mint cTokens", async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     const err = await bZRX.mint.call(ONE_THOUSAND_ZRX, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);

    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

    //     const avatar1 = await bProtocol.registry.avatarOf(a.user1);
    //     expect(await ZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
    //       ONE_THOUSAND_ZRX,
    //     );
    //   });
    // });

    // describe("BErc20.mintOnAvatar()", async () => {
    //   const delegator = a.user1;
    //   const delegatee = a.user2;
    //   const nonDelegatee = a.other;
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await bProtocol.registry.newAvatar({ from: delegator });
    //     await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);
    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("delegatee can mint on behalf of user", async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegatee });
    //     const err = await bZRX.mintOnAvatar.call(avatar1, ONE_THOUSAND_ZRX, {
    //       from: delegatee,
    //     });
    //     expect(err).to.be.bignumber.equal(ZERO);

    //     await bZRX.mintOnAvatar(avatar1, ONE_THOUSAND_ZRX, { from: delegatee });

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
    //       ONE_THOUSAND_ZRX,
    //     );
    //   });

    //   it("should fail when non-delegatee try to mint on behalf of user", async () => {
    //     await ZRX.transfer(nonDelegatee, ONE_THOUSAND_ZRX, { from: a.deployer });
    //     expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: nonDelegatee });
    //     await expectRevert(
    //       bZRX.mintOnAvatar(avatar1, ONE_THOUSAND_ZRX, {
    //         from: nonDelegatee,
    //       }),
    //       "BToken: delegatee-not-authorized",
    //     );

    //     expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });
    // });

    // describe("BErc20.repayBorrow()", async () => {
    //   it("");
    // });

    // describe("BErc20.liquidateBorrow()", async () => {
    //   it("");
    // });

    // describe("BErc20.borrowBalanceCurrent()", async () => {
    //   it("");
    // });

    // describe("BErc20.redeem()", async () => {
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

    //     const userZRX_BalAfterMint = await ZRX.balanceOf(a.user1);
    //     expect(userZRX_BalAfterMint).to.be.bignumber.equal(ZERO);

    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
    //       ONE_THOUSAND_ZRX,
    //     );
    //   });

    //   it("user can redeem all cTokens", async () => {
    //     const cTokensAmount = await cZRX.balanceOf(avatar1);
    //     const err = await bZRX.redeem.call(cTokensAmount, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeem(cTokensAmount, { from: a.user1 });

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

    //     const userZRX_BalAfter = await ZRX.balanceOf(a.user1);
    //     expect(userZRX_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("user can redeem some of his cToken", async () => {
    //     const cTokensAmount = await cZRX.balanceOf(avatar1);
    //     const half_cTokens = cTokensAmount.div(new BN(2));
    //     const err = await bZRX.redeem.call(half_cTokens, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);

    //     await bZRX.redeem(half_cTokens, { from: a.user1 });

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
    //       ONE_THOUSAND_ZRX.div(new BN(2)),
    //     );

    //     await bZRX.redeem(half_cTokens, { from: a.user1 });

    //     expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

    //     const userZRX_BalAfter = await ZRX.balanceOf(a.user1);
    //     expect(userZRX_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });
    // });

    // describe("BErc20.redeemOnAvatar()", async () => {
    //   const delegator = a.user1;
    //   const delegatee = a.user3;
    //   const nonDelegatee = a.other;
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

    //     await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

    //     avatar1 = await bProtocol.registry.avatarOf(delegator);
    //     expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);
    //   });

    //   it("delegatee should redeem cTokens on behalf of user", async () => {
    //     const cTokensAmount = await cZRX.balanceOf(avatar1);
    //     const err = await bZRX.redeemOnAvatar.call(avatar1, cTokensAmount, { from: delegatee });
    //     expect(err).to.be.bignumber.equal(ZERO);

    //     await bZRX.redeemOnAvatar(avatar1, cTokensAmount, { from: delegatee });

    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("delegatee should redeem some cTokens on behalf of user", async () => {
    //     const cTokensAmount = await cZRX.balanceOf(avatar1);
    //     const halfCTokensAmount = cTokensAmount.div(new BN(2));

    //     let err = await bZRX.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(halfCTokensAmount);
    //     expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(FIVE_HUNDRED_ZRX);

    //     err = await bZRX.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("should fail when non-delegatee redeem on behalf of user", async () => {
    //     const cTokensAmount = await cZRX.balanceOf(avatar1);
    //     await expectRevert(
    //       bZRX.redeemOnAvatar(avatar1, cTokensAmount, { from: nonDelegatee }),
    //       "BToken: delegatee-not-authorized",
    //     );
    //   });
    // });

    // describe("BErc20.redeemUnderlying()", async () => {
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);
    //   });

    //   it("user should redeem all underlying tokens", async () => {
    //     const underlyingBalance = await bZRX.balanceOfUnderlying.call(a.user1);

    //     expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

    //     const err = await bZRX.redeemUnderlying.call(underlyingBalance, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlying(underlyingBalance, { from: a.user1 });

    //     expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("user should reedeem some underlying tokens", async () => {
    //     const underlyingBalance = await bZRX.balanceOfUnderlying.call(a.user1);
    //     const halfUnderlyingBal = underlyingBalance.div(new BN(2));

    //     expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

    //     let err = await bZRX.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

    //     err = await bZRX.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

    //     expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });
    // });

    // describe("BErc20.redeemUnderlyingOnAvatar()", async () => {
    //   const delegator = a.user1;
    //   const delegatee = a.user3;
    //   const nonDelegatee = a.other;
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

    //     await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
    //     avatar1 = await bProtocol.registry.avatarOf(delegator);
    //   });

    //   it("delegatee should redeem all underlying tokens on behalf of the user", async () => {
    //     const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);

    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

    //     const err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, underlyingBalance, {
    //       from: delegatee,
    //     });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: delegatee });

    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("delegatee should reedeem some underlying tokens on behalf of the user", async () => {
    //     const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);
    //     const halfUnderlyingBal = underlyingBalance.div(new BN(2));

    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

    //     let err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
    //       from: delegatee,
    //     });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

    //     err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
    //       from: delegatee,
    //     });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bZRX.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

    //     expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    //   });

    //   it("should fail when a non-delegatee try to redeem tokens on behalf of user", async () => {
    //     const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);

    //     expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

    //     await expectRevert(
    //       bZRX.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: nonDelegatee }),
    //       "BToken: delegatee-not-authorized",
    //     );

    //     expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
    //   });
    // });

    // describe("BErc20.borrow()", async () => {
    //   let avatar1: string;
    //   let avatar2: string;
    //   let avatar3: string;

    //   beforeEach(async () => {
    //     // user1 deposit ZRX
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);

    //     // user2 deposit BAT
    //     await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
    //     await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
    //     avatar2 = await bProtocol.registry.avatarOf(a.user2);

    //     // user3 deposit ETH
    //     await bETH.mint({ from: a.user3, value: TEN_ETH });
    //     avatar3 = await bProtocol.registry.avatarOf(a.user3);
    //   });

    //   it("should borrow BAT", async () => {
    //     // user1 borrows BAT, he has ZRX collateral
    //     expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

    //     const err = await bBAT.borrow.call(ONE_BAT, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bBAT.borrow(ONE_BAT, { from: a.user1 });

    //     expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_BAT);
    //   });

    //   it("should borrow ETH", async () => {
    //     // user1 borrows ETH, he has ZRX collateral
    //     const ethBalBefore = await balance.current(a.user1);

    //     const err = await bETH.borrow.call(ONE_ETH, { from: a.user1 });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     const tx = await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 1 });
    //     const txFee = new BN(tx.receipt.gasUsed);

    //     expect(await balance.current(a.user1)).to.be.bignumber.equal(
    //       ethBalBefore.add(ONE_ETH).sub(txFee),
    //     );
    //   });

    //   it("should fail borrow when user not have enough collateral", async () => {
    //     const ethBalBefore = await balance.current(a.other);
    //     await bETH.mint.call({ from: a.other, value: ONE_ETH });

    //     const tx = await bETH.mint({ from: a.other, value: ONE_ETH, gasPrice: 1 });
    //     const txFee = new BN(tx.receipt.gasUsed);

    //     expect(await balance.current(a.other)).to.be.bignumber.equal(
    //       ethBalBefore.sub(ONE_ETH).sub(txFee),
    //     );

    //     await expectRevert(
    //       bZRX.borrow(ONE_THOUSAND_ZRX, { from: a.other }),
    //       "BToken: borrow-failed",
    //     );
    //   });
    // });

    // describe("BErc20.borrowOnAvatar()", async () => {
    //   const delegator = a.user1;
    //   const delegatee = a.user4;
    //   const nonDelegatee = a.other;
    //   let avatar1: string;
    //   let avatar2: string;
    //   let avatar3: string;

    //   beforeEach(async () => {
    //     // user1 deposit ZRX
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);

    //     // user2 deposit BAT
    //     await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
    //     await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
    //     avatar2 = await bProtocol.registry.avatarOf(a.user2);

    //     // user3 deposit ETH
    //     await bETH.mint({ from: a.user3, value: TEN_ETH });
    //     avatar3 = await bProtocol.registry.avatarOf(a.user3);

    //     // delegate
    //     await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
    //   });

    //   it("delegatee should borrow BAT on behalf of user", async () => {
    //     expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

    //     const err = await bBAT.borrowOnAvatar.call(avatar1, ONE_BAT, { from: delegatee });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     await bBAT.borrowOnAvatar(avatar1, ONE_BAT, { from: delegatee });

    //     expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_BAT);
    //   });

    //   it("delegatee should borrow ETH on behalf of user", async () => {
    //     const ethBalBefore = await balance.current(delegatee);

    //     const err = await bETH.borrowOnAvatar.call(avatar1, ONE_ETH, { from: delegatee });
    //     expect(err).to.be.bignumber.equal(ZERO);
    //     const tx = await bETH.borrowOnAvatar(avatar1, ONE_ETH, { from: delegatee, gasPrice: 1 });
    //     const txFee = new BN(tx.receipt.gasUsed);

    //     expect(await balance.current(delegatee)).to.be.bignumber.equal(
    //       ethBalBefore.add(ONE_ETH).sub(txFee),
    //     );
    //   });

    //   it("delegatee tx should fail when user not have enough collateral", async () => {
    //     expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

    //     await expectRevert(
    //       bBAT.borrowOnAvatar(avatar1, ONE_THOUSAND_BAT, { from: delegatee }),
    //       "BToken: borrow-failed",
    //     );

    //     expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //   });

    //   it("should fail when non-delegatee try to borrow on behalf of user", async () => {
    //     expect(await BAT.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

    //     await expectRevert(
    //       bBAT.borrowOnAvatar(avatar1, ONE_BAT, { from: nonDelegatee }),
    //       "BToken: delegatee-not-authorized",
    //     );

    //     expect(await BAT.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
    //   });
    // });

    // //     // ERC20
    // describe("BErc20.transfer()", async () => {
    //   let avatar1: string;

    //   beforeEach(async () => {
    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

    //     avatar1 = await bProtocol.registry.avatarOf(a.user1);
    //     expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
    //   });

    //   it("should transfer cTokens to another user (not have an avatar)", async () => {
    //     let avatar2 = await bProtocol.registry.avatarOf(a.user2);
    //     expect(avatar2).to.be.equal(ZERO_ADDRESS);

    //     const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
    //       await bZRX.exchangeRateCurrent.call(),
    //     );
    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);

    //     await bZRX.transfer(a.user2, ONE_cZRX, { from: a.user1 });

    //     // avatar2 created
    //     avatar2 = await bProtocol.registry.avatarOf(a.user2);
    //     expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(
    //       user1_expected_cZRX_Bal.sub(ONE_cZRX),
    //     );
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_cZRX);
    //   });

    //   it("should transfer cTokens to another user (already have an avatar)", async () => {
    //     await bProtocol.registry.newAvatar({ from: a.user2 });
    //     const avatar2 = await bProtocol.registry.avatarOf(a.user2);
    //     expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

    //     const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
    //       await bZRX.exchangeRateCurrent.call(),
    //     );
    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);

    //     await bZRX.transfer(a.user2, ONE_cZRX, { from: a.user1 });

    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(
    //       user1_expected_cZRX_Bal.sub(ONE_cZRX),
    //     );
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_cZRX);
    //   });

    //   it("should fail when transfer to user's own avatar", async () => {
    //     const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
    //       await bZRX.exchangeRateCurrent.call(),
    //     );
    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);

    //     await expectRevert(
    //       bZRX.transfer(avatar1, ONE_cZRX, { from: a.user1 }),
    //       "Registry: cannot-create-an-avatar-of-avatar",
    //     );

    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //   });

    //   it("should fail when transfer to another user's avatar address", async () => {
    //     await bProtocol.registry.newAvatar({ from: a.user2 });
    //     const avatar2 = await bProtocol.registry.avatarOf(a.user2);
    //     expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

    //     const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
    //       await bZRX.exchangeRateCurrent.call(),
    //     );
    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);
    //     expect(await cZRX.balanceOf(avatar2)).to.be.bignumber.equal(ZERO);

    //     await expectRevert(
    //       bZRX.transfer(avatar2, ONE_cZRX, { from: a.user1 }),
    //       "Registry: cannot-create-an-avatar-of-avatar",
    //     );

    //     expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);
    //     expect(await cZRX.balanceOf(avatar2)).to.be.bignumber.equal(ZERO);
    //   });
    // });

    // describe("BErc20.transferOnAvatar()", async () => {
    //   let delegator = a.user1;
    //   let delegatee = a.user2;
    //   let nonDelegatee = a.other;

    //   let delegator_expected_cZRX_Bal: BN;

    //   let avatar1: string;
    //   let avatar2: string;

    //   beforeEach(async () => {
    //     await bProtocol.registry.newAvatar({ from: delegator });
    //     avatar1 = await bProtocol.registry.avatarOf(delegator);
    //     expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

    //     await bProtocol.registry.newAvatar({ from: delegatee });
    //     avatar2 = await bProtocol.registry.avatarOf(delegatee);
    //     expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

    //     await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
    //     expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);

    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

    //     delegator_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
    //       await bZRX.exchangeRateCurrent.call(),
    //     );
    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //   });

    //   it("delegatee should transfer cTokens to user3 (not have an avatar) on behalf of delegator", async () => {
    //     expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

    //     await bZRX.transferOnAvatar(avatar1, a.user3, ONE_cZRX, { from: delegatee });

    //     // avatar3 created
    //     const avatar3 = await bProtocol.registry.avatarOf(a.user3);
    //     expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(
    //       delegator_expected_cZRX_Bal.sub(ONE_cZRX),
    //     );
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //     expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
    //   });

    //   it("delegatee should transfer cTokens to user3 (already have an avatar) on behalf of delegator", async () => {
    //     await bProtocol.registry.newAvatar({ from: a.user3 });
    //     const avatar3 = await bProtocol.registry.avatarOf(a.user3);
    //     expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

    //     await bZRX.transferOnAvatar(avatar1, a.user3, ONE_cZRX, { from: delegatee });

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(
    //       delegator_expected_cZRX_Bal.sub(ONE_cZRX),
    //     );
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //     expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
    //   });

    //   it("delegatee tx should fail when try to transfer to delegator's own avatar", async () => {
    //     await expectRevert(
    //       bZRX.transferOnAvatar(avatar1, avatar1, ONE_cZRX, { from: delegatee }),
    //       "Registry: cannot-create-an-avatar-of-avatar",
    //     );

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //   });

    //   it("delegatee tx should fail when try to transfer to delegatess's own avatar", async () => {
    //     const delegateeAvatar = await bProtocol.registry.avatarOf(delegatee);
    //     await expectRevert(
    //       bZRX.transferOnAvatar(avatar1, delegateeAvatar, ONE_cZRX, { from: delegatee }),
    //       "Registry: cannot-create-an-avatar-of-avatar",
    //     );

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //   });

    //   it("delegatee tx should fail when transfer to user3's avatar address on behalf of delegator", async () => {
    //     await bProtocol.registry.newAvatar({ from: a.user3 });
    //     const avatar3 = await bProtocol.registry.avatarOf(a.user3);
    //     expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

    //     await expectRevert(
    //       bZRX.transferOnAvatar(avatar1, avatar3, ONE_cZRX, { from: delegatee }),
    //       "Registry: cannot-create-an-avatar-of-avatar",
    //     );

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //     expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
    //   });

    //   it("should fail when non-delegatee try to transfer token", async () => {
    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //     expect(await bZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

    //     await expectRevert(
    //       bZRX.transferOnAvatar(avatar1, a.other, ONE_cZRX, { from: nonDelegatee }),
    //       "BToken: delegatee-not-authorized",
    //     );

    //     expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
    //     expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
    //     expect(await bZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
    //   });
    // });

    // describe("BErc20.transferFrom()", async () => {
    //   it("");
    // });

    // describe("BErc20.transferFromOnAvatar()", async () => {
    //   it("");
    // });

    describe("BErc20.approve()", async () => {
      let owner = a.user1;
      let spender = a.user2;

      let ownerAvatar: string;
      let spenderAvatar: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: a.user1 });
        ownerAvatar = await bProtocol.registry.avatarOf(a.user1);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: a.user2 });
        spenderAvatar = await bProtocol.registry.avatarOf(a.user2);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);
      });

      it("user should approve another user (have an avatar)", async () => {
        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.approve.call(spender, TEN_cZRX, { from: owner });
        expect(result).to.be.equal(true);
        await bZRX.approve(spender, TEN_cZRX, { from: owner });

        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("user should approve another user (does not have an avatar)", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bZRX.approve.call(a.other, TEN_cZRX, { from: owner });
        expect(result).to.be.equal(true);
        await bZRX.approve(a.other, TEN_cZRX, { from: owner });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cZRX.allowance(ownerAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("should fail when user try to give approval to an avatar", async () => {
        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.approve(spenderAvatar, TEN_cZRX, { from: owner }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.approveOnAvatar()", async () => {
      let delegator = a.user1;
      let delegatee = a.user2;
      let spender = a.user3;

      let delegatorAvatar: string;
      let delegateeAvatar: string;
      let spenderAvatar: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: delegator });
        delegatorAvatar = await bProtocol.registry.avatarOf(delegator);
        expect(delegatorAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: delegatee });
        delegateeAvatar = await bProtocol.registry.avatarOf(delegatee);
        expect(delegateeAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        expect(await bProtocol.registry.delegate(delegatorAvatar, delegatee)).to.be.equal(true);
      });

      it("delegatee should approve another user (have an avatar) on behalf of delegator", async () => {
        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.approveOnAvatar.call(delegatorAvatar, spender, TEN_cZRX, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bZRX.approveOnAvatar(delegatorAvatar, spender, TEN_cZRX, { from: delegatee });

        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(
          TEN_cZRX,
        );
      });

      it("delegatee should approve another user (does not have an avatar) on behalf of delegator", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bZRX.approveOnAvatar.call(delegatorAvatar, a.other, TEN_cZRX, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bZRX.approveOnAvatar(delegatorAvatar, a.other, TEN_cZRX, { from: delegatee });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cZRX.allowance(delegatorAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("delegatee tx should fail when user try to give approval to an avatar on behalf of delegator", async () => {
        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.approveOnAvatar(delegatorAvatar, spenderAvatar, TEN_cZRX, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    // describe("BErc20.allowance()", async () => {
    //   it("");
    // });

    // describe("BErc20.balanceOf()", async () => {
    //   it("");
    // });

    // describe("BErc20.name()", async () => {
    //   it("should get token name", async () => {
    //     expect(await bZRX.name()).to.be.equal("cZRX");
    //   });
    // });

    // describe("BErc20.symbol()", async () => {
    //   it("should get token symbol", async () => {
    //     expect(await bZRX.symbol()).to.be.equal("cZRX");
    //   });
    // });

    // describe("BErc20.decimals()", async () => {
    //   it("should get token decimals", async () => {
    //     expect(await bZRX.decimals()).to.be.bignumber.equal(new BN(8));
    //   });
    // });

    // describe("BErc20.totalSupply()", async () => {
    //   it("should get zero totalSupply", async () => {
    //     expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);
    //   });

    //   it("should get non-zero totalSupply", async () => {
    //     expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);

    //     await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
    //     await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

    //     const exchangeRateCurrent = await cZRX.exchangeRateCurrent.call();

    //     const expectedTotalSupply = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(exchangeRateCurrent);
    //     expect(await bZRX.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);
    //   });
    // });
  });
});
