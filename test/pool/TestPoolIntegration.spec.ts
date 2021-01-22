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

const CToken: b.CTokenContract = artifacts.require("CToken");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const chai = require("chai");
const expect = chai.expect;

const ONE_ETH = new BN(10).pow(new BN(18));
const HALF_ETH = ONE_ETH.div(new BN(2));
const FIVE_ETH = ONE_ETH.mul(new BN(5));
const TEN_ETH = ONE_ETH.mul(new BN(10));
const FIFTY_ETH = ONE_ETH.mul(new BN(50));
const HUNDRED_ETH = ONE_ETH.mul(new BN(100));
const ZERO = new BN(0);

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
const TEN_BAT = new BN(10).mul(ONE_BAT);
const ONE_HUNDRED_BAT = new BN(100).mul(ONE_BAT);
const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
const FIFTY_BAT = new BN(50).mul(ONE_ZRX);
const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);
const FIVE_THOUSAND_BAT = new BN(5000).mul(ONE_BAT);
const TEN_THOUSAND_BAT = new BN(10000).mul(ONE_BAT);

const ONE_USDT = new BN(10).pow(new BN(6));
const ONE_THOUSAND_USDT = new BN(1000).mul(ONE_USDT);
const FIVE_HUNDRED_USDT = new BN(500).mul(ONE_USDT);

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
const HALF_USD_IN_SCALE = ONE_USD_IN_SCALE.div(new BN(2));

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
    let avatar1: b.AvatarInstance;
    let avatar2: b.AvatarInstance;
    let avatar3: b.AvatarInstance;
    let avatar4: b.AvatarInstance;

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

    describe("Pool Integration Tests", async () => {
      let liquidationIncentive: BN;
      let closeFactor: BN;
      let collateralFactorZRX: BN;
      let collateralFactorETH: BN;
      let collateralFactorBAT: BN;
      let holdingTime = new BN(5).mul(ONE_HOUR); // 5 hours
      let minTopupBps: BN;
      let shareNumerator: BN;
      let shareDenominator: BN;

      beforeEach("set pre-condition", async () => {
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
        // NOTICE: Same $1 price for BAT as well
        await priceOracle.setPrice(cBAT_addr, PRICE_ONE_ZRX_IN_CONTRACT);

        expect(PRICE_ONE_ZRX_IN_CONTRACT).to.be.bignumber.equal(
          await priceOracle.getUnderlyingPrice(cZRX_addr),
        );
        // NOTICE: BAT has same price as ZRX
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

        minTopupBps = await pool.minTopupBps();
        expect(minTopupBps).to.be.bignumber.equal(new BN(250));

        shareNumerator = await pool.shareNumerator();
        expect(shareNumerator).to.be.bignumber.not.equal(ZERO);
        shareDenominator = await pool.shareDenominator();
        expect(shareDenominator).to.be.bignumber.not.equal(ZERO);
      });

      async function setupSmallLoan_ZRXCollateral_BorrowBAT() {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
        await pool.setMinSharingThreshold(bBAT_addr, new BN(10000).mul(ONE_BAT));

        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
        await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });

        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cBAT with BAT
        await BAT.approve(bBAT.address, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });

        // User1 borrow BAT
        await bBAT.borrow(FIVE_HUNDRED_BAT, { from: a.user1 });
      }

      async function setupBigLoan_ZRXCollateral_BorrowBAT() {
        await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });
        await BAT.transfer(a.user2, TEN_THOUSAND_BAT, { from: a.deployer });

        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, TEN_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cBAT with BAT
        await BAT.approve(bBAT.address, TEN_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(TEN_THOUSAND_BAT, { from: a.user2 });

        // User1 borrow BAT
        await bBAT.borrow(FIVE_THOUSAND_BAT, { from: a.user1 });
      }

      async function setupSmallLoan_ETHCollateral_BorrowBAT() {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bETH_addr, new BN(100).mul(ONE_ETH));
        await pool.setMinSharingThreshold(bBAT_addr, new BN(10000).mul(ONE_BAT));

        await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });

        // User-1 mint cETH
        await bETH.mint({ from: a.user1, value: TEN_ETH });

        // User-2 mint cBAT with BAT
        await BAT.approve(bBAT.address, ONE_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });

        // User1 borrow BAT
        await bBAT.borrow(FIVE_HUNDRED_BAT, { from: a.user1 });
      }

      async function setupBigLoan_ETHCollateral_BorrowBAT() {
        await pool.setMinSharingThreshold(bBAT_addr, new BN(1000).mul(ONE_ZRX));

        await BAT.transfer(a.user2, TEN_THOUSAND_BAT, { from: a.deployer });

        // User-1 mint cETH
        await bETH.mint({ from: a.user1, value: HUNDRED_ETH });

        // User-2 mint cBAT with BAT
        await BAT.approve(bBAT.address, TEN_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(TEN_THOUSAND_BAT, { from: a.user2 });

        // User1 borrow BAT
        await bBAT.borrow(FIVE_THOUSAND_BAT, { from: a.user1 });
      }

      async function setupSmallLoan_ZRXCollateral_BorrowETH() {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
        await pool.setMinSharingThreshold(bETH_addr, new BN(100).mul(ONE_ETH));

        await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });

        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cETH with ETH
        await bETH.mint({ from: a.user2, value: TEN_ETH });

        // User1 borrow ETH
        await bETH.borrow(FIVE_ETH, { from: a.user1 });
      }

      async function setupBigLoan_ZRXCollateral_BorrowETH() {
        await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });

        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, TEN_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cETH with ETH
        await bETH.mint({ from: a.user2, value: HUNDRED_ETH });

        // User1 borrow ETH
        await bETH.borrow(FIFTY_ETH, { from: a.user1 });
      }

      async function batTopupRepayUntop() {
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
          expectedIsSmall: true,
        });

        // member deposit
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // topup
        const tx = await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        const expectedExpire = new BN(
          (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp,
        ).add(holdingTime);

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);

        // user repay
        await BAT.approve(bBAT_addr, ONE_HUNDRED_BAT, { from: a.user1 });
        await bBAT.repayBorrow(ONE_HUNDRED_BAT, { from: a.user1 });

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.canUntop.call()).to.be.equal(true);

        // member untop
        await pool.untop(a.user1, expectedMinTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // member withdraw
        await pool.withdraw(BAT_addr, expectedMinTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
      }

      async function validateShareReceived(
        underlingLiquidated: BN,
        cTokenCollaterAddr: string,
        member: string,
      ) {
        const cTokenColl = await CToken.at(cTokenCollaterAddr);
        const siezedCTokens = underlingLiquidated
          .mul(ONE_ETH)
          .div(await cTokenColl.exchangeRateCurrent.call());

        const memberShare = siezedCTokens.mul(shareNumerator).div(shareDenominator);
        const jarShare = siezedCTokens.sub(memberShare);
        // member
        expect(await cTokenColl.balanceOf(member)).to.be.bignumber.equal(memberShare);
        // jar
        expect(await cTokenColl.balanceOf(jar)).to.be.bignumber.equal(jarShare);
      }

      async function setupSmallLoan_ZRX_Collateral_Borrow_BAT_ETH() {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
        await pool.setMinSharingThreshold(bBAT_addr, new BN(10000).mul(ONE_BAT));
        await pool.setMinSharingThreshold(bETH_addr, new BN(50).mul(ONE_ETH));

        // Deployer transfer tokens
        await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });
        await BAT.transfer(a.user2, TEN_THOUSAND_BAT, { from: a.deployer });

        // user1 mints ZRX
        await ZRX.approve(bZRX_addr, TEN_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

        // user2 mints ETH
        await bETH.mint({ from: a.user2, value: HUNDRED_ETH });
        // user2 mints BAT
        await BAT.approve(bBAT_addr, TEN_THOUSAND_BAT, { from: a.user2 });
        await bBAT.mint(TEN_THOUSAND_BAT, { from: a.user2 });

        // user1 borrow ETH
        const _25ETH = FIFTY_ETH.div(new BN(2));
        await bETH.borrow(_25ETH, { from: a.user1 });
        // user1 borrow BAT
        const _2500BAT = FIVE_THOUSAND_BAT.div(new BN(2));
        await bBAT.borrow(_2500BAT, { from: a.user1 });
      }

      it("should do simple liquidation (ETH Collateral, Borrow ZRX)", async () => {
        // ETH collateral $100
        // ZRX borrow $50

        // Precondition Setup:
        // -------------------
        await ZRX.transfer(a.user2, ONE_HUNDRED_ZRX, { from: a.deployer });
        await pool.setMinSharingThreshold(bZRX_addr, new BN(1000).mul(ONE_ZRX));

        // Test
        // ----
        // 1. User-1 mint cETH with ETH : $100
        await bETH.mint({ from: a.user1, value: ONE_ETH });
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(ONE_ETH);

        // 2. User-2 should mint cZRX with ZRX
        await ZRX.approve(bZRX.address, ONE_HUNDRED_ZRX, { from: a.user2 });
        await bZRX.mint(ONE_HUNDRED_ZRX, { from: a.user2 });
        expect(await bZRX.balanceOfUnderlying.call(a.user2)).to.be.bignumber.equal(ONE_HUNDRED_ZRX);

        // 3. User1 borrow ZRX : $50
        await bZRX.borrow(FIFTY_ZRX, { from: a.user1 });

        // 4. Avatar1 not in liquidation
        let accLiquidityOfAvatar1 = await avatar1.methods["getAccountLiquidity()"]();
        expectedLiquidity(accLiquidityOfAvatar1, {
          expectedErr: ZERO,
          expectedLiquidityAmt: ZERO,
          expectedShortFallAmt: ZERO,
        });

        // 5. Change ZRX rate
        // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
        const NEW_RATE = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
        await priceOracle.setPrice(cZRX_addr, NEW_RATE);

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.isToppedUp()).to.be.equal(false);

        // 6. Member1 deposits to pool and topup
        const toppedUpZRX = TEN_ZRX;
        await ZRX.approve(pool.address, TEN_ZRX, { from: a.member1 });

        await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: a.member1 });

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(TEN_ZRX);
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: ZERO,
          expectedAmountTopped: ZERO,
          expectedAmountLiquidated: ZERO,
        });

        await pool.topup(a.user1, bZRX_addr, toppedUpZRX, false, { from: a.member1 });

        const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bZRX_addr);
        const debt = await bZRX.borrowBalanceCurrent.call(a.user1);
        expectDebtTopupInfo(debtTopupInfo, {
          // borrowAmt * 250 / 10000 = 2.5%
          expectedMinTopup: FIFTY_ZRX.mul(new BN(250)).div(new BN(10000)),
          expectedMaxTopup: debt.div(await pool.membersLength()),
          expectedIsSmall: true,
        });

        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        const expectExpire = new BN((await web3.eth.getBlock("latest")).timestamp).add(holdingTime);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectExpire,
          expectedAmountTopped: toppedUpZRX,
          expectedAmountLiquidated: ZERO,
        });

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await avatar1.isToppedUp()).to.be.equal(true);

        // 7. Avatar1 open for liquidation
        accLiquidityOfAvatar1 = await avatar1.methods["getAccountLiquidity()"]();
        // maxBorrowAllowed = (collateralValue * collateralFactor / 1e18)
        const maxBorrowAllowed = ONE_ETH_RATE_IN_SCALE.mul(FIFTY_PERCENT).div(SCALE);
        // borrowed = ( zrxTokensBorrowed * newRate / 1e18)
        const borrowed = FIFTY_ZRX.mul(NEW_RATE).div(SCALE);
        // toppedUpValue = toppedUpZRX * newRate / 1e18
        const toppedUpValue = toppedUpZRX.mul(NEW_RATE).div(SCALE);
        // borrowedOnCompound = borrowed - toppedUpValue
        const borrowedOnCompound = borrowed.sub(toppedUpValue);
        // account liquidity on Avatar
        // expectShortFall = (borrowedOnCompound + toppedUpValue) - maxBorrowAllowed
        const expectShortFall = borrowedOnCompound.add(toppedUpValue).sub(maxBorrowAllowed);
        expectedLiquidity(accLiquidityOfAvatar1, {
          expectedErr: ZERO,
          expectedLiquidityAmt: ZERO,
          expectedShortFallAmt: expectShortFall,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);

        // 8. Account liquidity on Compound is with topup
        let accLiqOfAvatar1OnCompound = await comptroller.getAccountLiquidity(avatar1.address);
        // depositETH_USD - (borrowZRXToken * rate) + (topupZRXToken * rate)
        // $100 - ($50 * 1.1) + ($10 * 1.1) = $56 (which is $6 extra on $50)
        const expectedLiquidityInUSD = ONE_USD_IN_SCALE.mul(new BN(6)); // $6
        expectedLiquidity(accLiqOfAvatar1OnCompound, {
          expectedErr: ZERO,
          expectedLiquidityAmt: expectedLiquidityInUSD,
          expectedShortFallAmt: ZERO,
        });

        // 9. member liquidate
        const maxLiquidationAmtZRX = await avatar1.getMaxLiquidationAmount.call(cZRX_addr);

        const result = await avatar1.calcAmountToLiquidate.call(cZRX_addr, maxLiquidationAmtZRX);
        const amtToRepayOnCompoundZRX = result[1];

        await ZRX.approve(pool.address, amtToRepayOnCompoundZRX, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](ZRX.address, amtToRepayOnCompoundZRX, {
          from: a.member1,
        });

        await pool.liquidateBorrow(
          a.user1,
          bETH_addr,
          bZRX_addr,
          maxLiquidationAmtZRX,
          //amtToRepayOnCompoundZRX,
          { from: a.member1 },
        );

        // 10. Validate balances
        expect(await avatar1.remainingLiquidationAmount()).to.be.bignumber.equal(ZERO);
        expect(await avatar1.canLiquidate.call()).to.be.equal(false);

        // 11. Validate account liquidity on B and Compound
        const amtUpForLiquidationZRX = FIFTY_ZRX.mul(closeFactor).div(SCALE);
        const amtUpForLiquidationUSD = amtUpForLiquidationZRX.mul(NEW_RATE).div(SCALE);
        const amtUpForLiquidationUSD_with_incentive = amtUpForLiquidationUSD
          .mul(liquidationIncentive)
          .div(SCALE);
        // ethInUsdRemainsAtAvatar1 = $100 - amtUpForLiquidationUSD_with_incentive
        const ethRemainsAtAvatar1 = ONE_USD_IN_SCALE.mul(new BN(100)).sub(
          amtUpForLiquidationUSD_with_incentive,
        );
        expect(await bETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
          ethRemainsAtAvatar1,
        );

        // zrxNewBorrowBal = FIFTY_ZRX - amtUpForLiquidation
        const zrxNewBorrowBal = FIFTY_ZRX.sub(amtUpForLiquidationZRX);
        expect(await bZRX.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
          zrxNewBorrowBal,
        );

        const newMaxBorrowAllowedWithETH = ethRemainsAtAvatar1.mul(collateralFactorETH).div(SCALE);
        const newMaxBorrowAllowedUSD = newMaxBorrowAllowedWithETH
          .mul(ONE_ETH_RATE_IN_SCALE)
          .div(SCALE);
        const newBorrowedUSD = zrxNewBorrowBal.mul(NEW_RATE).div(SCALE);
        const availLiquidityUSD = newMaxBorrowAllowedUSD.sub(newBorrowedUSD);

        accLiquidityOfAvatar1 = await avatar1.methods["getAccountLiquidity()"]();
        expectedLiquidity(accLiquidityOfAvatar1, {
          expectedErr: ZERO,
          expectedLiquidityAmt: availLiquidityUSD,
          expectedShortFallAmt: ZERO,
        });

        accLiqOfAvatar1OnCompound = await comptroller.getAccountLiquidity(avatar1.address);
        expectedLiquidity(accLiqOfAvatar1OnCompound, {
          expectedErr: ZERO,
          expectedLiquidityAmt: availLiquidityUSD,
          expectedShortFallAmt: ZERO,
        });

        // 12. validate member balance
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
      });

      it("member topup, user repay, member untop (ZRX Collteral, Borrow BAT)", async () => {
        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 500 BAT = $500

        await setupSmallLoan_ZRXCollateral_BorrowBAT();
        await batTopupRepayUntop();
      });

      it("member topup, user repay, member untop (ETH Collteral, Borrow BAT)", async () => {
        // user1 collateral 1000 ETH = $1000
        // user1 borrowed 500 BAT = $500

        await setupSmallLoan_ETHCollateral_BorrowBAT();

        await batTopupRepayUntop();
      });

      it("member topup, user repay, member untop (ZRX Collteral, Borrow ETH)", async () => {
        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 5 ETH = $500

        await setupSmallLoan_ZRXCollateral_BorrowETH();

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
          expectedIsSmall: true,
        });

        // member deposit
        await pool.methods["deposit()"]({
          from: a.member1,
          value: expectedMinTopup,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // topup
        const tx = await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        const expectedExpire = new BN(
          (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp,
        ).add(holdingTime);

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);

        // user repay
        await bETH.repayBorrow({ from: a.user1, value: ONE_ETH });

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.canUntop.call()).to.be.equal(true);

        // member untop
        await pool.untop(a.user1, expectedMinTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // member withdraw
        await pool.withdraw(ETH_ADDR, expectedMinTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
      });

      it("member topup, partial liquidate, user repay, member untop (ZRX Collteral, Borrow BAT)", async () => {
        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 500 BAT = $500

        await setupSmallLoan_ZRXCollateral_BorrowBAT();

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
          expectedIsSmall: true,
        });

        // member deposit
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMinTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // topup
        const tx = await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        const expectedExpire = new BN(
          (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp,
        ).add(holdingTime);

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);

        // partial liquidation
        const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
        const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, debtToLiquidate);
        const amtToDeductFromTopup = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];
        const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));

        // member deposit
        await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
          from: a.member1,
        });

        await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup.div(new BN(2)),
        );

        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup.div(new BN(2)),
          expectedAmountLiquidated: debtToLiquidate.div(new BN(2)),
        });

        expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

        // user repay
        await BAT.approve(bBAT_addr, ONE_HUNDRED_BAT, { from: a.user1 });
        await bBAT.repayBorrow(ONE_HUNDRED_BAT, { from: a.user1 });

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.canUntop.call()).to.be.equal(true);

        // member attempt liquidateBorrow, must fail
        await expectRevert(
          pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
            from: a.member1,
          }),
          "revert cannot-liquidate",
        );

        // member untop
        await pool.untop(a.user1, expectedMinTopup.div(new BN(2)), { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // member withdraw
        await pool.withdraw(BAT_addr, expectedMaxTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
      });

      it("member topup, partial liquidate, user repay, member untop (ETH Collteral, Borrow BAT)", async () => {
        // user1 collateral 10 ETH * $100 = $1000
        // user1 borrowed 500 BAT * $1 = $500

        await setupSmallLoan_ETHCollateral_BorrowBAT();

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
          expectedIsSmall: true,
        });

        // member deposit
        await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
          from: a.member1,
        });

        // topup
        await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
          from: a.member1,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);

        // partial liquidation
        const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
        const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, debtToLiquidate);
        const amtToDeductFromTopup = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];
        const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));

        // member deposit
        await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
        await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
          from: a.member1,
        });

        await pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
          expectedMinTopup.div(new BN(2)),
        );

        expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

        // user repay
        await BAT.approve(bBAT_addr, ONE_HUNDRED_BAT, { from: a.user1 });
        await bBAT.repayBorrow(ONE_HUNDRED_BAT, { from: a.user1 });

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.canUntop.call()).to.be.equal(true);

        // member attempt liquidateBorrow, must fail
        await expectRevert(
          pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
            from: a.member1,
          }),
          "revert cannot-liquidate",
        );

        // member untop
        await pool.untop(a.user1, expectedMinTopup.div(new BN(2)), { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);

        // member withdraw
        await pool.withdraw(BAT_addr, expectedMaxTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
      });

      it("member topup, partial liquidate, user repay, member untop (ZRX Collteral, Borrow ETH)", async () => {
        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 5 ETH = $500

        await setupSmallLoan_ZRXCollateral_BorrowETH();

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
          expectedIsSmall: true,
        });

        // member deposit
        await pool.methods["deposit()"]({
          from: a.member1,
          value: expectedMinTopup,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMinTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMinTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // topup
        const tx = await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
          from: a.member1,
        });
        const expectedExpire = new BN(
          (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp,
        ).add(holdingTime);

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup,
        );

        // validate member topup info
        let memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup,
          expectedAmountLiquidated: ZERO,
        });

        expect(await avatar1.canLiquidate.call()).to.be.equal(true);
        expect(await avatar1.canUntop.call()).to.be.equal(false);

        // partial liquidation
        const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
        const result = await avatar1.calcAmountToLiquidate.call(cETH_addr, debtToLiquidate);
        const amtToDeductFromTopup = result["amtToDeductFromTopup"];
        const amtToRepayOnCompound = result["amtToRepayOnCompound"];
        const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));

        // member deposit
        await pool.methods["deposit()"]({
          from: a.member1,
          value: amtToRepayOnCompound,
        });

        await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
          from: a.member1,
        });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await balance.current(pool.address)).to.be.bignumber.equal(
          amtToRepayOnCompound.div(new BN(2)),
        );
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
          expectedMinTopup.div(new BN(2)),
        );

        // validate member topup info
        memberTopupInfo = await pool.getMemberTopupInfo(a.user1, a.member1);
        expectMemberTopupInfo(memberTopupInfo, {
          expectedExpire: expectedExpire,
          expectedAmountTopped: expectedMinTopup.div(new BN(2)),
          expectedAmountLiquidated: debtToLiquidate.div(new BN(2)),
        });

        expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

        // user repay
        await bETH.repayBorrow({ from: a.user1, value: ONE_ETH });

        expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        expect(await avatar1.canUntop.call()).to.be.equal(true);

        // member attempt liquidateBorrow, must fail
        await expectRevert(
          pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
            from: a.member1,
          }),
          "revert cannot-liquidate",
        );

        // member untop
        await pool.untop(a.user1, expectedMinTopup.div(new BN(2)), { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(expectedMaxTopup);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

        // member withdraw
        await pool.withdraw(ETH_ADDR, expectedMaxTopup, { from: a.member1 });

        // validate deposit & topup balance
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
        expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
      });

      describe("Member performs liquidations in chunks", async () => {
        describe("Big loan", async () => {
          it("ETH Collateral, Borrow BAT", async () => {
            // Collateral ETH 100 * $100 = $10000
            // Borrow BAT 5000 * $1 = $5000

            await setupBigLoan_ETHCollateral_BorrowBAT();

            // Change BAT rate
            // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
            const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
            await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

            const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(false);

            // member deposit
            await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
              from: a.member1,
            });

            // topup
            await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cETH balances
            // $10000 collateral (100 ETH)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ETH open for liquidation
            // liquidated half = $2750 / 2 = $1375
            // liquidationIncentive $1375 * 110 / 100 = $1512.5
            // 1 ETH = $100, hence $1512.5 worth of ETH = 15.125 ETH
            const point1 = ONE_ETH.div(new BN(10));
            const point025 = point1.div(new BN(4));
            const point125 = point1.add(point025);
            await validateShareReceived(
              ONE_ETH.mul(new BN(15)).add(point125),
              cETH_addr,
              a.member1,
            );

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cETH balances
            // $10000 collateral (100 ETH)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ETH open for liquidation
            // liquidationIncentive $2750 * 110 / 100 = $3025
            // 1 ETH = $100, hence $3025 worth of ETH = 30.25 ETH
            const point25 = ONE_ETH.div(new BN(4));
            await validateShareReceived(ONE_ETH.mul(new BN(30)).add(point25), cETH_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
          });

          it("ZRX Collateral, Borrow BAT", async () => {
            // Collateral ZRX 10000 * $1 = $10000
            // Borrow BAT 5000 * $1 = $5000

            await setupBigLoan_ZRXCollateral_BorrowBAT();

            // Change BAT rate
            // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
            const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
            await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

            const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(false);

            // member deposit
            await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
              from: a.member1,
            });

            // topup
            await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $10000 collateral (10000 ZRX)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ZRX open for liquidation
            // liquidated half = $2750 / 2 = $1375
            // liquidationIncentive $1375 * 110 / 100 = $1512.5
            // 1 ZRX = $1, hence $1512.5 worth of ZRX = 1512.5 ZRX
            const point5 = ONE_ZRX.div(new BN(2));
            await validateShareReceived(
              ONE_ZRX.mul(new BN(1512)).add(point5),
              cZRX_addr,
              a.member1,
            );

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $10000 collateral (10000 ZRX)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ZRX open for liquidation
            // liquidationIncentive $2750 * 110 / 100 = $3025
            // 1 ZRX = $1, hence $3025 worth of ZRX = 3025 ZRX
            await validateShareReceived(ONE_ZRX.mul(new BN(3025)), cZRX_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
          });

          it("ZRX Collateral, Borrow ETH", async () => {
            // Collateral ZRX 10000 * $1 = $10000
            // Borrow ETH 50 * $100 = $5000

            await setupBigLoan_ZRXCollateral_BorrowETH();

            // Change ETH rate
            // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
            const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

            const debt = await bETH.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(false);

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cETH_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $10000 collateral (10000 ZRX)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ZRX open for liquidation
            // liquidated half = $2750 / 2 = $1375
            // liquidationIncentive $1375 * 110 / 100 = $1512.5
            // 1 ZRX = $1, hence $1512.5 worth of ZRX = 1512.5 ZRX
            const point5 = ONE_ZRX.div(new BN(2));
            await validateShareReceived(
              ONE_ZRX.mul(new BN(1512)).add(point5),
              cZRX_addr,
              a.member1,
            );

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $10000 collateral (10000 ZRX)
            // $5000 borrowed (5000 BAT) at $1 rate
            // 5000 BAT * $1.1 = $5500 (@ new rate)
            // hence $5500 / 2 = $2750 worth of ZRX open for liquidation
            // liquidationIncentive $2750 * 110 / 100 = $3025
            // 1 ZRX = $1, hence $3025 worth of ZRX = 3025 ZRX
            await validateShareReceived(ONE_ZRX.mul(new BN(3025)), cZRX_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
          });
        });

        describe("Small loan", async () => {
          it("ZRX Collteral, Borrow BAT", async () => {
            // user1 collateral 1000 ZRX = $1000
            // user1 borrowed 500 BAT = $500

            await setupSmallLoan_ZRXCollateral_BorrowBAT();

            // Change BAT rate
            // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
            const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
            await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

            const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(true);

            // member deposit
            await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
              from: a.member1,
            });

            // topup
            await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $1000 collateral (1000 ZRX)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 / 2 = $275 worth of ZRX will be liquidated
            // liquidating half $275 / 2 = $137.5
            // liquidationIncentive 137.5 * 110 / 100 = 151.25
            // 1 ZRX = $1, hence $151.25 worth of ZRX = 151.25 ZRX
            const point25 = ONE_ZRX.div(new BN(4));
            await validateShareReceived(
              ONE_ZRX.mul(new BN(151)).add(point25),
              cZRX_addr,
              a.member1,
            );

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $1000 collateral (1000 ZRX)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 / 2 = $275 worth of ZRX will be liquidated
            // liquidationIncentive $275 * 110 / 100 = $302.5
            // 1 ZRX = $1, hence $302.5 worth of ZRX = 302.5 ZRX
            const point5 = ONE_ZRX.div(new BN(2));
            await validateShareReceived(ONE_ZRX.mul(new BN(302)).add(point5), cZRX_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
          });

          it("ETH Collteral, Borrow BAT", async () => {
            // user1 collateral 10 ETH = $1000
            // user1 borrowed 500 BAT = $500

            await setupSmallLoan_ETHCollateral_BorrowBAT();

            // Change BAT rate
            // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
            const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
            await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

            const debt = await bBAT.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(true);

            // member deposit
            await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
              from: a.member1,
            });

            // topup
            await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cETH balances
            // $1000 collateral (10 ETH)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 / 2 = $275 worth of ETH open for liquidation
            // liquidating half $275 / 2 = $137.5
            // liquidationIncentive $137.5 * 110 / 100 = $151.25
            // 1 ETH = $100, hence $151.25 worth of ETH = 1.5125 ETH
            // NOTICE: BN does not support floating point
            const point01 = ONE_ETH.div(new BN(100));
            const poin0025 = point01.div(new BN(4));
            const point5125 = HALF_ETH.add(point01).add(poin0025);
            await validateShareReceived(ONE_ETH.add(point5125), cETH_addr, a.member1);

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            await pool.liquidateBorrow(a.user1, bETH_addr, bBAT_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cETH balances
            // $1000 collateral (10 ETH)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 worth of ETH open for liquidation
            // hence $550 / 2 = $275 worth of ETH open for liquidation
            // liquidationIncentive $275 * 110 / 100 = $302.5
            // 1 ETH = $100, hence $302.5 worth of ETH = 3.025 ETH
            // NOTICE: BN does not support floating point
            const point1 = ONE_ETH.div(new BN(10));
            const point025 = point1.div(new BN(4));
            await validateShareReceived(ONE_ETH.mul(new BN(3)).add(point025), cETH_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
            expect(await BAT.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, BAT_addr)).to.be.bignumber.equal(ZERO);
          });

          it("ZRX Collteral, Borrow ETH", async () => {
            // user1 collateral 1000 ZRX = $1000
            // user1 borrowed 5 ETH = $500

            await setupSmallLoan_ZRXCollateral_BorrowETH();

            // Change ETH rate
            // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
            const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

            const debt = await bETH.borrowBalanceCurrent.call(a.user1);
            const expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));

            const debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expect(debtTopupInfo["isSmall"]).to.be.equal(true);

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);

            // partial liquidation
            const debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            const halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            const result = await avatar1.calcAmountToLiquidate.call(cETH_addr, halfDebtToLiquidate);
            const amtToDeductFromTopup = result["amtToDeductFromTopup"];
            const amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $1000 collateral (1000 ZRX)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 / 2 = $275 worth of ZRX will be liquidated
            // liquidating half $275 / 2 = $137.5
            // liquidationIncentive 137.5 * 110 / 100 = 151.25
            // 1 ZRX = $1, hence $151.25 worth of ZRX = 151.25 ZRX
            const point25 = ONE_ZRX.div(new BN(4));
            await validateShareReceived(
              ONE_ZRX.mul(new BN(151)).add(point25),
              cZRX_addr,
              a.member1,
            );

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // member deposit again
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $1000 collateral (1000 ZRX)
            // $500 borrowed (500 BAT) at $1 rate
            // 500 BAT * $1.1 = $550 (@ new rate)
            // hence $550 / 2 = $275 worth of ZRX will be liquidated
            // liquidationIncentive $275 * 110 / 100 = $302.5
            // 1 ZRX = $1, hence $302.5 worth of ZRX = 302.5 ZRX
            const point5 = ONE_ZRX.div(new BN(2));
            await validateShareReceived(ONE_ZRX.mul(new BN(302)).add(point5), cZRX_addr, a.member1);

            // validate deposit & topup balance
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(false);
            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
          });
        });
      });

      describe("Partial liquidation, user operation (that reset it), another liquidation (with different collateral)", async () => {
        async function setupBigLoan_ZRX_and_BAT_Collateral_Borrow_ETH() {
          // setting high minThreshold so that the loan is small
          await pool.setMinSharingThreshold(bZRX_addr, new BN(1000).mul(ONE_ZRX));
          await pool.setMinSharingThreshold(bBAT_addr, new BN(1000).mul(ONE_BAT));
          await pool.setMinSharingThreshold(bETH_addr, new BN(50).mul(ONE_ETH));

          // Deployer transfer tokens
          await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });
          await BAT.transfer(a.user1, TEN_THOUSAND_BAT, { from: a.deployer });

          // user1 mints ZRX
          await ZRX.approve(bZRX_addr, TEN_THOUSAND_ZRX, { from: a.user1 });
          await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

          // user1 mints BAT
          await BAT.approve(bBAT_addr, TEN_THOUSAND_BAT, { from: a.user1 });
          await bBAT.mint(TEN_THOUSAND_BAT, { from: a.user1 });

          // user2 mints ETH
          await bETH.mint({ from: a.user2, value: HUNDRED_ETH });

          // user1 borrow ETH
          await bETH.borrow(HUNDRED_ETH, { from: a.user1 });
        }

        describe("Big Loan", async () => {
          it("ZRX & BAT Collateral, Borrowed ETH", async () => {
            // - user mint with ZRX, BAT collateral & borrow ETH
            // 10000 ZRX = $10000
            // 10000 BAT = $10000
            // Total Collateral = $20000
            // 100 ETH = $10000 Borrow
            await setupBigLoan_ZRX_and_BAT_Collateral_Borrow_ETH();

            // change rate
            // -----------
            // Change ETH rate
            // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
            const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

            let debt = await bETH.borrowBalanceCurrent.call(a.user1);
            let debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            let expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            let expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: false,
            });

            // - member topup
            // ---------------
            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            const tx = await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // - member deposit & do partial liquidate ZRX
            // -------------------------------------------
            let debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            let halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            let result = await avatar1.calcAmountToLiquidate.call(cETH_addr, halfDebtToLiquidate);
            let amtToDeductFromTopup = result["amtToDeductFromTopup"];
            let amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            // partial liquidation
            // -------------------
            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );

            // validate cZRX balances
            // $20000 collateral (10000 ZRX + 10000 BAT)
            // $10000 borrowed (100 ETH) at $100 rate
            // 100 ETH * $110 = $11000 (@ new rate)
            // hence 50% closeFactor of $11000 = $5500 worth of ZRX (5500 ZRX) open for liquidation
            // Liquidating half, hence $5500 / 2 => 2750 ZRX liquidate
            // liquidationIncentive 110% = 2750 * 110 / 100 = 3025 ZRX underlyingLiquidated
            const underlyingZRXLiquidated = ONE_ZRX.mul(new BN(3025));
            await validateShareReceived(underlyingZRXLiquidated, cZRX_addr, a.member1);

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);

            // try untop
            // ---------
            // Avatar `canUntop()` will be true
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            await expectRevert(
              pool.untop(a.user1, expectedMinTopup.div(new BN(2)), { from: a.member1 }),
              "Pool: cannot-untop-in-liquidation",
            );

            // validate
            // $20000 (ZRX + BAT) Collateral
            // $10000 ETH Borrowed
            // $5500 ZRX liquidated by member
            // 50% of $10000 (ETH 100) = 50 ETH 50% close factor = 25 ETH
            // 100 ETH - 25 ETH = 75 ETH
            expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
              ONE_ETH.mul(new BN(75)),
            );

            // avatar still topped up, hence, before repayBorrow
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

            // - user repay ETH
            // -----------------
            await bETH.repayBorrow({ from: a.user1, value: ONE_ETH });

            // block to denote the sub-section.
            {
              // pool received topped up amount back
              // ------------------------------------
              // user forced untop, hence, ETH balance at pool is back
              expect(await balance.current(pool.address)).to.be.bignumber.equal(
                expectedMinTopup.div(new BN(2)),
              );
              expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
              expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
                expectedMinTopup.div(new BN(2)),
              );

              // ---> member untop
              await pool.untop(a.user1, expectedMinTopup.div(new BN(2)), { from: a.member1 });

              expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
                expectedMinTopup.div(new BN(2)),
              );
              expect(await balance.current(pool.address)).to.be.bignumber.equal(
                expectedMinTopup.div(new BN(2)),
              );
              expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            }

            // 75 ETH - 1 ETH = 74 ETH
            expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
              ONE_ETH.mul(new BN(74)),
            );
            // 10000 - 3025 = 6975
            expect(await bZRX.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
              ONE_ZRX.mul(new BN(6975)),
            );
            // 10000
            expect(await bBAT.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
              ONE_BAT.mul(new BN(10000)),
            );

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isToppedUp()).to.be.equal(false);

            // validate new liquidity
            // 10000 BAT = $10000
            // 6975 ZRX = $6975
            // Collateral = $10000 + $6975 = $16975
            // Borrow = 74 ETH @ $110 = $8140
            // liquidity = borrowLimit - currentBorrow
            // borrowLimit = $8487.5
            // liquidity = $8587.5 - $8140 = $347.5
            const liquidity = await bComptroller.getAccountLiquidity(a.user1);
            expectAccountLiquidity(liquidity, {
              expectedErr: ZERO,
              expectedLiquidity: ONE_USD_IN_SCALE.mul(new BN(347)).add(HALF_USD_IN_SCALE),
              expectedShortFall: ZERO,
            });

            // - user position again open for liquidation
            // -------------------------------------------
            // Change rate of ETH to $115
            // Change ETH rate
            // ONE_USD_IN_SCALE * 115 = $115 per ETH (IN SCALE)
            const NEW_RATE_ETH_2 = ONE_USD_IN_SCALE.mul(new BN(115));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH_2);

            // borrowLimit = $8487.5
            // 74 ETH @ 115 = $8510
            // shortFall = borrowed - borrowLimit
            // shortFall = $8510 - $8487.5 = $22.5
            const newLiquidity = await bComptroller.getAccountLiquidity(a.user1);
            expectAccountLiquidity(newLiquidity, {
              expectedErr: ZERO,
              expectedLiquidity: ZERO,
              expectedShortFall: ONE_USD_IN_SCALE.mul(new BN(22)).add(HALF_USD_IN_SCALE),
            });

            // - member topup again
            // --------------------
            debt = await bETH.borrowBalanceCurrent.call(a.user1);
            debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              // ETH minSharingThreshold = 50 ETH, 74 ETH > 50 ETH = bigLoan = !IsSmall
              expectedIsSmall: false,
            });

            const alreadyDeposited = await pool.balance(a.member1, ETH_ADDR);
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup.sub(alreadyDeposited),
            });

            // topup
            await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            // - member deposit & do partial liquidate BAT
            // -------------------------------------------
            debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            halfDebtToLiquidate = debtToLiquidate.div(new BN(2));
            result = await avatar1.calcAmountToLiquidate.call(cETH_addr, halfDebtToLiquidate);
            amtToDeductFromTopup = result["amtToDeductFromTopup"];
            amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            // partial liquidation
            // -------------------
            await pool.liquidateBorrow(a.user1, bBAT_addr, bETH_addr, halfDebtToLiquidate, {
              from: a.member1,
            });

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(
              expectedMinTopup.div(new BN(2)),
            );

            // validate cBAT balances
            // 10000 BAT = $10000
            // 6975 ZRX = $6975
            // Collateral = $16975
            // Borrowed = 74 ETH @ 115 = $8510
            // hence 50% closeFactor of $8510 = $4255 worth of BAT (4255 BAT) open for liquidation
            // Liquidating half, hence $4255 / 2 => 2127.5 BAT liquidate
            // liquidationIncentive 110% = 2127.5 * 110 / 100 = 2340.25 BAT underlyingLiquidated
            const pointTwoFive = ONE_BAT.div(new BN(4));
            const underlyingBATLiquidated = ONE_BAT.mul(new BN(2340)).add(pointTwoFive);
            await validateShareReceived(underlyingBATLiquidated, cBAT_addr, a.member1);

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isPartiallyLiquidated()).to.be.equal(true);
          });
        });
      });

      describe("Full liquidation, then another liquiation for the same debt, then another liquiation for different debt", async () => {
        describe("Small Loan", async () => {
          it("ZRX Collateral, Borrow BAT and ETH", async () => {
            await setupSmallLoan_ZRX_Collateral_Borrow_BAT_ETH();

            // Change ETH rate
            // ONE_USD_IN_SCALE * 110 = $110 per ETH (IN SCALE)
            const NEW_RATE_ETH = ONE_USD_IN_SCALE.mul(new BN(110));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH);

            // 1. full liquidation ETH
            // =======================
            let debt = await bETH.borrowBalanceCurrent.call(a.user1);
            let debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            let expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            let expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: true,
            });

            // - member topup
            // ---------------
            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            const tx = await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // - member deposit & do liquidate ZRX
            // -------------------------------------------
            let debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            let result = await avatar1.calcAmountToLiquidate.call(cETH_addr, debtToLiquidate);
            let amtToDeductFromTopup = result["amtToDeductFromTopup"];
            let amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            // full liquidation
            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidate, {
              from: a.member1,
            });

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

            // validate cZRX balances
            // $10000 Collateral (10000 ZRX) @ 1 rate
            // $2500 Borrowed (25 ETH) at $100 old-rate
            // $2500 Borrowed (2500 BAT) at $1 rate

            // $2750 25 ETH Borrowed at $110 new-rate

            // Collateral = $10000
            // Total Borrowed = $2500 BAT + (25 * 110) ETH = $2500 + $2750 = $5250
            // ETH Borrowed value before liquidation $2750
            // hence 50% closeFactor of $2750 = $1375 worth of ZRX (1375 ZRX) open for liquidation
            // liquidationIncentive 110% = 1375 * 110 / 100 = 1512.5 ZRX underlyingLiquidated
            const point5 = ONE_ZRX.div(new BN(2));
            const underlyingZRXLiquidated = ONE_ZRX.mul(new BN(1512)).add(point5);
            await validateShareReceived(underlyingZRXLiquidated, cZRX_addr, a.member1);

            // 2. another liquidation ETH
            // ===========================
            expect(await avatar1.canUntop.call()).to.be.equal(true);

            // Change ETH rate
            // ONE_USD_IN_SCALE * 140 = $140 per ETH (IN SCALE)
            const NEW_RATE_ETH_2 = ONE_USD_IN_SCALE.mul(new BN(140));
            await priceOracle.setPrice(cETH_addr, NEW_RATE_ETH_2);

            debt = await bETH.borrowBalanceCurrent.call(a.user1);
            debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: true,
            });

            expect(await avatar1.isToppedUp()).to.be.equal(false);

            // - member topup
            // ---------------
            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            // TO CHECK THE LIQUIDITY AND SHORTFALL UNCOMMENT THE FOLLOWING CONSOLE
            // const liquidity = await bComptroller.getAccountLiquidity(a.user1);
            // console.log("liquidity: " + liquidity[1].toString());
            // const shortFall = liquidity[2];
            // console.log("shortFall: " + shortFall.toString());
            // const balZRX = await bZRX.balanceOfUnderlying.call(a.user1);
            // console.log("ZRX balance: " + balZRX.toString());
            // const borrowBalETH = await bETH.borrowBalanceCurrent.call(a.user1);
            // console.log("ETH borrow balance: " + borrowBalETH.toString());
            // const borrowBalBAT = await bBAT.borrowBalanceCurrent.call(a.user1);
            // console.log("BAT borrow balance: " + borrowBalBAT.toString());

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // - member deposit & do liquidate ZRX
            // -------------------------------------------
            debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
            result = await avatar1.calcAmountToLiquidate.call(cETH_addr, debtToLiquidate);
            amtToDeductFromTopup = result["amtToDeductFromTopup"];
            amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: amtToRepayOnCompound,
            });

            // full liquidation
            await pool.liquidateBorrow(a.user1, bZRX_addr, bETH_addr, debtToLiquidate, {
              from: a.member1,
            });

            // validate deposit & topup balance
            expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
            expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
            expect(await pool.topupBalance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);

            // validate cZRX balances
            // $8487.5 Collateral (8487.5 ZRX) @ 1 rate
            // $2500 Borrowed (2500 BAT) at $1 rate
            // $1750 12.5 ETH Borrowed at $140 new-rate
            // ETH Borrowed value before liquidation $1750
            // hence 50% closeFactor of $1750 = $875 worth of ZRX (875 ZRX) open for liquidation
            // liquidationIncentive 110% = 875 * 110 / 100 = 962.5 ZRX underlyingLiquidated
            const underlyingZRXLiquidated_2 = ONE_ZRX.mul(new BN(962)).add(point5);
            await validateShareReceived(
              underlyingZRXLiquidated.add(underlyingZRXLiquidated_2),
              cZRX_addr,
              a.member1,
            );

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);

            // 3. another liquidation for BAT
            // ===============================
            // Change BAT rate
            // ONE_USD_IN_SCALE * 130 / 100 = $1.3 (IN SCALE)
            const NEW_RATE_BAT = ONE_USD_IN_SCALE.mul(new BN(130)).div(new BN(100));
            await priceOracle.setPrice(cBAT_addr, NEW_RATE_BAT);

            // TO CHECK THE LIQUIDITY AND SHORTFALL UNCOMMENT THE FOLLOWING CONSOLE
            // const liquidity = await bComptroller.getAccountLiquidity(a.user1);
            // console.log("liquidity: " + liquidity[1].toString());
            // const shortFall = liquidity[2];
            // console.log("shortFall: " + shortFall.toString());
            // const balZRX = await bZRX.balanceOfUnderlying.call(a.user1);
            // console.log("ZRX balance: " + balZRX.toString());
            // const borrowBalETH = await bETH.borrowBalanceCurrent.call(a.user1);
            // console.log("ETH borrow balance: " + borrowBalETH.toString());
            // const borrowBalBAT = await bBAT.borrowBalanceCurrent.call(a.user1);
            // console.log("BAT borrow balance: " + borrowBalBAT.toString());

            debt = await bBAT.borrowBalanceCurrent.call(a.user1);
            debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
            expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: true,
            });

            expect(await avatar1.isToppedUp()).to.be.equal(false);

            // - member topup
            // ---------------
            // member deposit
            await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
              from: a.member1,
            });

            // topup
            await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(true);
            expect(await avatar1.canUntop.call()).to.be.equal(false);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // - member deposit & do liquidate BAT
            // -------------------------------------------
            debtToLiquidate = await avatar1.getMaxLiquidationAmount.call(cBAT_addr);
            result = await avatar1.calcAmountToLiquidate.call(cBAT_addr, debtToLiquidate);
            amtToDeductFromTopup = result["amtToDeductFromTopup"];
            amtToRepayOnCompound = result["amtToRepayOnCompound"];

            // member deposit
            // member deposit
            await BAT.approve(pool.address, amtToRepayOnCompound, { from: a.member1 });
            await pool.methods["deposit(address,uint256)"](BAT_addr, amtToRepayOnCompound, {
              from: a.member1,
            });

            // full liquidation
            await pool.liquidateBorrow(a.user1, bZRX_addr, bBAT_addr, debtToLiquidate, {
              from: a.member1,
            });

            // validate cZRX balances
            // $7525 Collateral (7525 ZRX) @ 1 rate
            // $3250 Borrowed (2500 BAT) at $1.3 rate
            // $875 6.25 ETH Borrowed at $140 new-rate
            // BAT liquidated, hence $3250 is under liquidation
            // hence 50% closeFactor of $$3250 = $1625 worth of ZRX (1625 ZRX) open for liquidation
            // liquidationIncentive 110% = 1625 * 110 / 100 = 1787.5 ZRX underlyingLiquidated
            const underlyingZRXLiquidated_3 = ONE_ZRX.mul(new BN(1787)).add(point5);
            await validateShareReceived(
              underlyingZRXLiquidated.add(underlyingZRXLiquidated_2).add(underlyingZRXLiquidated_3),
              cZRX_addr,
              a.member1,
            );
          });
        });
      });

      describe("topup to a small debt, then increasing the debt, and let another liquidator top it up", async () => {
        describe("Small Loan", async () => {
          it("ZRX Collateral, Borrow ETH", async () => {
            // setting high minThreshold so that the loan is small
            await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
            await pool.setMinSharingThreshold(bETH_addr, new BN(100).mul(ONE_ETH));

            await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });

            // User-2 mint cETH with ETH
            await bETH.mint({ from: a.user2, value: TEN_ETH });

            // User-1 mint cZRX with ZRX
            await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user1 });
            await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

            // User1 borrow ETH
            const point5ETH = ONE_ETH.div(new BN(2));
            const FOUR_ETH = ONE_ETH.mul(new BN(4));
            // Borrow 4.5 ETH
            await bETH.borrow(FOUR_ETH.add(point5ETH), { from: a.user1 });

            // 1000 ZRX = $1000 (Collateral)
            // 4.5 ETH = $450 (Borrow)

            // 1. member1 topup small loan
            // ===========================
            let debt = await bETH.borrowBalanceCurrent.call(a.user1);
            let debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            let expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            let expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: true,
            });

            // - member topup
            // ---------------
            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            const txTopupMember1 = await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // 2. user increase debt
            // ======================
            await bETH.borrow(point5ETH, { from: a.user1 });

            // 3. member2 topup
            // =================
            debt = await bETH.borrowBalanceCurrent.call(a.user1);
            debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: true,
            });

            // - member2 topup
            // ---------------
            // member2 deposit
            await pool.methods["deposit()"]({
              from: a.member2,
              value: expectedMinTopup,
            });

            const holdingTimeExpireAt = new BN(
              (await web3.eth.getBlock(txTopupMember1.receipt.blockNumber)).timestamp,
            ).add(holdingTime);

            // before expire, member2 cannot topup
            // try topup by member2
            await expectRevert(
              pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
                from: a.member2,
              }),
              "Pool: other-member-topped",
            );

            await time.increase(holdingTimeExpireAt);

            pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member2,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isToppedUp()).to.be.equal(true);
          });
        });
      });

      describe("topup to a big debt, then debt becomes smaller, and another liquidator topup", async () => {
        describe("Big Loan", async () => {
          it("ZRX Collateral, Borrow ETH", async () => {
            await pool.setMinSharingThreshold(bZRX_addr, new BN(1000).mul(ONE_ZRX));
            await pool.setMinSharingThreshold(bETH_addr, new BN(40).mul(ONE_ETH));

            await ZRX.transfer(a.user1, TEN_THOUSAND_ZRX, { from: a.deployer });

            // User-1 mint cZRX with ZRX
            await ZRX.approve(bZRX.address, TEN_THOUSAND_ZRX, { from: a.user1 });
            await bZRX.mint(TEN_THOUSAND_ZRX, { from: a.user1 });

            // User-2 mint cETH with ETH
            await bETH.mint({ from: a.user2, value: HUNDRED_ETH });

            // User1 borrow ETH
            await bETH.borrow(FIFTY_ETH, { from: a.user1 });

            // 10000 ZRX = $1000 (Collateral)
            // 50 ETH = $550 (Borrow)

            // 1. member1 topup small loan
            // ===========================
            let debt = await bETH.borrowBalanceCurrent.call(a.user1);
            let debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            let expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            let expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: false,
            });

            // - member topup
            // ---------------
            // member deposit
            await pool.methods["deposit()"]({
              from: a.member1,
              value: expectedMinTopup,
            });

            // topup
            await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member1,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isToppedUp()).to.be.equal(true);

            // 2. user decrease debt
            // ======================
            await bETH.repayBorrow({ from: a.user1, value: ONE_ETH });

            // 3. member2 topup
            // =================
            debt = await bETH.borrowBalanceCurrent.call(a.user1);
            debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
            expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
            expectedMaxTopup = debt.div(await pool.membersLength());
            expectDebtTopupInfo(debtTopupInfo, {
              expectedMinTopup: expectedMinTopup,
              expectedMaxTopup: expectedMaxTopup,
              expectedIsSmall: false,
            });

            // - member2 topup
            // ---------------
            // member2 deposit
            await pool.methods["deposit()"]({
              from: a.member2,
              value: expectedMinTopup,
            });

            pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
              from: a.member2,
            });

            expect(await avatar1.canLiquidate.call()).to.be.equal(false);
            expect(await avatar1.canUntop.call()).to.be.equal(true);
            expect(await avatar1.isToppedUp()).to.be.equal(true);
          });
        });
      });

      describe("topup to debt A, user repay, and then topup to debt B", async () => {
        it("ZRX Collateral, Borrow BAT and ETH ", async () => {
          await setupSmallLoan_ZRX_Collateral_Borrow_BAT_ETH();

          // 1. member topup debt ETH
          // =========================
          let debt = await bETH.borrowBalanceCurrent.call(a.user1);
          let debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
          let expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
          let expectedMaxTopup = debt.div(await pool.membersLength());
          expectDebtTopupInfo(debtTopupInfo, {
            expectedMinTopup: expectedMinTopup,
            expectedMaxTopup: expectedMaxTopup,
            expectedIsSmall: true,
          });

          // - member topup
          // ---------------
          // member deposit
          await pool.methods["deposit()"]({
            from: a.member1,
            value: expectedMinTopup,
          });

          // topup
          await pool.topup(a.user1, bETH_addr, expectedMinTopup, false, {
            from: a.member1,
          });

          expect(await avatar1.canLiquidate.call()).to.be.equal(false);
          expect(await avatar1.canUntop.call()).to.be.equal(true);
          expect(await avatar1.isToppedUp()).to.be.equal(true);

          // 2. user repay
          // ==============
          await bETH.repayBorrow({ from: a.user1, value: ONE_ETH });

          // 3. member topup debt BAT
          // =========================
          debt = await bBAT.borrowBalanceCurrent.call(a.user1);
          debtTopupInfo = await pool.getDebtTopupInfo.call(a.user1, bBAT_addr);
          expectedMinTopup = debt.mul(minTopupBps).div(new BN(10000));
          expectedMaxTopup = debt.div(await pool.membersLength());
          expectDebtTopupInfo(debtTopupInfo, {
            expectedMinTopup: expectedMinTopup,
            expectedMaxTopup: expectedMaxTopup,
            expectedIsSmall: true,
          });

          // - member topup
          // ---------------
          // member deposit
          await BAT.approve(pool.address, expectedMinTopup, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](BAT_addr, expectedMinTopup, {
            from: a.member1,
          });

          // topup
          await pool.topup(a.user1, bBAT_addr, expectedMinTopup, false, {
            from: a.member1,
          });

          expect(await avatar1.canLiquidate.call()).to.be.equal(false);
          expect(await avatar1.canUntop.call()).to.be.equal(true);
          expect(await avatar1.isToppedUp()).to.be.equal(true);
        });
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
