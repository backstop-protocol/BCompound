import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { BAccounts } from "../../test-utils/BAccounts";
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
const HALF_ETH = ONE_ETH.div(new BN(2));
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
    const HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);

    const ONE_USDT = new BN(10).pow(new BN(6));
    const ONE_THOUSAND_USDT = new BN(1000).mul(ONE_USDT);
    const FIVE_HUNDRED_USDT = new BN(500).mul(ONE_USDT);

    // ZRX
    let ZRX_addr: string;
    let ZRX: b.Erc20DetailedInstance;

    let bZRX_addr: string;
    let bZRX: b.BErc20Instance;

    let cZRX_addr: string;
    let cZRX: b.CErc20Instance;

    // BAT
    let BAT_addr: string;
    let BAT: b.Erc20DetailedInstance;

    let bBAT_addr: string;
    let bBAT: b.BErc20Instance;

    let cBAT_addr: string;
    let cBAT: b.CErc20Instance;

    // USDT
    let USDT_addr: string;
    let USDT: b.Erc20DetailedInstance;

    let bUSDT_addr: string;
    let bUSDT: b.BErc20Instance;

    let cUSDT_addr: string;
    let cUSDT: b.CErc20Instance;

    // ETH
    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    let cETH_addr: string;
    let cETH: b.CErc20Instance;

    beforeEach(async () => {
      // ZRX
      bZRX = await engine.deployNewBErc20("cZRX");
      bZRX_addr = bZRX.address;

      ZRX_addr = compoundUtil.getTokens("ZRX");
      ZRX = await Erc20Detailed.at(ZRX_addr);

      cZRX_addr = compoundUtil.getContracts("cZRX");
      cZRX = await CErc20.at(cZRX_addr);

      // BAT
      bBAT = await engine.deployNewBErc20("cBAT");
      bBAT_addr = bBAT.address;

      BAT_addr = compoundUtil.getTokens("BAT");
      BAT = await Erc20Detailed.at(BAT_addr);

      cBAT_addr = compoundUtil.getContracts("cBAT");
      cBAT = await CErc20.at(cBAT_addr);

      // USDT
      bUSDT = await engine.deployNewBErc20("cUSDT");
      bUSDT_addr = bUSDT.address;

      USDT_addr = compoundUtil.getTokens("USDT");
      USDT = await Erc20Detailed.at(USDT_addr);

      cUSDT_addr = compoundUtil.getContracts("cUSDT");
      cUSDT = await CErc20.at(cUSDT_addr);

      // ETH:: deploy BEther
      bETH = await engine.deployNewBEther();
      bETH_addr = bETH.address;

      cETH_addr = compoundUtil.getContracts("cETH");
      cETH = await CErc20.at(cETH_addr);

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);
      expect((await BAT.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

      await USDT.transfer(a.user4, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user4)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));
    });

    describe("BErc20.borrow()", async () => {
      let avatar1: string;
      let avatar2: string;
      let avatar3: string;
      let avatar4: string;

      beforeEach(async () => {
        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit BAT
        await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
        avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user3 deposit ETH
        await bETH.mint({ from: a.user3, value: TEN_ETH });
        avatar3 = await bProtocol.registry.avatarOf(a.user3);

        // user4 deposit USDT
        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.user4 });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.user4 });
        avatar4 = await bProtocol.registry.avatarOf(a.user4);
      });

      it("should borrow BAT", async () => {
        // user1 borrows BAT, he has ZRX collateral
        expect(await bBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        const err = await bBAT.borrow.call(ONE_BAT, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bBAT.borrow(ONE_BAT, { from: a.user1 });

        expect(await bBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ONE_BAT);
        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_BAT);
      });

      it("should borrow ETH", async () => {
        // user1 borrows ETH, he has ZRX collateral
        const ethBalBefore = await balance.current(a.user1);

        const err = await bETH.borrow.call(ONE_ETH, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        const tx = await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 1 });
        const txFee = new BN(tx.receipt.gasUsed);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          ethBalBefore.add(ONE_ETH).sub(txFee),
        );
      });

      it("should fail when USDT is collatral and borrow ZRX", async () => {
        await USDT.transfer(a.other, ONE_THOUSAND_USDT, { from: a.deployer });

        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.other });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.other });

        expect(await ZRX.balanceOf(a.other)).to.be.bignumber.equal(ZERO);

        await expectRevert(bZRX.borrow(ONE_ZRX, { from: a.other }), "AbsCToken: borrow-failed");

        expect(await bZRX.borrowBalanceCurrent.call(a.other)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(a.other)).to.be.bignumber.equal(ZERO);
      });

      it("should borrow USDT", async () => {
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.not.equal(ZERO);
        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        await bUSDT.borrow(ONE_USDT, { from: a.user1 });

        expect(await bUSDT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ONE_USDT);
        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_USDT);
      });

      it("should fail borrow when user not have enough collateral", async () => {
        const ethBalBefore = await balance.current(a.other);
        await bETH.mint.call({ from: a.other, value: ONE_ETH });

        const tx = await bETH.mint({ from: a.other, value: ONE_ETH, gasPrice: 1 });
        const txFee = new BN(tx.receipt.gasUsed);

        expect(await balance.current(a.other)).to.be.bignumber.equal(
          ethBalBefore.sub(ONE_ETH).sub(txFee),
        );

        await expectRevert(
          bZRX.borrow(ONE_THOUSAND_ZRX, { from: a.other }),
          "AbsCToken: borrow-failed",
        );
      });
    });

    describe("BErc20.borrowOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.user5;
      const nonDelegatee = a.other;
      let avatar1: string;
      let avatar2: string;
      let avatar3: string;
      let avatar4: string;

      beforeEach(async () => {
        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit BAT
        await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
        avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user3 deposit ETH
        await bETH.mint({ from: a.user3, value: TEN_ETH });
        avatar3 = await bProtocol.registry.avatarOf(a.user3);

        // user4 deposit USDT
        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.user4 });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.user4 });
        avatar4 = await bProtocol.registry.avatarOf(a.user4);

        // delegate
        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
      });

      it("delegatee should borrow BAT on behalf of user", async () => {
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        const err = await bBAT.borrowOnAvatar.call(avatar1, ONE_BAT, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bBAT.borrowOnAvatar(avatar1, ONE_BAT, { from: delegatee });

        expect(await bBAT.borrowBalanceCurrent.call(delegator)).to.be.bignumber.equal(ONE_BAT);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_BAT);
      });

      it("delegatee should borrow ETH on behalf of user", async () => {
        const ethBalBefore = await balance.current(delegatee);

        const err = await bETH.borrowOnAvatar.call(avatar1, ONE_ETH, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        const tx = await bETH.borrowOnAvatar(avatar1, ONE_ETH, { from: delegatee, gasPrice: 1 });
        const txFee = new BN(tx.receipt.gasUsed);

        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          ethBalBefore.add(ONE_ETH).sub(txFee),
        );
      });

      it("delegatee should borrow USDT on behalf of user", async () => {
        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        await bUSDT.borrowOnAvatar(avatar1, ONE_USDT, { from: delegatee });

        expect(await bUSDT.borrowBalanceCurrent.call(delegator)).to.be.bignumber.equal(ONE_USDT);
        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_USDT);
      });

      it("delegatee tx should fail when user not have enough collateral", async () => {
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bBAT.borrowOnAvatar(avatar1, ONE_THOUSAND_BAT, { from: delegatee }),
          "AbsCToken: borrow-failed",
        );

        expect(await bBAT.borrowBalanceCurrent.call(delegator)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when non-delegatee try to borrow on behalf of user", async () => {
        expect(await BAT.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bBAT.borrowOnAvatar(avatar1, ONE_BAT, { from: nonDelegatee }),
          "BToken: delegatee-not-authorized",
        );

        expect(await bBAT.borrowBalanceCurrent.call(delegator)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
      });
    });

    //     // ERC20
    describe("BErc20.transfer()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      });

      it("should transfer cZRX to another user (not have an avatar)", async () => {
        let avatar2 = await bProtocol.registry.avatarOf(a.user2);
        expect(avatar2).to.be.equal(ZERO_ADDRESS);

        const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);

        await bZRX.transfer(a.user2, ONE_cZRX, { from: a.user1 });

        // avatar2 created
        avatar2 = await bProtocol.registry.avatarOf(a.user2);
        expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(
          user1_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("should transfer cZRX to another user (already have an avatar)", async () => {
        await bProtocol.registry.newAvatar({ from: a.user2 });
        const avatar2 = await bProtocol.registry.avatarOf(a.user2);
        expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

        const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);

        await bZRX.transfer(a.user2, ONE_cZRX, { from: a.user1 });

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(
          user1_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("should fail when transfer to user's own avatar", async () => {
        const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);

        await expectRevert(
          bZRX.transfer(avatar1, ONE_cZRX, { from: a.user1 }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
      });

      it("should fail when transfer to another user's avatar address", async () => {
        await bProtocol.registry.newAvatar({ from: a.user2 });
        const avatar2 = await bProtocol.registry.avatarOf(a.user2);
        expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

        const user1_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);
        expect(await cZRX.balanceOf(avatar2)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transfer(avatar2, ONE_cZRX, { from: a.user1 }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(user1_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.equal(ZERO);
        expect(await cZRX.balanceOf(avatar2)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.transferOnAvatar()", async () => {
      let delegator = a.user1;
      let delegatee = a.user2;
      let nonDelegatee = a.other;

      let delegator_expected_cZRX_Bal: BN;

      let avatar1: string;
      let avatar2: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: delegator });
        avatar1 = await bProtocol.registry.avatarOf(delegator);
        expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: delegatee });
        avatar2 = await bProtocol.registry.avatarOf(delegatee);
        expect(avatar2).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

        delegator_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
      });

      it("delegatee should transfer cTokens to user3 (not have an avatar) on behalf of delegator", async () => {
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        await bZRX.transferOnAvatar(avatar1, a.user3, ONE_cZRX, { from: delegatee });

        // avatar3 created
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);
        expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(
          delegator_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("delegatee should transfer cTokens to user3 (already have an avatar) on behalf of delegator", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);
        expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

        await bZRX.transferOnAvatar(avatar1, a.user3, ONE_cZRX, { from: delegatee });

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(
          delegator_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("delegatee tx should fail when try to transfer to delegator's own avatar", async () => {
        await expectRevert(
          bZRX.transferOnAvatar(avatar1, avatar1, ONE_cZRX, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
      });

      it("delegatee tx should fail when try to transfer to delegatess's own avatar", async () => {
        const delegateeAvatar = await bProtocol.registry.avatarOf(delegatee);
        await expectRevert(
          bZRX.transferOnAvatar(avatar1, delegateeAvatar, ONE_cZRX, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
      });

      it("delegatee tx should fail when transfer to user3's avatar address on behalf of delegator", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);
        expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

        await expectRevert(
          bZRX.transferOnAvatar(avatar1, avatar3, ONE_cZRX, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when non-delegatee try to transfer token", async () => {
        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferOnAvatar(avatar1, a.other, ONE_cZRX, { from: nonDelegatee }),
          "BToken: delegatee-not-authorized",
        );

        expect(await bZRX.balanceOf(delegator)).to.be.bignumber.equal(delegator_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
      });
    });
  });
});
