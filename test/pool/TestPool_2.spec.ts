import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { toWei } from "web3-utils";
import BN from "bn.js";
import { boolean } from "hardhat/internal/core/params/argumentTypes";
import { ONE } from "user-rating/test-utils/constants";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const FakePriceOracle: b.FakePriceOracleContract = artifacts.require("FakePriceOracle");

const chai = require("chai");
const expect = chai.expect;

const ONE_ETH = new BN(10).pow(new BN(18));
const HALF_ETH = ONE_ETH.div(new BN(2));
const TEN_ETH = ONE_ETH.mul(new BN(10));
const FIFTY_ETH = ONE_ETH.mul(new BN(50));
const HUNDRED_ETH = ONE_ETH.mul(new BN(100));
const ZERO = new BN(0);

const ETH_ADDR = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// SCALE
const SCALE = new BN(10).pow(new BN(18));

// Collateral Factor
const HUNDRED_PERCENT = SCALE;
const FIFTY_PERCENT = HUNDRED_PERCENT.div(new BN(2));

// USD
const USD_PER_ETH = new BN(100); // $100
const ONE_ETH_RATE_IN_SCALE = SCALE;
const ONE_USD_IN_SCALE = ONE_ETH_RATE_IN_SCALE.div(USD_PER_ETH);

// Time Units
const ONE_MINUTE = new BN(60);
const ONE_HOUR = new BN(60).mul(ONE_MINUTE);

contract("Pool", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;
  let pool: b.PoolInstance;
  let priceOracle: b.FakePriceOracleInstance;
  let jar: string;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
    jar = await pool.jar();
    priceOracle = bProtocol.compound.priceOracle;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("Pool", async () => {
    let liquidationIncentive: BN;
    let closeFactor: BN;
    let collateralFactorZRX: BN;
    let collateralFactorETH: BN;
    let collateralFactorBAT: BN;
    let holdingTime = new BN(5).mul(ONE_HOUR); // 5 hours

    let avatar1: b.AvatarInstance;
    let avatar2: b.AvatarInstance;
    let avatar3: b.AvatarInstance;
    let avatar4: b.AvatarInstance;

    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const TEN_ZRX = new BN(10).mul(ONE_ZRX);
    const FIFTY_ZRX = new BN(50).mul(ONE_ZRX);
    const ONE_HUNDRED_ZRX = new BN(100).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_THOUSAND_ZRX = new BN(5000).mul(ONE_ZRX);
    const TEN_THOUSAND_ZRX = new BN(10000).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const ONE_HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const FIFTY_BAT = new BN(50).mul(ONE_ZRX);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);
    const FIVE_THOUSAND_BAT = new BN(5000).mul(ONE_BAT);
    const TEN_THOUSAND_BAT = new BN(10000).mul(ONE_BAT);

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
    let cETH: b.CEtherInstance;

    async function initSetupCompound() {
      // SET ORACLE PRICE
      // =================
      // ETH price is Oracle is always set to 1e18, represents full 1 ETH rate
      // Assume ETH rate is $100, hence 1e18 represents $100 = 1 ETH rate
      // =>> 1 ETH rate in contract = 1e18, (represents $100)
      // Assume 1 ZRX rate is $1
      // =>> 1 ZRX rate in contract = 1e18 / 100 = 1e16, (represents $1)
      const ONE_ETH_RATE_IN_USD = USD_PER_ETH; // $100
      const ONE_ZRX_RATE_IN_USD = new BN(1); // $1
      const ONE_BAT_RATE_IN_USD = new BN(1); // $1

      // DIVISOR = 100 / 1 = 100
      const DIVISOR = ONE_ETH_RATE_IN_USD.div(ONE_ZRX_RATE_IN_USD);

      // PRICE_ONE_ZRX_IN_CONTRACT = 1e18 / 100 = 1e16
      const PRICE_ONE_ZRX_IN_CONTRACT = ONE_ETH_RATE_IN_SCALE.div(DIVISOR);

      await priceOracle.setPrice(cZRX_addr, PRICE_ONE_ZRX_IN_CONTRACT);
      // set the same $1 price for BAT
      await priceOracle.setPrice(cBAT_addr, PRICE_ONE_ZRX_IN_CONTRACT);

      expect(PRICE_ONE_ZRX_IN_CONTRACT).to.be.bignumber.equal(
        await priceOracle.getUnderlyingPrice(cZRX_addr),
      );
      // NOTICE: BAT rate same as ZRX = $1
      expect(PRICE_ONE_ZRX_IN_CONTRACT).to.be.bignumber.equal(
        await priceOracle.getUnderlyingPrice(cBAT_addr),
      );

      const ethPrice = await priceOracle.getUnderlyingPrice(cETH_addr);
      expect(ONE_ETH_RATE_IN_SCALE).to.be.bignumber.equal(ethPrice);

      // SET COLLATERAL FACTOR
      // =======================
      await comptroller._setCollateralFactor(cETH_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cZRX_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cBAT_addr, FIFTY_PERCENT);

      const ethMarket = await comptroller.markets(cETH_addr);
      collateralFactorETH = ethMarket[1];
      const zrxMarket = await comptroller.markets(cZRX_addr);
      collateralFactorZRX = zrxMarket[1];
      const batMarket = await comptroller.markets(cBAT_addr);
      collateralFactorBAT = batMarket[1];

      expect(collateralFactorETH).to.be.bignumber.equal(FIFTY_PERCENT);
      expect(collateralFactorZRX).to.be.bignumber.equal(FIFTY_PERCENT);
      expect(collateralFactorBAT).to.be.bignumber.equal(FIFTY_PERCENT);

      liquidationIncentive = await comptroller.liquidationIncentiveMantissa();
      const expectLiqIncentive = SCALE.mul(new BN(110)).div(new BN(100));
      expect(expectLiqIncentive).to.be.bignumber.equal(liquidationIncentive);

      closeFactor = await comptroller.closeFactorMantissa();
      const expectCloseFactor = SCALE.div(new BN(2)); // 50%
      expect(closeFactor).to.be.bignumber.equal(expectCloseFactor);
    }

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

      // CREATE AVATAR
      // ===============
      // Create Avatar for User1
      avatar1 = await engine.deployNewAvatar(a.user1);
      expect(avatar1.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User2
      avatar2 = await engine.deployNewAvatar(a.user2);
      expect(avatar2.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User3
      avatar3 = await engine.deployNewAvatar(a.user3);
      expect(avatar3.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User4
      avatar4 = await engine.deployNewAvatar(a.user4);
      expect(avatar4.address).to.be.not.equal(ZERO_ADDRESS);
    });

    describe("Pool.setMembers()", async () => {
      it("should have members set already by BEngine", async () => {
        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });

      it("should set members", async () => {
        const newMemebers = [a.dummy1, a.dummy2, a.dummy3, a.dummy4];
        const tx = await pool.setMembers(newMemebers, { from: a.deployer });
        expectEvent(tx, "MembersSet", { members: newMemebers });

        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.dummy1);
        expect(members[1]).to.be.equal(a.dummy2);
        expect(members[2]).to.be.equal(a.dummy3);
        expect(members[3]).to.be.equal(a.dummy4);
      });

      it("should fail when non-owner try to set members", async () => {
        const newMemebers = [a.dummy1, a.dummy2, a.dummy3, a.dummy4];
        await expectRevert(
          pool.setMembers(newMemebers, { from: a.other }),
          "Ownable: caller is not the owner",
        );

        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });
    });

    describe("Pool.deposit()", async () => {
      it("member should deposit ETH", async () => {
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);

        const tx = await pool.methods["deposit()"]({ from: a.member1, value: ONE_ETH });
        expectEvent(tx, "MemberDeposit", {
          member: a.member1,
          underlying: ETH_ADDR,
          amount: ONE_ETH,
        });

        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ONE_ETH);
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ONE_ETH);
      });

      it("each member can deposit ETH", async () => {
        const members = await pool.getMembers();
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

        let ethBalanceAtPool = new BN(0);
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ZERO);

          const tx = await pool.methods["deposit()"]({ from: member, value: ONE_ETH });
          expectEvent(tx, "MemberDeposit", {
            member: member,
            underlying: ETH_ADDR,
            amount: ONE_ETH,
          });

          expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ONE_ETH);
          ethBalanceAtPool = ethBalanceAtPool.add(ONE_ETH);
          expect(await balance.current(pool.address)).to.be.bignumber.equal(ethBalanceAtPool);
        }
      });

      it("should fail when non-member try to deposit ETH", async () => {
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          pool.methods["deposit()"]({ from: a.other, value: ONE_ETH }),
          "Pool: not-member",
        );

        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.deposit(underlying, amount)", async () => {
      it("member should deposit ZRX", async () => {
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: a.member1 });
        const tx = await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
          from: a.member1,
        });
        expectEvent(tx, "MemberDeposit", {
          member: a.member1,
          underlying: ZRX_addr,
          amount: ONE_THOUSAND_ZRX,
        });

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("each member can deposit ZRX", async () => {
        const members = await pool.getMembers();
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        let zrxBalanceAtPool = new BN(0);
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          expect(await pool.balance(member, ZRX_addr)).to.be.bignumber.equal(ZERO);

          await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: member });
          const tx = await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: member,
          });
          expectEvent(tx, "MemberDeposit", {
            member: member,
            underlying: ZRX_addr,
            amount: ONE_THOUSAND_ZRX,
          });

          expect(await pool.balance(member, ZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
          zrxBalanceAtPool = zrxBalanceAtPool.add(ONE_THOUSAND_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceAtPool);
        }
      });

      it("should fail when non-member try to deposit ZRX", async () => {
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: a.member1 });
        await expectRevert(
          pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: a.other,
          }),
          "Pool: not-member",
        );

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.withdraw()", async () => {
      let members: string[];

      beforeEach(async () => {
        members = await pool.getMembers();

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          // deposit ETH
          await pool.methods["deposit()"]({ from: member, value: ONE_ETH });

          // deposit ZRX
          await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: member });
          await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: member,
          });
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(
          ONE_ETH.mul(new BN(4)),
        );
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX.mul(new BN(4)),
        );
      });

      it("should withdraw ETH balance", async () => {
        let ethBalanceInPool = ONE_ETH.mul(new BN(4));
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const tx = await pool.withdraw(ETH_ADDR, ONE_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: ONE_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(ONE_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ETH balance partially", async () => {
        let ethBalanceInPool = ONE_ETH.mul(new BN(4));
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          let tx = await pool.withdraw(ETH_ADDR, HALF_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: HALF_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(HALF_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

          tx = await pool.withdraw(ETH_ADDR, HALF_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: HALF_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(HALF_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ZRX balance", async () => {
        let zrxBalanceInPool = ONE_THOUSAND_ZRX.mul(new BN(4));
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const tx = await pool.withdraw(ZRX_addr, ONE_THOUSAND_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: ONE_THOUSAND_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(ONE_THOUSAND_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);
        }

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ZRX balance partially", async () => {
        let zrxBalanceInPool = ONE_THOUSAND_ZRX.mul(new BN(4));
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          let tx = await pool.withdraw(ZRX_addr, FIVE_HUNDRED_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: FIVE_HUNDRED_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(FIVE_HUNDRED_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

          tx = await pool.withdraw(ZRX_addr, FIVE_HUNDRED_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: FIVE_HUNDRED_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(FIVE_HUNDRED_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);
        }

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.liquidateBorrow()", async () => {
      const pointOneETH = ONE_ETH.div(new BN(10));
      let shareNumerator: BN;
      let shareDenominator: BN;

      // user1 collateral 1 ETH = 1 * $100 = $100
      // user1 borrow 50 ZRX = 50 * $1 = $50
      async function reachLiquidateBorrow(shouldTopup: boolean = true) {
        // user1 borrowed ETH
        const user = a.user1;
        const avatar = avatar1;
        // member1 liquidating
        const member = a.member1;

        const oracle = await bProtocol.bComptroller.oracle();
        const priceOracle = await FakePriceOracle.at(oracle);
        // ETH rate always = 1e18
        expect(await priceOracle.getUnderlyingPrice(cETH_addr)).to.be.bignumber.equal(SCALE);
        // ZRX rate is = 1e16
        expect(await priceOracle.getUnderlyingPrice(cZRX_addr)).to.be.bignumber.equal(
          ONE_USD_IN_SCALE,
        );

        expect(await bETH.balanceOfUnderlying.call(user)).to.be.bignumber.equal(ONE_ETH);
        expect(await bZRX.borrowBalanceCurrent.call(user)).to.be.bignumber.equal(FIFTY_ZRX);

        expect(await avatar.canLiquidate.call()).to.be.equal(false);

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        expect(await priceOracle.getUnderlyingPrice(cZRX_addr)).to.be.bignumber.equal(NEW_RATE_ZRX);

        // After set price
        // user1 collateral 1 ETH = 1 * $100 = $100
        // user1 borrowed 50 ZRX = 50 * $1.1 = $55

        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(member, ZRX_addr)).to.be.bignumber.equal(ZERO);

        const expectedMaxLiquidationAmt = (await bZRX.borrowBalanceCurrent.call(user))
          .mul(closeFactor)
          .div(SCALE);
        const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cZRX_addr);

        expect(expectedMaxLiquidationAmt).to.be.bignumber.equal(maxLiquidationAmt);

        // member deposit maxLiquidationAmt to pool
        await ZRX.approve(pool.address, TEN_ZRX, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, TEN_ZRX, { from: member });
        // member topup
        if (shouldTopup) {
          await pool.topup(user, bZRX_addr, TEN_ZRX, false, { from: member });

          expect(await avatar.canLiquidate.call()).to.be.equal(true);
          expect(await pool.topupBalance(member, ZRX_addr)).to.be.bignumber.equal(TEN_ZRX);
          expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
          expect(await avatar.toppedUpCToken()).to.be.equal(cZRX_addr);
          expect(await avatar.isToppedUp()).to.be.equal(true);

          const result = await avatar.calcAmountToLiquidate.call(cZRX_addr, maxLiquidationAmt);
          const amtToDeductFromTopup = result[0];
          const amtToRepayOnCompound = result[1];

          expect(amtToDeductFromTopup).to.be.bignumber.equal(TEN_ZRX);
          expect(amtToRepayOnCompound).to.be.bignumber.equal(maxLiquidationAmt.sub(TEN_ZRX));
        }
      }

      beforeEach(async () => {
        await initSetupCompound();

        shareNumerator = await pool.shareNumerator();
        shareDenominator = await pool.shareDenominator();
        expect(shareNumerator).to.be.not.equal(ZERO);
        expect(shareDenominator).to.be.not.equal(ZERO);

        // Precondition Setup:
        // -------------------
        await ZRX.transfer(a.user2, ONE_HUNDRED_ZRX, { from: a.deployer });
        await BAT.transfer(a.user3, ONE_HUNDRED_BAT, { from: a.deployer });
        await pool.setMinSharingThreshold(bZRX_addr, new BN(1000).mul(ONE_ZRX), {
          from: a.deployer,
        });
        await pool.setMinSharingThreshold(bETH_addr, new BN(100).mul(ONE_ETH), {
          from: a.deployer,
        });

        // deposit
        // 1. User-1 mint cETH with ETH : $100
        await bETH.mint({ from: a.user1, value: ONE_ETH });

        // 2.1 User-2 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, ONE_HUNDRED_ZRX, { from: a.user2 });
        await bZRX.mint(ONE_HUNDRED_ZRX, { from: a.user2 });

        // 2.2 User-3 mint cBAT with BAT
        await BAT.approve(bBAT.address, ONE_HUNDRED_BAT, { from: a.user3 });
        await bBAT.mint(ONE_HUNDRED_BAT, { from: a.user3 });

        // borrow
        // 3.1 User1 borrow ZRX : $50
        await bZRX.borrow(FIFTY_ZRX, { from: a.user1 });

        // 3.2 User3 borrow ETH: $50
        await bETH.borrow(HALF_ETH, { from: a.user3 });
      });

      it("member should liquidation a user (borrowed ETH)", async () => {
        // user3 collateral 100 BAT = 100 * $1 = $100
        // user3 borrowed 0.5 ETH = 0.5 * $100 = $50

        // user3 borrowed ETH
        const user = a.user3;
        const avatar = avatar3;
        // member2 liquidating
        const member = a.member2;

        const oracle = await bProtocol.bComptroller.oracle();
        const priceOracle = await FakePriceOracle.at(oracle);
        // ETH rate always = 1e18
        expect(await priceOracle.getUnderlyingPrice(cETH_addr)).to.be.bignumber.equal(SCALE);
        // BAR rate is = 1e16
        expect(await priceOracle.getUnderlyingPrice(cBAT_addr)).to.be.bignumber.equal(
          ONE_USD_IN_SCALE,
        );

        expect(await bBAT.balanceOfUnderlying.call(user)).to.be.bignumber.equal(ONE_HUNDRED_BAT);
        expect(await bETH.borrowBalanceCurrent.call(user)).to.be.bignumber.equal(HALF_ETH);

        expect(await avatar.canLiquidate.call()).to.be.equal(false);
        expect(await avatar.isToppedUp()).to.be.equal(false);

        // Change ETH rate
        // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
        const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
        await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

        expect(await priceOracle.getUnderlyingPrice(cETH_addr)).to.be.bignumber.equal(NEW_RATE_ETH);

        // After set price
        // user3 collateral 100 BAT = 100 * $1 = $100
        // user3 borrowed 0.5 ETH = 0.5 * $110 = $55
        // toppedUp = 0.1 ETH = 0.1 * $110 = $11
        // currentBorrowAtCompound = $55 - $11 = $44
        // borrowAllowed = $100 * 50% = $50 - $44 = $6

        const expectedMaxLiquidationAmt = (await bETH.borrowBalanceCurrent.call(user))
          .mul(closeFactor)
          .div(SCALE);
        const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cETH_addr);

        expect(expectedMaxLiquidationAmt).to.be.bignumber.equal(maxLiquidationAmt);

        // member deposit maxLiquidationAmt to pool
        await pool.methods["deposit()"]({ from: member, value: pointOneETH });
        // member topup
        await pool.topup(user, bETH_addr, pointOneETH, false, { from: member });

        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(member, ETH_ADDR)).to.be.bignumber.equal(pointOneETH);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(pointOneETH);
        expect(await avatar.toppedUpCToken()).to.be.equal(cETH_addr);

        const result = await avatar.calcAmountToLiquidate.call(cETH_addr, maxLiquidationAmt);
        const amtToDeductFromTopup = result[0];
        const amtToRepayOnCompound = result[1];

        expect(amtToDeductFromTopup).to.be.bignumber.equal(pointOneETH);
        expect(amtToRepayOnCompound).to.be.bignumber.equal(maxLiquidationAmt.sub(pointOneETH));

        expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        await pool.methods["deposit()"]({ from: member, value: amtToRepayOnCompound });

        // Liquidate
        await pool.liquidateBorrow(user, bBAT_addr, bETH_addr, maxLiquidationAmt, { from: member });

        // validate
        // validate avatar storage
        expect(await avatar.canLiquidate.call()).to.be.equal(false);
        expect(await avatar.isToppedUp()).to.be.equal(false);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);

        // validate pool storage
        expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(member, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

        // validate balances
        // $100 collateral
        // $55 borrowed, hence $55 worth of BAT will be liquidated
        // 1 BAT = $1, hence 55 BAT = $55
        const batUnderlayingOpenForLiquidation = ONE_BAT.mul(new BN(55))
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const batUnderlyingLiquidated = batUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const batSizedTokens = batUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cBAT.exchangeRateCurrent.call());

        const memberShare = batSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = batSizedTokens.sub(memberShare);

        // member
        expect(await cBAT.balanceOf(member)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cBAT.balanceOf(jar)).to.be.bignumber.equal(jarShare);
        // pool
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("member should liquidation a user (borrowed ZRX)", async () => {
        const user = a.user1;
        const avatar = avatar1;
        const member = a.member1;

        await reachLiquidateBorrow();

        const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cZRX_addr);

        const result = await avatar.calcAmountToLiquidate.call(cZRX_addr, maxLiquidationAmt);
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];

        await ZRX.approve(pool.address, amtToRepayOnCompound, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, amtToRepayOnCompound, {
          from: member,
        });

        // Liquidate
        await pool.liquidateBorrow(user, bETH_addr, bZRX_addr, maxLiquidationAmt, { from: member });

        // validate
        // validate avatar storage
        expect(await avatar.canLiquidate.call()).to.be.equal(false);
        expect(await avatar.isToppedUp()).to.be.equal(false);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);

        // validate pool storage
        expect(await pool.balance(member, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(member, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        // validate balances
        // $100 collateral
        // $55 borrowed, hence $55 worth of ETH will be liquidated
        // 1 ETH = $100, hence $55 of ETH = 0.55
        // 0.01 * 55 = 0.55 ETH
        const zeroPointOneETH = ONE_ETH.div(new BN(100));
        const batUnderlayingOpenForLiquidation = zeroPointOneETH
          .mul(new BN(55))
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const batUnderlyingLiquidated = batUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const batSizedTokens = batUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cETH.exchangeRateCurrent.call());

        const memberShare = batSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = batSizedTokens.sub(memberShare);

        // member
        expect(await cETH.balanceOf(member)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cETH.balanceOf(jar)).to.be.bignumber.equal(jarShare);
        // pool
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when a non-member calls liquidateBorrow", async () => {
        const user = a.user1;
        const avatar = avatar1;
        const member = a.member1;

        await reachLiquidateBorrow();

        const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cZRX_addr);

        const result = await avatar.calcAmountToLiquidate.call(cZRX_addr, maxLiquidationAmt);
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];

        await ZRX.approve(pool.address, amtToRepayOnCompound, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, amtToRepayOnCompound, {
          from: member,
        });

        // Liquidate
        await expectRevert(
          pool.liquidateBorrow(user, bETH_addr, bZRX_addr, maxLiquidationAmt, { from: a.other }),
          "Pool: not-member",
        );
      });

      it("should fail when a member didn't toppedUp", async () => {
        const user = a.user1;
        const avatar = avatar1;
        // member4 did't topped up
        const member = a.member4;

        const shouldTopup = false;
        await reachLiquidateBorrow(shouldTopup);

        const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cZRX_addr);

        const result = await avatar.calcAmountToLiquidate.call(cZRX_addr, maxLiquidationAmt);
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];

        await ZRX.approve(pool.address, amtToRepayOnCompound, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, amtToRepayOnCompound, {
          from: member,
        });

        // Liquidate
        await expectRevert(
          pool.liquidateBorrow(user, bETH_addr, bZRX_addr, maxLiquidationAmt, { from: member }),
          "Pool: member-didnt-topup",
        );
      });

      it("should fail when amount is too big");
    });

    describe("Big Liquidation Pool.liquidateBorrow()", async () => {
      let shareNumerator: BN;
      let shareDenominator: BN;
      let minTopupBps: BN;

      beforeEach(async () => {
        await initSetupCompound();

        // user1 collateral ZRX
        // user2 collateral BAT
        // user1 borrow BAT

        shareNumerator = await pool.shareNumerator();
        shareDenominator = await pool.shareDenominator();
        minTopupBps = await pool.minTopupBps();
        expect(shareNumerator).to.be.not.equal(ZERO);
        expect(shareDenominator).to.be.not.equal(ZERO);

        // Precondition Setup:
        // -------------------
        await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });
        await BAT.transfer(a.user2, TEN_THOUSAND_BAT, { from: a.deployer });
        // await BAT.transfer(a.member1, FIVE_THOUSAND_BAT, { from: a.deployer });
        await pool.setMinSharingThreshold(bZRX_addr, new BN(500).mul(ONE_ZRX), {
          from: a.deployer,
        });
        await pool.setMinSharingThreshold(bETH_addr, new BN(500).mul(ONE_BAT), {
          from: a.deployer,
        });
        await pool.setMinSharingThreshold(bETH_addr, new BN(5).mul(ONE_ETH), {
          from: a.deployer,
        });
      });

      async function setup_ZRXCollateral_BorrowBAT() {
        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, TEN_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cBAT with BAT
        await BAT.approve(bBAT.address, TEN_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(TEN_THOUSAND_BAT, { from: a.user2 });

        // User1 borrow BAT
        await bBAT.borrow(FIVE_THOUSAND_BAT, { from: a.user1 });
      }

      async function setup_ZRXCollateral_BorrowETH() {
        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, TEN_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cETH with ETH
        await bETH.mint({ from: a.user2, value: HUNDRED_ETH });

        // User1 borrow ETH
        await bETH.borrow(FIFTY_ETH, { from: a.user1 });
      }

      it("should liquidate big loan with 1 member (ZRX Collateral, Borrow BAT)", async () => {
        // user1 borrowed BAT (ZRX collateral)
        await setup_ZRXCollateral_BorrowBAT();

        // Change BAT rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

        const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
        const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
        const expectedMaxTopup = debt.div(await pool.membersLength());
        expectDebtTopupInfo(debtTopupInfo, {
          expectedMinTopup: expectedMinTopup,
          expectedMaxTopup: expectedMaxTopup,
          expectedIsSmall: false,
        });

        // member deposit BAT
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // topup
        await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
        const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, debtToLiquidate);
        const amtToDeductFromTopup = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];

        // member deposit
        await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // liquidate
        await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, debtToLiquidate, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: ZERO,
          expectedAmountLiquidated: debtToLiquidate,
        });

        // validate cBAT balances
        // $10000 collateral (ZRX)
        // $5000 borrowed (BAT) at $1 rate
        // 5000 * $1.1 = $5500 at $1.1 rate
        // hence $5500 worth of ZRX will be liquidated
        // 1 ZRX = $1, hence $5500 worth of ZRX = 5500 ZRX
        const zrxToLiquidate = ONE_ZRX.mul(new BN(5500));
        const zrxUnderlayingOpenForLiquidation = zrxToLiquidate
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const zrxUnderlyingLiquidated = zrxUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const zrxSizedTokens = zrxUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cZRX.exchangeRateCurrent.call());

        const memberShare = zrxSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = zrxSizedTokens.sub(memberShare);

        // member
        expect(await cZRX.balanceOf(a.member1)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare);
        // pool
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should liquidate big loan with 1 member (ZRX Collateral, Borrow ETH)", async () => {
        // user1 borrowed ETH (ZRX collateral)
        await setup_ZRXCollateral_BorrowETH();

        expect(await priceOracle.getUnderlyingPrice(cETH_addr)).to.be.bignumber.equal(ONE_ETH);
        // Change ETH rate
        // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
        const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
        await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

        const debt = await bETH.borrowBalanceCurrent.call(a.user1);
        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
        const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
        const expectedMaxTopup = debt.div(await pool.membersLength());
        expectDebtTopupInfo(debtTopupInfo, {
          expectedMinTopup: expectedMinTopup,
          expectedMaxTopup: expectedMaxTopup,
          expectedIsSmall: false,
        });

        expect(expectedMinTopup).to.be.bignumber.not.equal(ZERO);
        // member deposit ETH
        await pool.methods["deposit()"]({
          from: a.member1,
          value: expectedMinTopup,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // topup
        await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
        const result = await avatar1.calcAmountToLiquidate.call(cETH_addr, debtToLiquidate);
        const amtToDeductFromTopup = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];

        // member deposit
        await pool.methods["deposit()"]({
          from: a.member1,
          value: amtToRepayOnCompound,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // extra validation to debug
        // $10000 collateral (10000 ZRX @ $1)
        // $5000 debt ETH (50 ETH @ $100)
        // newDebt = 50 * $110 = $5500
        // shortFall = $5500 - $5000 = $500
        const expectedShortFall = ONE_USD_IN_SCALE.mul(new BN(500));
        expect(debtToLiquidate).to.be.bignumber.not.equal(ZERO);
        const accLiquidity = await bComptroller.getAccountLiquidity(a.user1);
        expectAccountLiquidity(accLiquidity, {
          expectedErr: ZERO,
          expectedLiquidity: ZERO,
          expectedShortFall: expectedShortFall,
        });

        expect(await avatar1.isToppedUp()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);
        expect(await avatar1.canLiquidate.call()).to.be.equal(true);

        // liquidate
        await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidate, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: ZERO,
          expectedAmountLiquidated: debtToLiquidate,
        });

        // validate cZRX balances
        // $10000 collateral (10000 ZRX)
        // $5000 borrowed (50 ETH) at $100 rate
        // 50 ETH * $110 = $5500 (@ new rate)
        // hence $5500 worth of ZRX will be liquidated
        // 1 ZRX = $1, hence $5500 worth of ZRX = 5500 ZRX
        const zrxToLiquidate = ONE_ZRX.mul(new BN(5500));
        const zrxUnderlayingOpenForLiquidation = zrxToLiquidate
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const zrxUnderlyingLiquidated = zrxUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const zrxSizedTokens = zrxUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cZRX.exchangeRateCurrent.call());

        const memberShare = zrxSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = zrxSizedTokens.sub(memberShare);

        // member
        expect(await cZRX.balanceOf(a.member1)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare);
        // pool
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should liquidate big loan with 3 member (ZRX Collateral, Borrow BAT)", async () => {
        // user1 borrowed BAT (ZRX collateral)

        // Change BAT rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

        const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
        const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
        const expectedMaxTopup = debt.div(await pool.membersLength());
        expectDebtTopupInfo(debtTopupInfo, {
          expectedMinTopup: expectedMinTopup,
          expectedMaxTopup: expectedMaxTopup,
          expectedIsSmall: false,
        });

        // ### MEMBER - 1 ###
        // member1 deposit BAT
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // ### MEMBER - 2 ###
        // member2 deposit BAT
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member2 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member2,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(2)),
        );
        expect(await pool.topupBalance(a.member2, BAT_addr)).to.be.bignumber.equal(ZERO);

        // ### MEMBER - 3 ###
        // member3 deposit BAT
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member3 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member3,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(3)),
        );
        expect(await pool.topupBalance(a.member3, BAT_addr)).to.be.bignumber.equal(ZERO);

        // MEMBER - 1 Topup
        await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(2)),
        );
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        // MEMBER - 2 Topup
        await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member2,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member2, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member2);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        // MEMBER - 3 Topup
        await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member3,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member3, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member3);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        const numOfmemberToppedUp = new BN(3);
        const debtToLiquidatePerMember = (
          await avatar1.getMaxLiquidationAmount.call(cBAT_addr)
        ).div(numOfmemberToppedUp);

        const result = await avatar1.calcAmountToLiquidate.call(
          cBAT_addr,
          debtToLiquidatePerMember,
        );
        const amtToDeductFromTopup: BN = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound: BN = debtToLiquidatePerMember.sub(expectedMinTopup);

        // MEMBER - 1 deposit
        await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 2 deposit
        await BAT.approve(pool.address, amtToRepayOnCompound.add(ONE_BAT), { from: a.member2 });
        await pool.methods["deposit(address,uint256)"](
          BAT_addr,
          amtToRepayOnCompound.add(ONE_BAT),
          {
            from: a.member2,
          },
        );
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, BAT_addr)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_BAT),
        );
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.mul(new BN(2)).add(ONE_BAT),
        );
        expect(await pool.topupBalance(a.member2, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 3 deposit
        await BAT.approve(pool.address, amtToRepayOnCompound.add(ONE_BAT), { from: a.member3 });
        await pool.methods["deposit(address,uint256)"](
          BAT_addr,
          amtToRepayOnCompound.add(ONE_BAT),
          {
            from: a.member3,
          },
        );
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, BAT_addr)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_BAT),
        );
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.mul(new BN(3)).add(ONE_BAT).add(ONE_BAT),
        );
        expect(await pool.topupBalance(a.member3, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 1 Liquidate
        let topupBalanceBefore = await pool.topupBalance(a.member1, BAT_addr);
        await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, debtToLiquidatePerMember, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_BAT).mul(new BN(2)),
        );
        let expectedTopupBalance = topupBalanceBefore.sub(
          debtToLiquidatePerMember.sub(amtToRepayOnCompound),
        );
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedTopupBalance,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: expectedTopupBalance,
          expectedAmountLiquidated: debtToLiquidatePerMember,
        });

        // validate cBAT balances
        // $10000 collateral (ZRX)
        // $5000 borrowed (BAT) at $1 rate
        // 5000 * $1.1 = $5500 at $1.1 rate
        // hence $5500 worth of ZRX will be liquidated
        // 1 ZRX = $1, hence $5500 worth of ZRX = 5500 ZRX
        const zrxToLiquidate = ONE_ZRX.mul(new BN(5500)).div(new BN(3));
        const zrxUnderlayingOpenForLiquidation = zrxToLiquidate
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const zrxUnderlyingLiquidated = zrxUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const zrxSizedTokens = zrxUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cZRX.exchangeRateCurrent.call());
        const memberShare = zrxSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = zrxSizedTokens.sub(memberShare);
        // member
        expect(await cZRX.balanceOf(a.member1)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare);

        // MEMBER - 2 Liquidate
        topupBalanceBefore = await pool.topupBalance(a.member2, BAT_addr);

        await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, debtToLiquidatePerMember, {
          from: a.member2,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, BAT_addr)).to.be.bignumber.equal(ONE_BAT);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_BAT).add(ONE_BAT),
        );
        expectedTopupBalance = topupBalanceBefore.sub(
          debtToLiquidatePerMember.sub(amtToRepayOnCompound),
        );
        expect(await pool.topupBalance(a.member2, BAT_addr)).to.be.bignumber.below(ONE_BAT);
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member2);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: await pool.topupBalance(a.member2, BAT_addr),
          expectedAmountLiquidated: debtToLiquidatePerMember,
        });

        // member
        expect(await cZRX.balanceOf(a.member2)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare.mul(new BN(2)));

        // member3 liquidateBorrow
        await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, debtToLiquidatePerMember, {
          from: a.member3,
        });

        // member
        expect(await cZRX.balanceOf(a.member3)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare.mul(new BN(3)));
      });

      it("should liquidate big loan with 3 member (ZRX Collateral, Borrow ETH)", async () => {
        // user1 borrowed ETH (ZRX collateral)
        await setup_ZRXCollateral_BorrowETH();

        // Change ETH rate
        // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
        const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
        await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

        const debt = await bETH.borrowBalanceCurrent.call(a.user1);
        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
        const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
        const expectedMaxTopup = debt.div(await pool.membersLength());
        expectDebtTopupInfo(debtTopupInfo, {
          expectedMinTopup: expectedMinTopup,
          expectedMaxTopup: expectedMaxTopup,
          expectedIsSmall: false,
        });
        expect(expectedMinTopup).to.be.bignumber.not.equal(ZERO);

        // ### MEMBER - 1 ###
        // member1 deposit ETH
        await pool.methods["deposit()"]({
          from: a.member1,
          value: expectedMinTopup,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // ### MEMBER - 2 ###
        // member2 deposit ETH
        await pool.methods["deposit()"]({
          from: a.member2,
          value: expectedMinTopup,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(2)),
        );
        expect(await pool.topupBalance(a.member2, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // ### MEMBER - 3 ###
        // member3 deposit BAT
        await pool.methods["deposit()"]({
          from: a.member3,
          value: expectedMinTopup,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(3)),
        );
        expect(await pool.topupBalance(a.member3, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // MEMBER - 1 Topup
        await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          expectedMinTopup.mul(new BN(2)),
        );
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        // MEMBER - 2 Topup
        await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member2,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member2, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member2);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        // MEMBER - 3 Topup
        await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member3,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member3, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member3);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO, // zero as its a big loan
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        const numOfmemberToppedUp = new BN(3);
        const debtToLiquidatePerMember = (
          await avatar1.getMaxLiquidationAmount.call(cETH_addr)
        ).div(numOfmemberToppedUp);

        const result = await avatar1.calcAmountToLiquidate.call(
          cETH_addr,
          debtToLiquidatePerMember,
        );
        const amtToDeductFromTopup: BN = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound: BN = debtToLiquidatePerMember.sub(expectedMinTopup);

        // MEMBER - 1 deposit
        await pool.methods["deposit()"]({
          from: a.member1,
          value: amtToRepayOnCompound,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(amtToRepayOnCompound);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 2 deposit
        await pool.methods["deposit()"]({
          from: a.member2,
          value: amtToRepayOnCompound.add(ONE_ETH),
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, ETH_ADDR)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_ETH),
        );
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.mul(new BN(2)).add(ONE_ETH),
        );
        expect(await pool.topupBalance(a.member2, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 3 deposit
        await pool.methods["deposit()"]({
          from: a.member3,
          value: amtToRepayOnCompound.add(ONE_ETH),
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member3, ETH_ADDR)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_ETH),
        );
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.mul(new BN(3)).add(ONE_ETH).add(ONE_ETH),
        );
        expect(await pool.topupBalance(a.member3, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // MEMBER - 1 Liquidate
        let topupBalanceBefore = await pool.topupBalance(a.member1, ETH_ADDR);
        await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidatePerMember, {
          from: a.member1,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_BAT).mul(new BN(2)),
        );
        let expectedTopupBalance = topupBalanceBefore.sub(
          debtToLiquidatePerMember.sub(amtToRepayOnCompound),
        );
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedTopupBalance,
        );
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: expectedTopupBalance,
          expectedAmountLiquidated: debtToLiquidatePerMember,
        });

        // validate cZRX balances
        // $10000 collateral (10000 ZRX)
        // $5000 borrowed (50 ETH) at $100 rate
        // 50 * $110 = $5500
        // hence $5500 worth of ZRX will be liquidated
        // 1 ZRX = $1, hence $5500 worth of ZRX = 5500 ZRX
        const zrxToLiquidate = ONE_ZRX.mul(new BN(5500)).div(new BN(3));
        const zrxUnderlayingOpenForLiquidation = zrxToLiquidate
          .mul(liquidationIncentive)
          .div(ONE_ETH);
        const zrxUnderlyingLiquidated = zrxUnderlayingOpenForLiquidation
          .mul(closeFactor)
          .div(SCALE);
        const zrxSizedTokens = zrxUnderlyingLiquidated
          .mul(ONE_ETH)
          .div(await cZRX.exchangeRateCurrent.call());
        const memberShare = zrxSizedTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = zrxSizedTokens.sub(memberShare);
        // member
        expect(await cZRX.balanceOf(a.member1)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare);

        // MEMBER - 2 Liquidate
        topupBalanceBefore = await pool.topupBalance(a.member2, ETH_ADDR);

        await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidatePerMember, {
          from: a.member2,
        });
        // validate deposit & topup balance
        expect(await pool.balance(a.member2, ETH_ADDR)).to.be.bignumber.equal(ONE_ETH);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.add(ONE_ETH).add(ONE_ETH),
        );
        expectedTopupBalance = topupBalanceBefore.sub(
          debtToLiquidatePerMember.sub(amtToRepayOnCompound),
        );
        expect(await pool.topupBalance(a.member2, ETH_ADDR)).to.be.bignumber.below(ONE_ETH);
        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member2);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: await pool.topupBalance(a.member2, ETH_ADDR),
          expectedAmountLiquidated: debtToLiquidatePerMember,
        });

        // member
        expect(await cZRX.balanceOf(a.member2)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare.mul(new BN(2)));

        // member3 liquidateBorrow
        await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidatePerMember, {
          from: a.member3,
        });

        // member
        expect(await cZRX.balanceOf(a.member3)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cZRX.balanceOf(jar)).to.be.bignumber.equal(jarShare.mul(new BN(3)));
      });
    });

    describe("Pool.membersLength()", async () => {
      it("should get membersLength", async () => {
        expect(await pool.membersLength()).to.be.bignumber.equal(new BN(4));

        const newMembers = [a.dummy1, a.dummy2, a.dummy3];
        await pool.setMembers(newMembers);

        expect(await pool.membersLength()).to.be.bignumber.equal(new BN(3));
      });
    });

    describe("Pool.getMembers()", async () => {
      it("should get members list", async () => {
        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });

      it("should change members list after setMembers", async () => {
        let members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);

        const newMembers = [a.dummy1, a.dummy2, a.dummy3];
        await pool.setMembers(newMembers);

        members = await pool.getMembers();
        expect(members.length).to.be.equal(3);

        expect(members[0]).to.be.equal(a.dummy1);
        expect(members[1]).to.be.equal(a.dummy2);
        expect(members[2]).to.be.equal(a.dummy3);
      });
    });

    describe("Pool.getMemberTopupInfo()", async () => {
      it("should get member topup info");

      it("delete on topupInfo should delete memberInfo");
    });
  });
});

export function expectedLiquidity(
  accountLiquidity: [BN, BN, BN],
  param: {
    expectedErr: BN;
    expectedLiquidityAmt: BN;
    expectedShortFallAmt: BN;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("Err: " + accountLiquidity[0].toString());
    console.log("Liquidity: " + accountLiquidity[1].toString());
    console.log("ShortFall: " + accountLiquidity[2].toString());
  }

  expect(param.expectedErr, "Unexpected Err").to.be.bignumber.equal(accountLiquidity[0]);
  expect(param.expectedLiquidityAmt, "Unexpected Liquidity Amount").to.be.bignumber.equal(
    accountLiquidity[1],
  );
  expect(param.expectedShortFallAmt, "Unexpected ShortFall Amount").to.be.bignumber.equal(
    accountLiquidity[2],
  );
}

export function expectMemberTopupInfo(
  memberInfo: [BN, BN, BN],
  param: {
    expectedExpire: BN;
    expectedAmountTopped: BN;
    expectedAmountLiquidated: BN;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("expire: " + memberInfo[0].toString());
    console.log("amountTopped: " + memberInfo[1].toString());
    console.log("amountLiquidated: " + memberInfo[2].toString());
  }

  expect(param.expectedExpire, "Unexpected expire").to.be.bignumber.equal(memberInfo[0]);
  expect(param.expectedAmountTopped, "Unexpected amountTopped").to.be.bignumber.equal(
    memberInfo[1],
  );
  expect(param.expectedAmountLiquidated, "Unexpected amountLiquidated").to.be.bignumber.equal(
    memberInfo[2],
  );
}

export function expectDebtTopupInfo(
  debtTopupInfo: [BN, BN, boolean],
  param: {
    expectedMinTopup: BN;
    expectedMaxTopup: BN;
    expectedIsSmall: boolean;
  },
  debug: boolean = false,
) {
  const minTopup = debtTopupInfo["minTopup"];
  const maxTopup = debtTopupInfo["maxTopup"];
  const isSmall = debtTopupInfo["isSmall"];
  if (debug) {
    console.log("minTopup: " + minTopup);
    console.log("maxTopup: " + maxTopup);
    console.log("isSmall: " + isSmall);
  }

  expect(param.expectedMinTopup, "Unexpected minTopup").to.be.bignumber.equal(minTopup);
  expect(param.expectedMaxTopup, "Unexpected maxTopup").to.be.bignumber.equal(maxTopup);
  expect(param.expectedIsSmall, "Unexpected isSmall").to.be.equal(isSmall);
}

export function expectAccountLiquidity(
  accLiquidity: [BN, BN, BN],
  param: {
    expectedErr: BN;
    expectedLiquidity: BN;
    expectedShortFall: BN;
  },
  debug: boolean = false,
) {
  const err: BN = accLiquidity["err"];
  const liquidity: BN = accLiquidity["liquidity"];
  const shortFall: BN = accLiquidity["shortFall"];
  if (debug) {
    console.log("err: " + err);
    console.log("liquidity: " + liquidity);
    console.log("shortFall: " + shortFall);
  }

  expect(param.expectedErr, "Unexpected err").to.be.bignumber.equal(err);
  expect(param.expectedLiquidity, "Unexpected liquidity").to.be.bignumber.equal(liquidity);
  expect(param.expectedShortFall, "Unexpected shortFall").to.be.bignumber.equal(shortFall);
}
