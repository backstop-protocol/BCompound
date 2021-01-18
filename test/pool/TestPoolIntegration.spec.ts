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

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
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
        expect(minTopupBps).to.be.bignumber.not.equal(ZERO);
      });

      async function setup_ZRXCollateral_BorrowBAT() {
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

      async function setup_ZRXCollateral_BorrowETH() {
        // User-1 mint cZRX with ZRX
        await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        // User-2 mint cETH with ETH
        await bETH.mint({ from: a.user2, value: TEN_ETH });

        // User1 borrow ETH
        await bETH.borrow(FIVE_ETH, { from: a.user1 });
      }

      it("should do simple liquidation", async () => {
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

        // 12. member withdraw
        // TODO
      });

      it("member topup, user repay, member untop (ZRX Collteral, Borrow BAT)", async () => {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
        await pool.setMinSharingThreshold(bBAT_addr, new BN(10000).mul(ONE_BAT));

        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 500 BAT = $500

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
      });

      it("member topup, partial liquidate, user repay, member untop (ZRX Collteral, Borrow BAT)", async () => {
        // setting high minThreshold so that the loan is small
        await pool.setMinSharingThreshold(bZRX_addr, new BN(10000).mul(ONE_ZRX));
        await pool.setMinSharingThreshold(bBAT_addr, new BN(10000).mul(ONE_BAT));

        // user1 collateral 1000 ZRX = $1000
        // user1 borrowed 500 BAT = $500

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
