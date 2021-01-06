import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const MortalContract: b.MortalContract = artifacts.require("Mortal");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
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

    const ONE_ETH = new BN(10).pow(new BN(18));
    const HALF_ETH = ONE_ETH.div(new BN(2));
    const TEN_ETH = new BN(10).mul(ONE_ETH);
    const HUNDRED_ETH = new BN(100).mul(ONE_ETH);

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
    let cETH: b.CEtherInstance;

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
      cETH = await CEther.at(cETH_addr);

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);
      expect((await BAT.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

      await USDT.transfer(a.user1, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      await USDT.transfer(a.user2, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));
    });

    describe("BEther: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bETH.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bETH.cToken()).to.be.equal(cETH_addr);
      });
    });

    describe("BEther.mint()", async () => {
      it("user can mint cETH", async () => {
        await bETH.mint({ from: a.user1, value: ONE_ETH });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.mintOnAvatar()", async () => {
      it("delegatee can mint cETH on behalf of delegator", async () => {
        const delegator = a.user1;
        const delegatee = a.user2;

        await bProtocol.registry.newAvatar({ from: delegator });
        const avtOfDelegator = await bProtocol.registry.avatarOf(a.user1);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        await bETH.mintOnAvatar(avtOfDelegator, { from: delegatee, value: ONE_ETH });

        expect(await cETH.balanceOfUnderlying.call(avtOfDelegator)).to.be.bignumber.equal(ONE_ETH);
        expect(await bETH.balanceOfUnderlying.call(delegator)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.repayBorrow()", async () => {
      let avatar1: string;
      let avatar2: string;
      let avatar3: string;

      beforeEach(async () => {
        // user1 deposit ETH
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
      });

      it("user should repay some borrowed ETH", async () => {
        const user1EthBal = await balance.current(a.user1);
        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 0 });
        let borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal.add(ONE_ETH));
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        await bETH.repayBorrow({ from: a.user1, value: HALF_ETH, gasPrice: 0 });

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          user1EthBal.add(ONE_ETH).sub(HALF_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          TEN_ETH.sub(ONE_ETH).add(HALF_ETH),
        );

        borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(HALF_ETH);
      });

      it("user should repay all borrowed ETH", async () => {
        const user1EthBal = await balance.current(a.user1);
        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 0 });
        let borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal.add(ONE_ETH));
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        await bETH.repayBorrow({ from: a.user1, value: ONE_ETH, gasPrice: 0 });

        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });

      it("TODO: user should repay some borrowed ETH amount when topped up");

      it("TODO: user should repay all borrowed ETH when topped up");
    });

    describe("BEther.repayBorrowOnAvatar()", async () => {
      let delegator = a.user1;
      let delegatee = a.user4;

      let delegatorAvatar: string;
      let avatar2: string;
      let avatar3: string;

      beforeEach(async () => {
        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        delegatorAvatar = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit BAT
        await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
        avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user3 deposit ETH
        await bETH.mint({ from: a.user3, value: TEN_ETH });
        avatar3 = await bProtocol.registry.avatarOf(a.user3);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        expect(await bProtocol.registry.delegate(delegatorAvatar, delegatee)).to.be.equal(true);
      });

      it("delegatee should repay some borrowed ETH on behalf of delegator", async () => {
        const delegatorEthBal = await balance.current(delegator);
        const delegateeEthBal = await balance.current(delegatee);

        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBal);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        await bETH.borrow(ONE_ETH, { from: delegator, gasPrice: 0 });

        let borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        await bETH.repayBorrowOnAvatar(delegatorAvatar, {
          from: delegatee,
          value: HALF_ETH,
          gasPrice: 0,
        });

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBal.sub(HALF_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          TEN_ETH.sub(ONE_ETH).add(HALF_ETH),
        );

        borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(HALF_ETH);
      });

      it("delegatee should repay all borrowed ETH on behalf of delegator", async () => {
        const delegatorEthBal = await balance.current(delegator);
        const delegateeEthBal = await balance.current(delegatee);

        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBal);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        await bETH.borrow(ONE_ETH, { from: delegator, gasPrice: 0 });

        let borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        await bETH.repayBorrowOnAvatar(delegatorAvatar, {
          from: delegatee,
          value: ONE_ETH,
          gasPrice: 0,
        });

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBal.sub(ONE_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.liquidateBorrow()", async () => {
      it("TODO: after Pool tests are done");
    });

    // BToken
    describe("BEther.borrowBalanceCurrent()", async () => {
      it("TODO: as topup is require");
    });

    describe("BErc20.exchangeRateCurrent()", async () => {
      const expectedExchangeRate = new BN(2).mul(new BN(10).pow(new BN(27)));

      it("should get current exchange rate", async () => {
        const exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        expect(exchangeRateCurrentETH).to.be.bignumber.equal(expectedExchangeRate);
      });

      it("exchange rate should not change after mint", async () => {
        await bETH.exchangeRateCurrent();
        let exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        expect(exchangeRateCurrentETH).to.be.bignumber.equal(expectedExchangeRate);

        await bETH.mint({ from: a.user1, value: TEN_ETH });
        const expectedTotalSupply = TEN_ETH.mul(ONE_ETH).div(exchangeRateCurrentETH);
        expect(await bETH.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);

        await bETH.exchangeRateCurrent();
        exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        expect(exchangeRateCurrentETH).to.be.bignumber.equal(expectedExchangeRate);
      });

      it("exchange rate should change after borrow", async () => {
        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit ETH
        await bETH.mint({ from: a.user2, value: TEN_ETH });
        const avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user1 borrows ETH
        await bETH.borrow(ONE_ETH, { from: a.user1 });
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ONE_ETH);

        // advance time to 100 blocks
        // Somehow advanding block is not affecting exchangeRateCurrent
        const currBlock = await time.latestBlock();
        await time.advanceBlockTo(currBlock.add(new BN(100)));

        // Forcefully send ETH to cETH contract. This changes getCashPrior()
        const mortal = await MortalContract.new();
        await send.ether(a.deployer, mortal.address, TEN_ETH);
        await mortal.kill(cETH_addr);

        const exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        expect(exchangeRateCurrentETH).to.be.bignumber.not.equal(expectedExchangeRate);
      });
    });

    describe("BErc20.exchangeRateStored()", async () => {
      it("should get exchange rate stored", async () => {
        const expectedExchangeRate = new BN(2).mul(new BN(10).pow(new BN(27)));
        const expectedExchangeRateStored = expectedExchangeRate;

        let exchangeRateStored = await bBAT.exchangeRateStored();
        expect(expectedExchangeRateStored).to.be.bignumber.equal(exchangeRateStored);

        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit ETH
        await bETH.mint({ from: a.user2, value: TEN_ETH });
        const avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user1 borrows BAT
        await bETH.borrow(ONE_ETH, { from: a.user1 });
        await bETH.borrowBalanceCurrent(a.user1, { from: a.user1 });

        // advance time to 100 blocks
        // Somehow advanding block is not affecting exchangeRateCurrent
        const currBlock = await time.latestBlock();
        await time.advanceBlockTo(currBlock.add(new BN(100)));

        // Forcefully send ETH to cETH contract. This changes getCashPrior()
        const mortal = await MortalContract.new();
        await send.ether(a.deployer, mortal.address, TEN_ETH);
        await mortal.kill(cETH_addr);

        const exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        await bETH.exchangeRateCurrent();
        expect(exchangeRateCurrentETH).to.be.bignumber.not.equal(expectedExchangeRate);

        exchangeRateStored = await bETH.exchangeRateStored();
        expect(expectedExchangeRateStored).to.be.bignumber.not.equal(exchangeRateStored);
      });
    });

    describe("BEther.redeem()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        const userETH_BalBefore = await balance.current(a.user1);

        await bETH.mint({ from: a.user1, value: ONE_ETH, gasPrice: 0 });

        const userETH_BalAfterMint = await balance.current(a.user1);
        expect(userETH_BalAfterMint).to.be.bignumber.equal(userETH_BalBefore.sub(ONE_ETH));

        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ONE_ETH);
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(ONE_ETH);
      });

      it("user can redeem all cETH", async () => {
        const cTokensAmount = await cETH.balanceOf(avatar1);
        const err = await bETH.redeem.call(cTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        const userETH_BalBeforeRedeem = await balance.current(a.user1);
        await bETH.redeem(cTokensAmount, { from: a.user1, gasPrice: 0 });
        const userETH_BalAfterRedeem = await balance.current(a.user1);

        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(userETH_BalBeforeRedeem.add(ONE_ETH));

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(ZERO);
      });

      it("user can redeem some of his cETH", async () => {
        const cTokensAmount = await cETH.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));
        const err = await bETH.redeem.call(halfCTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        let userETH_BalBeforeRedeem = await balance.current(a.user1);
        await bETH.redeem(halfCTokensAmount, { from: a.user1, gasPrice: 0 });
        let userETH_BalAfterRedeem = await balance.current(a.user1);

        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(userETH_BalBeforeRedeem.add(HALF_ETH));

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(HALF_ETH);
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(HALF_ETH);

        userETH_BalBeforeRedeem = await balance.current(a.user1);
        await bETH.redeem(halfCTokensAmount, { from: a.user1, gasPrice: 0 });
        userETH_BalAfterRedeem = await balance.current(a.user1);

        expect(userETH_BalAfterRedeem).to.be.bignumber.equal(userETH_BalBeforeRedeem.add(HALF_ETH));

        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(ZERO);
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

        await bETH.redeemOnAvatar(avatar1, cTokensAmount, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(ONE_ETH),
        );
      });

      it("delegatee should redeem some cETH on behalf of user", async () => {
        let delegatorEthBalBeforeRedeem = await balance.current(delegator);
        let delegateeEthBalBeforeRedeem = await balance.current(delegatee);

        const cTokensAmount = await cETH.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));

        let err = await bETH.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemOnAvatar(avatar1, halfCTokensAmount, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(halfCTokensAmount);
        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(halfCTokensAmount);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(HALF_ETH),
        );

        delegatorEthBalBeforeRedeem = await balance.current(delegator);
        delegateeEthBalBeforeRedeem = await balance.current(delegatee);
        err = await bETH.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemOnAvatar(avatar1, halfCTokensAmount, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await cETH.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBalBeforeRedeem);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBalBeforeRedeem.add(HALF_ETH),
        );
      });
    });

    describe("BEther.redeemUnderlying()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await bETH.mint({ from: a.user1, value: HUNDRED_ETH });

        avatar1 = await bProtocol.registry.avatarOf(a.user1);
      });

      it("user should redeem all ETH underlying balance", async () => {
        const underlyingBalance = await bETH.balanceOfUnderlying.call(a.user1);
        const currentETHBalance = await balance.current(a.user1);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(currentETHBalance);

        const err = await bETH.redeemUnderlying.call(underlyingBalance, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlying(underlyingBalance, { from: a.user1, gasPrice: 0 });

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          currentETHBalance.add(HUNDRED_ETH),
        );
      });

      it("user should reedeem some ETH underlying balance", async () => {
        const underlyingBalance = await bETH.balanceOfUnderlying.call(a.user1);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));
        const currentETHBalance = await balance.current(a.user1);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(currentETHBalance);

        let err = await bETH.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlying(halfUnderlyingBal, { from: a.user1, gasPrice: 0 });

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          currentETHBalance.add(HUNDRED_ETH.div(new BN(2))),
        );

        err = await bETH.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlying(halfUnderlyingBal, { from: a.user1, gasPrice: 0 });

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          currentETHBalance.add(HUNDRED_ETH),
        );
      });
    });

    describe("BEther.redeemUnderlyingOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.user3;
      const nonDelegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await bETH.mint({ from: delegator, value: HUNDRED_ETH });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        avatar1 = await bProtocol.registry.avatarOf(delegator);
      });

      it("delegatee should redeem all underlying ETH balance on behalf of the delegator", async () => {
        const underlyingBalance = await bETH.balanceOfUnderlying.call(delegator);
        const delegateeETHBalance = await balance.current(delegatee);

        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeETHBalance);

        const err = await bETH.redeemUnderlyingOnAvatar.call(avatar1, underlyingBalance, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeETHBalance.add(HUNDRED_ETH),
        );
      });

      it("delegatee should reedeem some underlying ETH balance on behalf of the delegator", async () => {
        const underlyingBalance = await bETH.balanceOfUnderlying.call(delegator);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));

        const delegateeETHBalance = await balance.current(delegatee);

        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeETHBalance);

        let err = await bETH.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeETHBalance.add(HUNDRED_ETH.div(new BN(2))),
        );

        err = await bETH.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bETH.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, {
          from: delegatee,
          gasPrice: 0,
        });

        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeETHBalance.add(HUNDRED_ETH),
        );
      });

      it("should fail when a non-delegatee try to redeem ETH balance on behalf of user", async () => {
        const underlyingBalance = await bETH.balanceOfUnderlying.call(delegator);
        const nonDelegateeETHBalance = await balance.current(nonDelegatee);

        expect(await balance.current(nonDelegatee)).to.be.bignumber.equal(nonDelegateeETHBalance);

        await expectRevert(
          bETH.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: nonDelegatee }),
          "BToken: delegatee-not-authorized",
        );

        expect(await balance.current(nonDelegatee)).to.be.bignumber.equal(nonDelegateeETHBalance);
      });
    });
  });
});
