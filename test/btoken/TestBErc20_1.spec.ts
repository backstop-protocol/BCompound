import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");

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

      await USDT.transfer(a.user1, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      await USDT.transfer(a.user2, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));
    });

    describe("BErc20: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bZRX.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bZRX.cToken()).to.be.equal(cZRX_addr);
        expect(await bZRX.underlying()).to.be.equal(ZRX_addr);
      });
    });

    describe("BErc20.mint()", async () => {
      it("user should mint cZRX", async () => {
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
        expect(await bZRX.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });

      it("user should mint cUSDT", async () => {
        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.user1 });
        const err = await bUSDT.mint.call(ONE_THOUSAND_USDT, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.user1 });

        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
        expect(await USDT.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(cUSDT_addr)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_USDT,
        );
      });
    });

    describe("BErc20.mintOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.user2;
      const nonDelegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: delegator });
        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("delegatee can mint cZRX on behalf of user", async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegatee });
        const err = await bZRX.mintOnAvatar.call(avatar1, ONE_THOUSAND_ZRX, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.mintOnAvatar(avatar1, ONE_THOUSAND_ZRX, { from: delegatee });

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });

      it("delegatee can mint cUSDT on behalf of user", async () => {
        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: delegatee });
        const err = await bUSDT.mintOnAvatar.call(avatar1, ONE_THOUSAND_USDT, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);

        await bUSDT.mintOnAvatar(avatar1, ONE_THOUSAND_USDT, { from: delegatee });

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_USDT,
        );
      });

      it("should fail when non-delegatee try to mint on behalf of user", async () => {
        await ZRX.transfer(nonDelegatee, ONE_THOUSAND_ZRX, { from: a.deployer });
        expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: nonDelegatee });
        await expectRevert(
          bZRX.mintOnAvatar(avatar1, ONE_THOUSAND_ZRX, {
            from: nonDelegatee,
          }),
          "BToken: delegatee-not-authorized",
        );

        expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });
    });

    describe("BErc20.repayBorrow()", async () => {
      let avatar1: string;
      let avatar2: string;
      let avatar3: string;

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
      });

      it("user should repay some borrowed ERC20 tokens", async () => {
        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        await bBAT.borrow(HUNDRED_BAT, { from: a.user1 });
        let borrowBal = await bBAT.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT);

        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT),
        );

        await BAT.approve(bBAT_addr, ONE_BAT, { from: a.user1 });
        const result = await bBAT.repayBorrow.call(ONE_BAT, { from: a.user1 });
        expect(result).to.be.bignumber.equal(ZERO);
        await bBAT.repayBorrow(ONE_BAT, { from: a.user1 });

        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(HUNDRED_BAT.sub(ONE_BAT));
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT).add(ONE_BAT),
        );

        borrowBal = await bBAT.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT.sub(ONE_BAT));
      });

      it("user should repay all amount", async () => {
        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        await bBAT.borrow(HUNDRED_BAT, { from: a.user1 });
        let borrowBal = await bBAT.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT);

        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT),
        );

        await BAT.approve(bBAT_addr, HUNDRED_BAT, { from: a.user1 });
        const result = await bBAT.repayBorrow.call(HUNDRED_BAT, { from: a.user1 });
        expect(result).to.be.bignumber.equal(ZERO);
        await bBAT.repayBorrow(HUNDRED_BAT, { from: a.user1 });

        expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        borrowBal = await bBAT.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });

      it("user should repay some borrowed ETH", async () => {
        const user1EthBal = await balance.current(a.user1);
        expect(await balance.current(a.user1)).to.be.bignumber.equal(user1EthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        let tx = await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 1 });
        const txFee1 = new BN(tx.receipt.gasUsed);
        let borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          user1EthBal.sub(txFee1).add(ONE_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        tx = await bETH.repayBorrow({ from: a.user1, value: HALF_ETH, gasPrice: 1 });
        const txFee2 = new BN(tx.receipt.gasUsed);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          user1EthBal.sub(txFee1).add(ONE_ETH).sub(txFee2).sub(HALF_ETH),
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

        let tx = await bETH.borrow(ONE_ETH, { from: a.user1, gasPrice: 1 });
        const txFee1 = new BN(tx.receipt.gasUsed);
        let borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          user1EthBal.sub(txFee1).add(ONE_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        tx = await bETH.repayBorrow({ from: a.user1, value: ONE_ETH, gasPrice: 1 });
        const txFee2 = new BN(tx.receipt.gasUsed);

        expect(await balance.current(a.user1)).to.be.bignumber.equal(
          user1EthBal.sub(txFee1).sub(txFee2),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        borrowBal = await bETH.borrowBalanceCurrent.call(a.user1);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });

      it("TODO: user should repay some amount when topped up");

      it("TODO: user should repay all when topped up");
    });

    describe("BErc20.repayBorrowOnAvatar()", async () => {
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

      it("delegatee should repay some borrowed ERC20 tokens on behalf of delegator", async () => {
        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        await bBAT.borrow(HUNDRED_BAT, { from: delegator });
        let borrowBal = await bBAT.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT);

        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT),
        );

        // transfer some BAT to delegatee
        await BAT.transfer(delegatee, ONE_BAT, { from: a.deployer });

        await BAT.approve(bBAT_addr, ONE_BAT, { from: delegatee });
        const result = await bBAT.repayBorrowOnAvatar.call(delegatorAvatar, ONE_BAT, {
          from: delegatee,
        });
        expect(result).to.be.bignumber.equal(ZERO);
        await bBAT.repayBorrowOnAvatar(delegatorAvatar, ONE_BAT, { from: delegatee });

        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT).add(ONE_BAT),
        );

        borrowBal = await bBAT.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT.sub(ONE_BAT));
      });

      it("delegatee should repay all amount on behalf of delegator", async () => {
        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        await bBAT.borrow(HUNDRED_BAT, { from: delegator });
        let borrowBal = await bBAT.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(HUNDRED_BAT);

        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT.sub(HUNDRED_BAT),
        );

        // transfer some BAT to delegatee
        await BAT.transfer(delegatee, HUNDRED_BAT, { from: a.deployer });

        await BAT.approve(bBAT_addr, HUNDRED_BAT, { from: delegatee });
        const result = await bBAT.repayBorrowOnAvatar.call(delegatorAvatar, HUNDRED_BAT, {
          from: delegatee,
        });
        expect(result).to.be.bignumber.equal(ZERO);
        await bBAT.repayBorrowOnAvatar(delegatorAvatar, HUNDRED_BAT, { from: delegatee });

        expect(await BAT.balanceOf(delegator)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await BAT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(cBAT_addr)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

        borrowBal = await bBAT.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });

      it("delegatee should repay some borrowed ETH on behalf of delegator", async () => {
        const delegatorEthBal = await balance.current(delegator);
        const delegateeEthBal = await balance.current(delegatee);

        expect(await balance.current(delegator)).to.be.bignumber.equal(delegatorEthBal);
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        let tx = await bETH.borrow(ONE_ETH, { from: delegator, gasPrice: 1 });
        const delegatorTxFee = new BN(tx.receipt.gasUsed);

        let borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH).sub(delegatorTxFee),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        tx = await bETH.repayBorrowOnAvatar(delegatorAvatar, {
          from: delegatee,
          value: HALF_ETH,
          gasPrice: 1,
        });
        const delegateeTxFee = new BN(tx.receipt.gasUsed);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH).sub(delegatorTxFee),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBal.sub(delegateeTxFee).sub(HALF_ETH),
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

        let tx = await bETH.borrow(ONE_ETH, { from: delegator, gasPrice: 1 });
        const delegatorTxFee = new BN(tx.receipt.gasUsed);

        let borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ONE_ETH);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH).sub(delegatorTxFee),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(delegateeEthBal);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH.sub(ONE_ETH));

        tx = await bETH.repayBorrowOnAvatar(delegatorAvatar, {
          from: delegatee,
          value: ONE_ETH,
          gasPrice: 1,
        });
        const delegateeTxFee = new BN(tx.receipt.gasUsed);

        expect(await balance.current(delegator)).to.be.bignumber.equal(
          delegatorEthBal.add(ONE_ETH).sub(delegatorTxFee),
        );
        expect(await balance.current(delegatee)).to.be.bignumber.equal(
          delegateeEthBal.sub(delegateeTxFee).sub(ONE_ETH),
        );
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(TEN_ETH);

        borrowBal = await bETH.borrowBalanceCurrent.call(delegator);
        expect(borrowBal).to.be.bignumber.equal(ZERO);
      });

      it("TODO: delegatee should repay some amount when topped up on behalf of delegator");

      it("TODO: delegatee should repay all amount when topped up on behalf of delegator");
    });

    describe("BErc20.liquidateBorrow()", async () => {
      it("TODO: after Pool tests are done");
    });

    describe("BErc20.borrowBalanceCurrent()", async () => {
      it("TODO: as topup is require");
    });

    // TODO: exchangeRateCurrent() always returning 2 * 10^27, need to check
    describe("BErc20.exchangeRateCurrent()", async () => {
      it("should get current exchange rate", async () => {
        const expectedExchangeRate = new BN(2).mul(new BN(10).pow(new BN(27)));

        const exchangeRateCurrentZRX = await bZRX.exchangeRateCurrent.call();
        expect(exchangeRateCurrentZRX).to.be.bignumber.equal(expectedExchangeRate);

        const exchangeRateCurrentBAT = await bBAT.exchangeRateCurrent.call();
        expect(exchangeRateCurrentBAT).to.be.bignumber.equal(expectedExchangeRate);

        const exchangeRateCurrentUSDT = await bUSDT.exchangeRateCurrent.call();
        expect(exchangeRateCurrentUSDT).to.be.bignumber.equal(
          new BN(2).mul(new BN(10).pow(new BN(27 - 12))),
        );

        const exchangeRateCurrentETH = await bETH.exchangeRateCurrent.call();
        expect(exchangeRateCurrentETH).to.be.bignumber.equal(expectedExchangeRate);
      });

      it("exchange rate should not change after mint", async () => {
        const expectedExchangeRate = new BN(2).mul(new BN(10).pow(new BN(27)));
        await bZRX.exchangeRateCurrent();
        let exchangeRateCurrentZRX = await bZRX.exchangeRateCurrent.call();
        expect(exchangeRateCurrentZRX).to.be.bignumber.equal(expectedExchangeRate);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        const expectedTotalSupply = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(exchangeRateCurrentZRX);
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);

        await bZRX.exchangeRateCurrent();
        exchangeRateCurrentZRX = await bZRX.exchangeRateCurrent.call();
        expect(exchangeRateCurrentZRX).to.be.bignumber.equal(expectedExchangeRate);
      });

      it("exchange rate should change after borrow", async () => {
        // user1 deposit ZRX
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);

        // user2 deposit BAT
        await BAT.approve(bBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });
        const avatar2 = await bProtocol.registry.avatarOf(a.user2);

        // user1 borrows BAT
        await bBAT.borrow(ONE_BAT, { from: a.user1 });

        // TODO
      });
    });

    // TODO: after exchangeRateCurent() issue is fixed
    describe("BErc20.exchangeRateStored()", async () => {
      it("");
    });

    describe("BErc20.redeem()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const userZRX_BalAfterMint = await ZRX.balanceOf(a.user1);
        expect(userZRX_BalAfterMint).to.be.bignumber.equal(ZERO);

        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.user1 });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.user1 });

        const userUSDT_BalAfterMint = await USDT.balanceOf(a.user1);
        expect(userUSDT_BalAfterMint).to.be.bignumber.equal(ZERO);

        avatar1 = await bProtocol.registry.avatarOf(a.user1);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_USDT,
        );
      });

      it("user can redeem all cZRX", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        expect(cTokensAmount).to.be.bignumber.not.equal(ZERO);

        const err = await bZRX.redeem.call(cTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeem(cTokensAmount, { from: a.user1 });

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

        const userZRX_BalAfter = await ZRX.balanceOf(a.user1);
        expect(userZRX_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("user can redeem some of his cZRX", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        expect(cTokensAmount).to.be.bignumber.not.equal(ZERO);
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

      it("user can redeem all cUSDT", async () => {
        const cTokensAmount = await cUSDT.balanceOf(avatar1);
        expect(cTokensAmount).to.be.bignumber.not.equal(ZERO);
        const err = await bUSDT.redeem.call(cTokensAmount, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeem(cTokensAmount, { from: a.user1 });

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

        const userUSDT_BalAfter = await USDT.balanceOf(a.user1);
        expect(userUSDT_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("user can redeem some of his cUSDT", async () => {
        const cTokensAmount = await cUSDT.balanceOf(avatar1);
        expect(cTokensAmount).to.be.bignumber.not.equal(ZERO);
        const half_cTokens = cTokensAmount.div(new BN(2));
        const err = await bUSDT.redeem.call(half_cTokens, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        await bUSDT.redeem(half_cTokens, { from: a.user1 });

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_USDT.div(new BN(2)),
        );

        await bUSDT.redeem(half_cTokens, { from: a.user1 });

        expect(await cUSDT.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ZERO);

        const userUSDT_BalAfter = await USDT.balanceOf(a.user1);
        expect(userUSDT_BalAfter).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });
    });

    describe("BErc20.redeemOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.user3;
      const nonDelegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: delegator });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: delegator });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        avatar1 = await bProtocol.registry.avatarOf(delegator);
        expect(await bProtocol.registry.delegate(avatar1, delegatee)).to.be.equal(true);
      });

      it("delegatee should redeem cZRX on behalf of user", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        const err = await bZRX.redeemOnAvatar.call(avatar1, cTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.redeemOnAvatar(avatar1, cTokensAmount, { from: delegatee });

        expect(await cZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("delegatee should redeem some cZRX on behalf of user", async () => {
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

      it("delegatee should redeem cUSDT on behalf of user", async () => {
        const cTokensAmount = await cUSDT.balanceOf(avatar1);
        const err = await bUSDT.redeemOnAvatar.call(avatar1, cTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);

        await bUSDT.redeemOnAvatar(avatar1, cTokensAmount, { from: delegatee });

        expect(await cUSDT.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("delegatee should redeem some cUSDT on behalf of user", async () => {
        const cTokensAmount = await cUSDT.balanceOf(avatar1);
        const halfCTokensAmount = cTokensAmount.div(new BN(2));

        let err = await bUSDT.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

        expect(await cUSDT.balanceOf(avatar1)).to.be.bignumber.equal(halfCTokensAmount);
        expect(await USDT.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(FIVE_HUNDRED_USDT);

        err = await bUSDT.redeemOnAvatar.call(avatar1, halfCTokensAmount, { from: delegatee });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemOnAvatar(avatar1, halfCTokensAmount, { from: delegatee });

        expect(await cUSDT.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(delegator)).to.be.bignumber.equal(ZERO);
        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("should fail when non-delegatee redeem on behalf of user", async () => {
        const cTokensAmount = await cZRX.balanceOf(avatar1);
        await expectRevert(
          bZRX.redeemOnAvatar(avatar1, cTokensAmount, { from: nonDelegatee }),
          "BToken: delegatee-not-authorized",
        );
      });
    });

    describe("BErc20.redeemUnderlying()", async () => {
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: a.user1 });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: a.user1 });

        avatar1 = await bProtocol.registry.avatarOf(a.user1);
      });

      it("user should redeem all ZRX underlying tokens", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(a.user1);

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        const err = await bZRX.redeemUnderlying.call(underlyingBalance, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlying(underlyingBalance, { from: a.user1 });

        expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("user should reedeem some ZRX underlying tokens", async () => {
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

      it("user should redeem all USDT underlying tokens", async () => {
        const underlyingBalance = await bUSDT.balanceOfUnderlying.call(a.user1);

        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        const err = await bUSDT.redeemUnderlying.call(underlyingBalance, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlying(underlyingBalance, { from: a.user1 });

        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("user should reedeem some USDT underlying tokens", async () => {
        const underlyingBalance = await bUSDT.balanceOfUnderlying.call(a.user1);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));

        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        let err = await bUSDT.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

        err = await bUSDT.redeemUnderlying.call(halfUnderlyingBal, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlying(halfUnderlyingBal, { from: a.user1 });

        expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });
    });

    describe("BErc20.redeemUnderlyingOnAvatar()", async () => {
      const delegator = a.user1;
      const delegatee = a.user3;
      const nonDelegatee = a.other;
      let avatar1: string;

      beforeEach(async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegator });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: delegator });

        await USDT.approve(bUSDT_addr, ONE_THOUSAND_USDT, { from: delegator });
        await bUSDT.mint(ONE_THOUSAND_USDT, { from: delegator });

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        avatar1 = await bProtocol.registry.avatarOf(delegator);
      });

      it("delegatee should redeem all underlying ZRX tokens on behalf of the user", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        const err = await bZRX.redeemUnderlyingOnAvatar.call(avatar1, underlyingBalance, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bZRX.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: delegatee });

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("delegatee should reedeem some underlying ZRX tokens on behalf of the user", async () => {
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

      it("delegatee should redeem all underlying USDT tokens on behalf of the user", async () => {
        const underlyingBalance = await bUSDT.balanceOfUnderlying.call(delegator);

        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        const err = await bUSDT.redeemUnderlyingOnAvatar.call(avatar1, underlyingBalance, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: delegatee });

        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("delegatee should reedeem some underlying USDT tokens on behalf of the user", async () => {
        const underlyingBalance = await bUSDT.balanceOfUnderlying.call(delegator);
        const halfUnderlyingBal = underlyingBalance.div(new BN(2));

        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ZERO);

        let err = await bUSDT.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

        err = await bUSDT.redeemUnderlyingOnAvatar.call(avatar1, halfUnderlyingBal, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);
        await bUSDT.redeemUnderlyingOnAvatar(avatar1, halfUnderlyingBal, { from: delegatee });

        expect(await USDT.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_USDT);
      });

      it("should fail when a non-delegatee try to redeem tokens on behalf of user", async () => {
        const underlyingBalance = await bZRX.balanceOfUnderlying.call(delegator);

        expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.redeemUnderlyingOnAvatar(avatar1, underlyingBalance, { from: nonDelegatee }),
          "BToken: delegatee-not-authorized",
        );

        expect(await ZRX.balanceOf(nonDelegatee)).to.be.bignumber.equal(ZERO);
      });
    });
  });
});
