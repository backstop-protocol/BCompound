import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { toWei } from "web3-utils";
import BN from "bn.js";
import { boolean } from "hardhat/internal/core/params/argumentTypes";
import { ONE, TEN } from "user-rating/test-utils/constants";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const chai = require("chai");
const expect = chai.expect;

const ONE_ETH = new BN(10).pow(new BN(18));
const HALF_ETH = ONE_ETH.div(new BN(2));
const TEN_ETH = ONE_ETH.mul(new BN(10));
const TWENTY_ETH = ONE_ETH.mul(new BN(20));
const ONE_HUNDRED_ETH = ONE_ETH.mul(new BN(100));
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
  let registry: b.RegistryInstance;

  let liquidationIncentive: BN;
  let closeFactor: BN;
  let collateralFactorZRX: BN;
  let collateralFactorETH: BN;
  let holdingTime = new BN(5).mul(ONE_HOUR); // 5 hours

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
    priceOracle = bProtocol.compound.priceOracle;
    registry = bProtocol.registry;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("Pool", async () => {
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

    const ONE_BAT = new BN(10).pow(new BN(18));
    const FIFTY_BAT = new BN(50).mul(ONE_BAT);
    const ONE_HUNDRED_BAT = new BN(100).mul(ONE_BAT);
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

      // DIVISOR = 100 / 1 = 100
      const DIVISOR = ONE_ETH_RATE_IN_USD.div(ONE_ZRX_RATE_IN_USD);

      // PRICE_ONE_ZRX_IN_CONTRACT = 1e18 / 100 = 1e16
      const PRICE_ONE_ZRX_IN_CONTRACT = ONE_ETH_RATE_IN_SCALE.div(DIVISOR);

      await priceOracle.setPrice(cZRX_addr, PRICE_ONE_ZRX_IN_CONTRACT);

      expect(PRICE_ONE_ZRX_IN_CONTRACT).to.be.bignumber.equal(
        await priceOracle.getUnderlyingPrice(cZRX_addr),
      );

      const ethPrice = await priceOracle.getUnderlyingPrice(cETH_addr);
      expect(ONE_ETH_RATE_IN_SCALE).to.be.bignumber.equal(ethPrice);

      // SET COLLATERAL FACTOR
      // =======================
      await comptroller._setCollateralFactor(cETH_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cZRX_addr, FIFTY_PERCENT);

      const ethMarket = await comptroller.markets(cETH_addr);
      collateralFactorETH = ethMarket[1];
      const zrxMarket = await comptroller.markets(cZRX_addr);
      collateralFactorZRX = zrxMarket[1];

      expect(collateralFactorETH).to.be.bignumber.equal(FIFTY_PERCENT);
      expect(collateralFactorZRX).to.be.bignumber.equal(FIFTY_PERCENT);

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

    describe("Pool.getDebtTopupInfo()", async () => {
      beforeEach(async () => {
        // user has debt position
      });

      it("should get minDebt and isSmall of user's debt");

      it("should get isSmall=true when debt below minSharingThreshold");

      it("should get isSmall=false when debt above or equal minSharingThreshold");
    });

    describe("Pool.untop()", async () => {
      beforeEach(async () => {
        await initSetupCompound();

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

        // 5. Member1 deposits 10 ZRX to pool
        await ZRX.approve(pool.address, TEN_ZRX, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: a.member1 });

        // 5. Member2 deposits 0.1 ETH to pool
        await pool.methods["deposit()"]({ from: a.member2, value: ONE_ETH.div(new BN(10)) });
      });

      it("member should untop an avatar", async () => {
        const member = a.member1;
        const user = a.user1;
        const avatar = avatar1;
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfZRXAtCToken = await ZRX.balanceOf(cZRX_addr);
        const balOfZRXAtPool = await ZRX.balanceOf(pool.address);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(new BN(TEN_ZRX)),
        );

        // member1 untop
        await pool.untop(user, toppedUpZRX, { from: member });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(balOfZRXAtPool);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(balanceOfZRXAtCToken);
      });

      it("member should untop an avatar (ETH)", async () => {
        const member = a.member2;
        const user = a.user3;
        const avatar = avatar3;
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfETHAtCToken = await balance.current(cETH_addr);
        const balOfETHAtPool = await balance.current(pool.address);

        // member2 topped up
        const pointOneETH = ONE_ETH.div(new BN(10));
        const toppedUpETH = pointOneETH; // 0.1 ETH
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member });
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          balOfETHAtPool.sub(pointOneETH),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(pointOneETH);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          balanceOfETHAtCToken.add(pointOneETH),
        );

        // member2 untop
        await pool.untop(user, toppedUpETH, { from: member });
        expect(await balance.current(pool.address)).to.be.bignumber.equal(balOfETHAtPool);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(balanceOfETHAtCToken);
      });

      it("member should do partial untop of an avatar", async () => {
        const member = a.member1;
        const user = a.user1;
        const avatar = avatar1;

        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfZRXAtCToken = await ZRX.balanceOf(cZRX_addr);
        const balOfZRXAtPool = await ZRX.balanceOf(pool.address);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(new BN(TEN_ZRX)),
        );

        // member1 untop
        const untopAmount = ONE_ZRX.mul(new BN(5));
        await pool.untop(user, untopAmount, { from: member });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(balOfZRXAtPool);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(balanceOfZRXAtCToken);
      });

      it("member should do partial untop of an avatar (ETH)", async () => {
        const member = a.member2;
        const user = a.user3;
        const avatar = avatar3;

        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfETHAtCToken = await balance.current(cETH_addr);
        const balOfETHAtPool = await balance.current(pool.address);

        // member2 topped up
        const pointOneETH = ONE_ETH.div(new BN(10));
        const toppedUpETH = pointOneETH;
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member });
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          balOfETHAtPool.sub(pointOneETH),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(pointOneETH);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          balanceOfETHAtCToken.add(pointOneETH),
        );

        // member2 untop
        const untopAmount = pointOneETH.div(new BN(2)); // 0.05 ETH
        await pool.untop(user, untopAmount, { from: member });
        expect(await balance.current(pool.address)).to.be.bignumber.equal(balOfETHAtPool);
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(balanceOfETHAtCToken);
      });

      it("should fail when other member try to untop of member1 topup", async () => {
        const member1 = a.member1;
        const member2 = a.member2;
        const user = a.user1;
        const avatar = avatar1;

        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfZRXAtCToken = await ZRX.balanceOf(cZRX_addr);
        const balOfZRXAtPool = await ZRX.balanceOf(pool.address);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member1 });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(TEN_ZRX),
        );

        // member2 untop
        await expectRevert(
          pool.untop(user, toppedUpZRX, { from: member2 }),
          "Pool: amount-too-big",
        );
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX),
        );
        expect(await avatar1.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(TEN_ZRX),
        );
      });

      it("should fail when other member try to untop of member2 topup (ETH)", async () => {
        const member1 = a.member2;
        const member2 = a.member3;
        const user = a.user3;
        const avatar = avatar3;

        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfETHAtCToken = await balance.current(cETH_addr);
        const balOfETHAtPool = await balance.current(pool.address);

        const pointOneETH = ONE_ETH.div(new BN(10));
        // member1 topped up
        const toppedUpETH = pointOneETH;
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member1 });
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          balOfETHAtPool.sub(pointOneETH),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(pointOneETH);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          balanceOfETHAtCToken.add(pointOneETH),
        );

        // member2 untop
        await expectRevert(
          pool.untop(user, toppedUpETH, { from: member2 }),
          "Pool: amount-too-big",
        );
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          balOfETHAtPool.sub(pointOneETH),
        );
        expect(await avatar.toppedUpAmount()).to.be.bignumber.equal(pointOneETH);
        expect(await balance.current(cETH_addr)).to.be.bignumber.equal(
          balanceOfETHAtCToken.add(pointOneETH),
        );
      });

      it("should fail when a non-member calls untop", async () => {
        const user = a.user1;
        const member = a.member1;

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member });

        await expectRevert(pool.untop(user, toppedUpZRX, { from: a.dummy1 }), "Pool: not-member");
      });

      it("should fail when a non-member calls untop (ETH)", async () => {
        const user = a.user3;
        const member = a.member2;

        // member1 topped up
        const toppedUpETH = ONE_ETH.div(new BN(10)); // 0.1 ETH
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member });

        await expectRevert(pool.untop(user, toppedUpETH, { from: a.dummy1 }), "Pool: not-member");
      });

      it("should fail when underlyingAmount is zero", async () => {
        const user = a.user1;
        const member = a.member1;

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member });

        await expectRevert(pool.untop(user, ZERO, { from: member }), "Pool: amount-is-zero");
      });

      it("should fail when underlyingAmount is zero (ETH)", async () => {
        const user = a.user3;
        const member = a.member2;

        // member1 topped up
        const toppedUpETH = ONE_ETH.div(new BN(10)); // 0.1 ETH
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member });

        await expectRevert(pool.untop(user, ZERO, { from: member }), "Pool: amount-is-zero");
      });

      it("should fail when underlyingAmount is too big", async () => {
        const member = a.member1;
        const user = a.user1;

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(user, bZRX_addr, toppedUpZRX, false, { from: member });

        await expectRevert(
          pool.untop(user, toppedUpZRX.add(new BN(1)), { from: member }),
          "Pool: amount-too-big",
        );
      });

      it("should fail when underlyingAmount is too big (ETH)", async () => {
        const member = a.member2;
        const user = a.user3;

        // member1 topped up
        const toppedUpETH = ONE_ETH.div(new BN(10)); // 0.1 ETH
        await pool.topup(user, bETH_addr, toppedUpETH, false, { from: member });

        await expectRevert(
          pool.untop(user, toppedUpETH.add(new BN(1)), { from: member }),
          "Pool: amount-too-big",
        );
      });

      it("should fail when invalid amount", async () => {
        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });

        // 2.5%
        const minTopup = toppedUpZRX.mul(new BN(250)).div(new BN(10000));
        const littleMoreThenMinTopup = toppedUpZRX.sub(minTopup).sub(new BN(1));
        await expectRevert(
          pool.untop(a.user1, littleMoreThenMinTopup, { from: a.member1 }),
          "Pool: invalid-amount",
        );
      });

      it("should fail when invalid ETH amount", async () => {
        // user3
        // member2 topped up
        const toppedUpETH = ONE_ETH.div(new BN(10)); // 0.1 ETH
        await pool.topup(a.user3, bETH_addr, toppedUpETH, false, { from: a.member2 });

        // 2.5%
        const minTopup = toppedUpETH.mul(new BN(250)).div(new BN(10000));
        const littleMoreThenMinTopup = toppedUpETH.sub(minTopup).sub(new BN(1));
        await expectRevert(
          pool.untop(a.user3, littleMoreThenMinTopup, { from: a.member2 }),
          "Pool: invalid-amount",
        );
      });

      it("should untop when same member topped up twice after his holdingTime expired", async () => {
        expect(await avatar1.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        const balanceOfZRXAtCToken = await ZRX.balanceOf(cZRX_addr);
        const balOfZRXAtPool = await ZRX.balanceOf(pool.address);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX),
        );
        expect(await avatar1.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(new BN(TEN_ZRX)),
        );

        // reset time
        await time.increase(holdingTime.add(new BN(1)));

        let newMember: string;
        const selectionDuration = await pool.selectionDuration();

        // ensure that its member1 turn again
        while (true) {
          newMember = await pool.smallTopupWinner(avatar1.address);
          // Ensure new member is again member1
          if (newMember === a.member1) {
            break;
          } else {
            await time.increase(selectionDuration);
            continue;
          }
        }
        expect(newMember).to.be.equal(a.member1);

        // member1 try to topup
        await ZRX.approve(pool.address, TEN_ZRX, { from: newMember });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: newMember });

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX).add(TEN_ZRX),
        );

        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: newMember });

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool.sub(TEN_ZRX).add(TEN_ZRX).sub(TEN_ZRX),
        );

        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(
          balanceOfZRXAtCToken.add(new BN(TEN_ZRX).mul(new BN(2))),
        );
        expect(await avatar1.toppedUpAmount()).to.be.bignumber.equal(TEN_ZRX.mul(new BN(2)));

        const totalToppedUp = TEN_ZRX.add(TEN_ZRX);
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);

        // member1 untop
        await pool.untop(a.user1, totalToppedUp, { from: a.member1 });

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          balOfZRXAtPool
            .sub(TEN_ZRX) // topup
            .add(TEN_ZRX) // deposit
            .sub(TEN_ZRX) // topup
            .add(TEN_ZRX.mul(new BN(2))), //untop
        );
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(balanceOfZRXAtCToken);
        expect(await avatar1.toppedUpAmount()).to.be.bignumber.equal(ZERO);
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(totalToppedUp);
      });

      it("member should untop big loan", async () => {
        // pre-requisite
        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
        // user1 deposit to provide liquidity
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        // 100 ZRX as minSharingThreshold
        await pool.setMinSharingThreshold(bZRX_addr, new BN(100).mul(ONE_ZRX), {
          from: a.deployer,
        });

        const member = a.member3;
        const user = a.user4;

        // User ETH deposit collateral
        // 20 ETH = 20 * $100 = $2000
        await bETH.mint({ from: user, value: TWENTY_ETH });

        // User borrow ZRX
        // 1000 ZRX = 1000 * $1 = $1000
        await bZRX.borrow(ONE_THOUSAND_ZRX, { from: user });

        const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX_addr);
        const minDebt = debtInfo[0];
        const isSmall = debtInfo[1];

        const debt = ONE_THOUSAND_ZRX;
        const expectedMinDebt = debt.mul(new BN(250)).div(new BN(10000));
        expect(minDebt).to.be.bignumber.equal(expectedMinDebt);
        expect(isSmall).to.be.equal(false);

        // member deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: member });
        // member topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: member });
        // member untop
        await pool.untop(user, minDebt, { from: member });

        // validate
        const memberInfo = await pool.getMemberTopupInfo(user, member);
        const expectedExpire = ZERO;
        const expectedAmountTopped = ZERO;
        const expectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(memberInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedAmountTopped,
          expectedAmountLiquidated: expectedAmountLiquidated,
        });
      });

      it("multiple members should share big loan and untop", async () => {
        // pre-requisite
        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
        // user1 deposit to provide liquidity
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        // 100 ZRX as minSharingThreshold
        await pool.setMinSharingThreshold(bZRX_addr, new BN(100).mul(ONE_ZRX), {
          from: a.deployer,
        });

        const user = a.user4;

        // User ETH deposit collateral
        // 20 ETH = 20 * $100 = $2000
        await bETH.mint({ from: user, value: TWENTY_ETH });

        // User borrow ZRX
        // 1000 ZRX = 1000 * $1 = $1000
        await bZRX.borrow(ONE_THOUSAND_ZRX, { from: user });

        const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX_addr);
        const minDebt = debtInfo[0];
        const isSmall = debtInfo[1];

        const debt = ONE_THOUSAND_ZRX;
        const expectedMinDebt = debt.mul(new BN(250)).div(new BN(10000));
        expect(minDebt).to.be.bignumber.equal(expectedMinDebt);
        expect(isSmall).to.be.equal(false);

        // member3 deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: a.member3 });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: a.member3 });
        // member3 topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: a.member3 });
        // member4 topup
        await pool.untop(user, minDebt, { from: a.member3 });

        // validate
        const member3Info = await pool.getMemberTopupInfo(user, a.member3);
        const member3ExpectedExpire = ZERO;
        const member3ExpectedAmountTopped = ZERO;
        const member3ExpectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(member3Info, {
          expectedExpire: member3ExpectedExpire,
          expectedAmountTopped: member3ExpectedAmountTopped,
          expectedAmountLiquidated: member3ExpectedAmountLiquidated,
        });

        // member4 deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: a.member4 });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: a.member4 });
        // member3 topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: a.member4 });
        // member4 topup
        await pool.untop(user, minDebt, { from: a.member4 });

        // validate
        const member4Info = await pool.getMemberTopupInfo(user, a.member4);
        const member4ExpectedExpire = ZERO;
        const member4ExpectedAmountTopped = ZERO;
        const member4ExpectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(member4Info, {
          expectedExpire: member4ExpectedExpire,
          expectedAmountTopped: member4ExpectedAmountTopped,
          expectedAmountLiquidated: member4ExpectedAmountLiquidated,
        });
      });
    });

    describe("Pool.smallTopupWinner()", async () => {
      let members: string[];

      beforeEach(async () => {
        members = await pool.getMembers();
      });

      it("should get smallTopupWinner", async () => {
        expect(await pool.membersLength()).to.be.bignumber.equal(new BN(4));

        const chosenMember = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember, members)).to.be.equal(true);
      });

      it("should get the same smallTopupWinner for an hour", async () => {
        // reset time
        const selectionDuration = await pool.selectionDuration();
        let nowTime = new BN((await web3.eth.getBlock("latest")).timestamp);
        const extra = nowTime.mod(selectionDuration); // extra = nowTime % 60mins
        const diffToSeek = selectionDuration.sub(extra); // diffToSeek = 60mins - extra
        await time.increase(diffToSeek);
        nowTime = new BN((await web3.eth.getBlock("latest")).timestamp);
        expect(nowTime.mod(selectionDuration)).to.be.bignumber.equal(ZERO);

        let chosenMember1 = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember1, members)).to.be.equal(true);

        await time.increase(1);

        let chosenMember2 = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember2, members)).to.be.equal(true);
        expect(chosenMember1).to.be.equal(chosenMember2);

        // 20 second before next hour
        await time.increase(selectionDuration.sub(new BN(20)));

        let chosenMember3 = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember3, members)).to.be.equal(true);
        expect(chosenMember2).to.be.equal(chosenMember3);
      });

      it("should change the smallTopupWinner next hour", async () => {
        // reset time
        const selectionDuration = await pool.selectionDuration();
        let nowTime = new BN((await web3.eth.getBlock("latest")).timestamp);
        const extra = nowTime.mod(selectionDuration); // extra = nowTime % 60mins
        const diffToSeek = selectionDuration.sub(extra); // diffToSeek = 60mins - extra
        await time.increase(diffToSeek);

        let chosenMember1 = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember1, members)).to.be.equal(true);

        // increase 1 hour
        await time.increase(selectionDuration.add(new BN(1)));

        let chosenMember2 = await pool.smallTopupWinner(avatar1.address);
        expect(isValidaMember(chosenMember2, members)).to.be.equal(true);
        // NOTICE: 1/3 probability of passing
        // TODO: commented our as we cannot predict
        // expect(chosenMember1).to.be.not.equal(chosenMember2);
      });

      it("should get member only from members list", async () => {
        // reset time
        const selectionDuration = await pool.selectionDuration();
        let nowTime = new BN((await web3.eth.getBlock("latest")).timestamp);
        const extra = nowTime.mod(selectionDuration); // extra = nowTime % 60mins
        const diffToSeek = selectionDuration.sub(extra); // diffToSeek = 60mins - extra
        await time.increase(diffToSeek);
        nowTime = new BN((await web3.eth.getBlock("latest")).timestamp);
        expect(nowTime.mod(selectionDuration)).to.be.bignumber.equal(ZERO);

        for (let i = 0; i < 10; i++) {
          await time.increase(selectionDuration.add(new BN((i + 1) * 3)));

          let chosenMember = await pool.smallTopupWinner(avatar1.address);
          expect(isValidaMember(chosenMember, members)).to.be.equal(true);
        }
      });
    });

    describe("Pool.topup()", async () => {
      beforeEach(async () => {
        await initSetupCompound();

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

        // 5. Member1 deposits 10 ZRX to pool
        await ZRX.approve(pool.address, TEN_ZRX, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: a.member1 });

        // 5. Member2 deposits 0.1 ETH to pool
        await pool.methods["deposit()"]({ from: a.member2, value: ONE_ETH.div(new BN(10)) });
      });

      it("should topup with ZRX", async () => {
        // user1 borrowed ZRX
        // member1 toppedUp

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });

        const result = await pool.topped(avatar1.address);
        const debtToLiquidatePerMember = result[0];
        const cToken = result[1];
        expect(debtToLiquidatePerMember).to.be.bignumber.equal(ZERO);
        expect(cToken).to.be.equal(await bComptroller.b2c(bZRX_addr));

        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bZRX_addr);
        expectDebtTopupInfo(debtTopupInfo, {
          // borrowAmt * 250 / 10000 = 2.5%
          expectedMinDebt: FIFTY_ZRX.mul(new BN(250)).div(new BN(10000)),
          expectedIsSmall: true,
        });

        const memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        const expectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(holdingTime);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await avatar1.isToppedUp()).to.be.equal(true);
      });

      it("should topup with ETH", async () => {
        // user3 borrowed ETH
        // member2 toppedUp

        // Change ETH rate
        // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
        const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
        await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

        const toppedUpETH = ONE_ETH.div(new BN(10)); // 0.1 ETH
        await pool.topup(a.user3, bETH_addr, toppedUpETH, false, { from: a.member2 });
        const result = await pool.topped(avatar3.address);
        const debtToLiquidatePerMember = result[0];
        const cToken = result[1];
        expect(debtToLiquidatePerMember).to.be.bignumber.equal(ZERO);
        expect(cToken).to.be.equal(await bComptroller.b2c(bETH_addr));
        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user3, bETH_addr);
        expectDebtTopupInfo(debtTopupInfo, {
          // borrowAmt * 250 / 10000 = 2.5%
          expectedMinDebt: HALF_ETH.mul(new BN(250)).div(new BN(10000)),
          expectedIsSmall: true,
        });
        const memberTopupInfo = await pool.getMemberTopupInfo(a.user3, a.member2);
        const expectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(holdingTime);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectExpire,
          expectedAmountTopped: toppedUpETH,
          expectedAmountLiquidated: ZERO,
        });
        expect(await pool.balance(a.member2, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await avatar3.isToppedUp()).to.be.equal(true);
      });

      it("should fail when a non-member calls topup", async () => {
        // user1 borrowed ZRX
        // other try to topup

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        const toppedUpZRX = TEN_ZRX;
        await expectRevert(
          pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.other }),
          "Pool: not-member",
        );
      });

      it("should fail when member balance is insuffecient", async () => {
        // user1 borrowed ZRX
        // member3 try to topup

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        const toppedUpZRX = TEN_ZRX;
        await expectRevert(
          pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member3 }),
          "Pool: topup-insufficient-balance",
        );
      });

      it("member should topup big loan", async () => {
        // pre-requisite
        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
        // user1 deposit to provide liquidity
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        // 100 ZRX as minSharingThreshold
        await pool.setMinSharingThreshold(bZRX_addr, new BN(100).mul(ONE_ZRX), {
          from: a.deployer,
        });

        const member = a.member3;
        const user = a.user4;

        // User ETH deposit collateral
        // 20 ETH = 20 * $100 = $2000
        await bETH.mint({ from: user, value: TWENTY_ETH });

        // User borrow ZRX
        // 1000 ZRX = 1000 * $1 = $1000
        await bZRX.borrow(ONE_THOUSAND_ZRX, { from: user });

        const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX_addr);
        const minDebt = debtInfo[0];
        const isSmall = debtInfo[1];

        const debt = ONE_THOUSAND_ZRX;
        const expectedMinDebt = debt.mul(new BN(250)).div(new BN(10000));
        expect(minDebt).to.be.bignumber.equal(expectedMinDebt);
        expect(isSmall).to.be.equal(false);

        // member deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: member });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: member });
        // member topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: member });

        // validate
        const memberInfo = await pool.getMemberTopupInfo(user, member);
        const expectedExpire = ZERO;
        const expectedAmountTopped = minDebt;
        const expectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(memberInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedAmountTopped,
          expectedAmountLiquidated: expectedAmountLiquidated,
        });
      });

      it("multiple members should share big loan", async () => {
        // pre-requisite
        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
        // user1 deposit to provide liquidity
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
        // 100 ZRX as minSharingThreshold
        await pool.setMinSharingThreshold(bZRX_addr, new BN(100).mul(ONE_ZRX), {
          from: a.deployer,
        });

        const user = a.user4;

        // User ETH deposit collateral
        // 20 ETH = 20 * $100 = $2000
        await bETH.mint({ from: user, value: TWENTY_ETH });

        // User borrow ZRX
        // 1000 ZRX = 1000 * $1 = $1000
        await bZRX.borrow(ONE_THOUSAND_ZRX, { from: user });

        const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX_addr);
        const minDebt = debtInfo[0];
        const isSmall = debtInfo[1];

        const debt = ONE_THOUSAND_ZRX;
        const expectedMinDebt = debt.mul(new BN(250)).div(new BN(10000));
        expect(minDebt).to.be.bignumber.equal(expectedMinDebt);
        expect(isSmall).to.be.equal(false);

        // member3 deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: a.member3 });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: a.member3 });
        // member3 topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: a.member3 });

        // validate
        const member3Info = await pool.getMemberTopupInfo(user, a.member3);
        const member3ExpectedExpire = ZERO;
        const member3ExpectedAmountTopped = minDebt;
        const member3ExpectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(member3Info, {
          expectedExpire: member3ExpectedExpire,
          expectedAmountTopped: member3ExpectedAmountTopped,
          expectedAmountLiquidated: member3ExpectedAmountLiquidated,
        });

        // member4 deposit minDebt
        await ZRX.approve(pool.address, minDebt, { from: a.member4 });
        await pool.methods["deposit(address,uint256)"](ZRX_addr, minDebt, { from: a.member4 });
        // member3 topup
        await pool.topup(user, bZRX_addr, minDebt, false, { from: a.member4 });

        // validate
        const member4Info = await pool.getMemberTopupInfo(user, a.member4);
        const member4ExpectedExpire = ZERO;
        const member4ExpectedAmountTopped = minDebt;
        const member4ExpectedAmountLiquidated = ZERO;

        expectMemberTopupInfo(member4Info, {
          expectedExpire: member4ExpectedExpire,
          expectedAmountTopped: member4ExpectedAmountTopped,
          expectedAmountLiquidated: member4ExpectedAmountLiquidated,
        });
      });

      it("should fail when another member try to topup small loan before expire", async () => {
        // user1 borrowed ZRX
        // member1 toppedUp

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });
        let member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        let expectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(holdingTime);
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: expectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });

        // member2 try to topup
        await ZRX.approve(pool.address, TEN_ZRX, { from: a.member2 });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: a.member2 });
        await expectRevert(
          pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member2 }),
          "Pool: other-member-topped",
        );

        // validate that nothing changed
        member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: expectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });
      });

      it("shoud allow another member to topup small loan after expire from prev member", async () => {
        // user1 borrowed ZRX
        // member1 toppedUp

        // NOTICE: No price update, otherwise member1's untopOnBehalf will fail in borrow.
        // // Change ZRX rate
        // // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        // // const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        // // await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });
        let member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        let member1ExpectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(
          holdingTime,
        );
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: member1ExpectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });
        // member1 balance = depositedZRX - toppedUpZRX
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );

        // reset time
        await time.increaseTo(member1ExpectExpire.add(new BN(1)));

        let newMember: string;
        const selectionDuration = await pool.selectionDuration();
        // ensure that its memberX (excluding member1) turn?
        // seek time so that next member is not equal previous member, as probability of
        // getting member1 again is 1/4
        while (true) {
          newMember = await pool.smallTopupWinner(avatar1.address);
          if (newMember === a.member1) {
            await time.increase(selectionDuration);
            continue;
          } else {
            break;
          }
        }

        // newMember try to topup
        await ZRX.approve(pool.address, TEN_ZRX, { from: newMember });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: newMember });
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: newMember });
        let newMemberExpectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(
          holdingTime,
        );

        // member1 storage should be updated
        // member1_balance = deposited
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(TEN_ZRX);
        member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: ZERO,
          expectedAmountLiquidated: ZERO,
        });

        //  newMember storage should be updated
        let newMemberTopupInfo = await pool.getMemberTopupInfo(a.user1, newMember);
        expectMemberTopupInfo(newMemberTopupInfo, {
          expectedExpire: newMemberExpectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });
        // member1 balance = depositedZRX - toppedUpZRX
        expect(await pool.balance(newMember, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );
      });

      it("should allow same member to topup small loan after his first chance expires", async () => {
        // user1 borrowed ZRX
        // member1 toppedUp

        // NOTICE: No price update, otherwise member1's untopOnBehalf will fail in borrow.
        // // Change ZRX rate
        // // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        // // const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        // // await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });
        let member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        let member1ExpectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(
          holdingTime,
        );
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: member1ExpectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });
        // member1 balance = depositedZRX - toppedUpZRX
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );

        // reset time
        await time.increaseTo(member1ExpectExpire.add(new BN(1)));

        let newMember: string;
        const selectionDuration = await pool.selectionDuration();

        // ensure that its member1 turn again
        while (true) {
          newMember = await pool.smallTopupWinner(avatar1.address);
          // Ensure new member is again member1
          if (newMember === a.member1) {
            break;
          } else {
            await time.increase(selectionDuration);
            continue;
          }
        }
        expect(newMember).to.be.equal(a.member1);

        // member1 try to topup
        await ZRX.approve(pool.address, TEN_ZRX, { from: newMember });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: newMember });
        const tx = await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: newMember });
        const topupTimestamp = new BN((await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);
        const newExpectExpire = topupTimestamp.add(holdingTime);

        // member1 storage should be updated
        // member1 balance = depositedZRX - toppedUpZRX
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );
        const totalAmountToppedUp = TEN_ZRX.add(TEN_ZRX);
        member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: newExpectExpire,
          expectedAmountTopped: totalAmountToppedUp,
          expectedAmountLiquidated: ZERO,
        });
      });

      it("should fail topup when an avatar under liquidation");

      it("should fail when avatar is under liquidation and member1 chance expired, newMember is choosen to topup", async () => {
        // member1 topped up
        const toppedUpZRX = TEN_ZRX;
        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });
        let member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        let member1ExpectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(
          holdingTime,
        );
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: member1ExpectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });
        // member1 balance = depositedZRX - toppedUpZRX
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );

        // Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE_ZRX = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE_ZRX);

        // reset time
        await time.increaseTo(member1ExpectExpire.add(new BN(1)));

        let newMember: string;
        const selectionDuration = await pool.selectionDuration();
        // ensure that its memberX (excluding member1) turn?
        // seek time so that next member is not equal previous member, as probability of
        // getting member1 again is 1/4
        while (true) {
          newMember = await pool.smallTopupWinner(avatar1.address);
          if (newMember === a.member1) {
            await time.increase(selectionDuration);
            continue;
          } else {
            break;
          }
        }

        // newMember try to topup
        await ZRX.approve(pool.address, TEN_ZRX, { from: newMember });
        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: newMember });
        await expectRevert(
          pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: newMember }),
          "Cushion: borrow-failed",
        );

        // member1 storage should NOT be updated
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(
          TEN_ZRX.sub(toppedUpZRX),
        );
        member1TopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(member1TopupInfo, {
          expectedExpire: member1ExpectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });

        // newMember balance remains unchanged
        expect(await pool.balance(newMember, ZRX_addr)).to.be.bignumber.equal(TEN_ZRX);
      });
    });

    describe("Pool.setMinTopupBps()", async () => {
      const defaultMinTopupBps = new BN(250);

      it("should have default minTopupBps", async () => {
        expect(await pool.minTopupBps()).to.be.bignumber.equal(defaultMinTopupBps);
      });

      it("owner should set minTopupBps", async () => {
        expect(await pool.minTopupBps()).to.be.bignumber.equal(defaultMinTopupBps);

        let newMinTopupBps = new BN(0); // 0%
        let tx = await pool.setMinTopupBps(newMinTopupBps, { from: a.deployer });
        expectEvent(tx, "MinTopupBpsChanged", {
          oldMinTopupBps: defaultMinTopupBps,
          newMinTopupBps: newMinTopupBps,
        });
        expect(await pool.minTopupBps()).to.be.bignumber.equal(newMinTopupBps);

        newMinTopupBps = new BN(5000); // 50%
        tx = await pool.setMinTopupBps(newMinTopupBps, { from: a.deployer });
        expectEvent(tx, "MinTopupBpsChanged", {
          oldMinTopupBps: new BN(0),
          newMinTopupBps: newMinTopupBps,
        });
        expect(await pool.minTopupBps()).to.be.bignumber.equal(newMinTopupBps);
      });

      it("should not allow setting out-of-bound minTopupBps", async () => {
        const newMinTopupBps = new BN(11000); // 110%
        await expectRevert(
          pool.setMinTopupBps(newMinTopupBps, { from: a.deployer }),
          "Pool: incorrect-minTopupBps",
        );

        expect(await pool.minTopupBps()).to.be.bignumber.equal(defaultMinTopupBps);
      });

      it("should fail when called by non-owner", async () => {
        const newMinTopupBps = new BN(5000); // 50%
        await expectRevert(
          pool.setMinTopupBps(newMinTopupBps, { from: a.other }),
          "Ownable: caller is not the owner",
        );
        expect(await pool.minTopupBps()).to.be.bignumber.equal(defaultMinTopupBps);
      });
    });

    describe("Pool.setHoldingTime()", async () => {
      const defaultHoldingTime = new BN(5).mul(ONE_HOUR);

      it("should have default holdingTime", async () => {
        expect(await pool.holdingTime()).to.be.bignumber.equal(defaultHoldingTime);
      });

      it("owner should set holdingTime", async () => {
        expect(await pool.holdingTime()).to.be.bignumber.equal(defaultHoldingTime);

        const newHoldingTime = new BN(6).mul(ONE_HOUR);
        const tx = await pool.setHoldingTime(newHoldingTime, { from: a.deployer });
        expectEvent(tx, "HoldingTimeChanged", {
          oldHoldingTime: defaultHoldingTime,
          newHoldingTime: newHoldingTime,
        });
        expect(await pool.holdingTime()).to.be.bignumber.equal(newHoldingTime);
      });

      it("should fail when trying to set to zero", async () => {
        const newHoldingTime = new BN(0);
        await expectRevert(
          pool.setHoldingTime(newHoldingTime, { from: a.deployer }),
          "Pool: incorrect-holdingTime",
        );
        expect(await pool.holdingTime()).to.be.bignumber.equal(defaultHoldingTime);
      });

      it("should fail when holdingTime is out-of-bound", async () => {
        const newHoldingTime = new BN(12).mul(ONE_HOUR);
        await expectRevert(
          pool.setHoldingTime(newHoldingTime, { from: a.deployer }),
          "Pool: incorrect-holdingTime",
        );
        expect(await pool.holdingTime()).to.be.bignumber.equal(defaultHoldingTime);
      });

      it("should fail when called by non-owner", async () => {
        const newHoldingTime = new BN(6).mul(ONE_HOUR);
        await expectRevert(
          pool.setHoldingTime(newHoldingTime, { from: a.other }),
          "Ownable: caller is not the owner",
        );
        expect(await pool.holdingTime()).to.be.bignumber.equal(defaultHoldingTime);
      });
    });

    describe("Pool.setMinSharingThreshold()", async () => {
      it("should have default minSharingThreshold", async () => {
        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);
        expect(await pool.minSharingThreshold(bZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await pool.minSharingThreshold(bBAT_addr)).to.be.bignumber.equal(ZERO);
      });

      it("should set minSharingThreshold by owner", async () => {
        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);

        const newMinSharingThresholdETH = new BN(100).mul(ONE_ETH);
        const tx = await pool.setMinSharingThreshold(bETH_addr, newMinSharingThresholdETH, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bETH_addr,
          oldThreshold: ZERO,
          newThreshold: newMinSharingThresholdETH,
        });

        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(
          newMinSharingThresholdETH,
        );
      });

      it("should allow changing minSharingThreshold by owner", async () => {
        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);
        expect(await pool.minSharingThreshold(bZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await pool.minSharingThreshold(bBAT_addr)).to.be.bignumber.equal(ZERO);

        let newMinSharingThresholdETH = new BN(100).mul(ONE_ETH);
        let newMinSharingThresholdZRX = new BN(10000).mul(ONE_ZRX);
        let newMinSharingThresholdBAT = new BN(100000).mul(ONE_BAT);

        let tx = await pool.setMinSharingThreshold(bETH_addr, newMinSharingThresholdETH, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bETH_addr,
          oldThreshold: ZERO,
          newThreshold: newMinSharingThresholdETH,
        });

        tx = await pool.setMinSharingThreshold(bZRX_addr, newMinSharingThresholdZRX, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bZRX_addr,
          oldThreshold: ZERO,
          newThreshold: newMinSharingThresholdZRX,
        });

        tx = await pool.setMinSharingThreshold(bBAT_addr, newMinSharingThresholdBAT, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bBAT_addr,
          oldThreshold: ZERO,
          newThreshold: newMinSharingThresholdBAT,
        });

        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(
          newMinSharingThresholdETH,
        );
        expect(await pool.minSharingThreshold(bZRX_addr)).to.be.bignumber.equal(
          newMinSharingThresholdZRX,
        );
        expect(await pool.minSharingThreshold(bBAT_addr)).to.be.bignumber.equal(
          newMinSharingThresholdBAT,
        );

        const oldMinSharingThresholdETH = newMinSharingThresholdETH;
        const oldMinSharingThresholdZRX = newMinSharingThresholdZRX;
        const oldMinSharingThresholdBAT = newMinSharingThresholdBAT;

        newMinSharingThresholdETH = new BN(1000).mul(ONE_ETH);
        newMinSharingThresholdZRX = new BN(100000).mul(ONE_ZRX);
        newMinSharingThresholdBAT = new BN(1000000).mul(ONE_BAT);

        tx = await pool.setMinSharingThreshold(bETH_addr, newMinSharingThresholdETH, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bETH_addr,
          oldThreshold: oldMinSharingThresholdETH,
          newThreshold: newMinSharingThresholdETH,
        });

        tx = await pool.setMinSharingThreshold(bZRX_addr, newMinSharingThresholdZRX, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bZRX_addr,
          oldThreshold: oldMinSharingThresholdZRX,
          newThreshold: newMinSharingThresholdZRX,
        });

        tx = await pool.setMinSharingThreshold(bBAT_addr, newMinSharingThresholdBAT, {
          from: a.deployer,
        });
        expectEvent(tx, "MinSharingThresholdChanged", {
          bToken: bBAT_addr,
          oldThreshold: oldMinSharingThresholdBAT,
          newThreshold: newMinSharingThresholdBAT,
        });

        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(
          newMinSharingThresholdETH,
        );
        expect(await pool.minSharingThreshold(bZRX_addr)).to.be.bignumber.equal(
          newMinSharingThresholdZRX,
        );
        expect(await pool.minSharingThreshold(bBAT_addr)).to.be.bignumber.equal(
          newMinSharingThresholdBAT,
        );
      });

      it("should fail when minSharingThreshold is zero", async () => {
        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          pool.setMinSharingThreshold(bETH_addr, ZERO, {
            from: a.deployer,
          }),
          "Pool: incorrect-minThreshold",
        );

        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when not a valid BToken", async () => {
        expect(await pool.minSharingThreshold(cETH_addr)).to.be.bignumber.equal(ZERO);

        const newMinSharingThresholdETH = new BN(100).mul(ONE_ETH);
        await expectRevert(
          pool.setMinSharingThreshold(cETH_addr, newMinSharingThresholdETH, {
            from: a.deployer,
          }),
          "Pool: not-a-BToken",
        );

        expect(await pool.minSharingThreshold(cETH_addr)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when a non-owner try to set minSharingThreshold", async () => {
        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);

        const newMinSharingThresholdETH = new BN(100).mul(ONE_ETH);
        await expectRevert(
          pool.setMinSharingThreshold(bETH_addr, newMinSharingThresholdETH, {
            from: a.other,
          }),
          "Ownable: caller is not the owner",
        );

        expect(await pool.minSharingThreshold(bETH_addr)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.setRegistry()", async () => {
      it("should have registry already set", async () => {
        const registryAddr = await pool.registry();
        expect(registryAddr).to.be.not.equal(ZERO_ADDRESS);
        expect(registryAddr).to.be.equal(bProtocol.registry.address);
      });

      it("should fail when try to set registry again", async () => {
        const registryAddr = await pool.registry();
        await expectRevert(
          pool.setRegistry(a.dummy1, { from: a.deployer }),
          "Pool: registry-already-set",
        );
        expect(registryAddr).to.be.equal(bProtocol.registry.address);
      });
    });

    describe("Pool.setProfitParams()", async () => {
      // Numerator and Denominators are already set in Engine
      const prevSetNumerator = new BN(105);
      const prevSetDenominator = new BN(110);

      it("should have default profit params values", async () => {
        expect(await pool.shareNumerator()).to.be.bignumber.equal(prevSetNumerator);
        expect(await pool.shareDenominator()).to.be.bignumber.equal(prevSetDenominator);
      });

      it("should change profit params", async () => {
        const numerator = new BN(100);
        const denominator = new BN(1000);

        const tx = await pool.setProfitParams(numerator, denominator, { from: a.deployer });
        expectEvent(tx, "ProfitParamsChanged", { numerator: numerator, denominator: denominator });

        expect(await pool.shareNumerator()).to.be.bignumber.equal(numerator);
        expect(await pool.shareDenominator()).to.be.bignumber.equal(denominator);
      });

      it("should fail when incorrect profit params sent", async () => {
        const numerator = new BN(1000);
        const denominator = new BN(100);

        await expectRevert(
          pool.setProfitParams(numerator, denominator, { from: a.deployer }),
          "Pool: invalid-profit-params",
        );

        expect(await pool.shareNumerator()).to.be.bignumber.equal(prevSetNumerator);
        expect(await pool.shareDenominator()).to.be.bignumber.equal(prevSetDenominator);
      });

      it("should fail when non-owner try to change profit params", async () => {
        const numerator = new BN(100);
        const denominator = new BN(1000);

        await expectRevert(
          pool.setProfitParams(numerator, denominator, { from: a.other }),
          "Ownable: caller is not the owner",
        );

        expect(await pool.shareNumerator()).to.be.bignumber.equal(prevSetNumerator);
        expect(await pool.shareDenominator()).to.be.bignumber.equal(prevSetDenominator);
      });
    });

    describe("Pool.setSelectionDuration()", async () => {
      const defaultSelectionDuration = new BN(60).mul(ONE_MINUTE);

      it("should get default selectionDuration", async () => {
        expect(await pool.selectionDuration()).to.be.bignumber.equal(defaultSelectionDuration);
      });

      it("should set selection duration", async () => {
        const newSelectionDuration = new BN(2).mul(ONE_HOUR);
        const tx = await pool.setSelectionDuration(newSelectionDuration, { from: a.deployer });
        expectEvent(tx, "SelectionDurationChanged", {
          oldDuration: defaultSelectionDuration,
          newDuration: newSelectionDuration,
        });

        expect(await pool.selectionDuration()).to.be.bignumber.equal(newSelectionDuration);
      });

      it("should fail when selection duration is zero", async () => {
        expect(await pool.selectionDuration()).to.be.bignumber.equal(defaultSelectionDuration);

        await expectRevert(
          pool.setSelectionDuration(new BN(0)),
          "Pool: selection-duration-is-zero",
        );

        expect(await pool.selectionDuration()).to.be.bignumber.equal(defaultSelectionDuration);
      });

      it("should fail when non-owner try to set selectionDuration", async () => {
        expect(await pool.selectionDuration()).to.be.bignumber.equal(defaultSelectionDuration);

        const newSelectionDuration = new BN(2).mul(ONE_HOUR);
        await expectRevert(
          pool.setSelectionDuration(newSelectionDuration, { from: a.other }),
          "Ownable: caller is not the owner",
        );

        expect(await pool.selectionDuration()).to.be.bignumber.equal(defaultSelectionDuration);
      });
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
  debtTopupInfo: [BN, boolean],
  param: {
    expectedMinDebt: BN;
    expectedIsSmall: boolean;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("minDebt: " + debtTopupInfo[0].toString());
    console.log("isSmall: " + debtTopupInfo[1]);
  }

  expect(param.expectedMinDebt, "Unexpected minDebt").to.be.bignumber.equal(debtTopupInfo[0]);
  expect(param.expectedIsSmall, "Unexpected isSmall").to.be.equal(debtTopupInfo[1]);
}

export function isValidaMember(member: string, members: string[], debug: boolean = false) {
  if (debug) {
    console.log("member: " + member);
    console.log("members: " + members);
  }
  let found: boolean = false;

  for (let i = 0; i < members.length; i++) {
    const m = members[i];

    if (debug) {
      console.log(member);
      console.log(m);
    }

    if (m === member) {
      found = true;
      break;
    }
  }
  return found;
}
