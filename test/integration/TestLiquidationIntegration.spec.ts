import * as b from "../../types/index";

import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { toWei } from "web3-utils";
import BN from "bn.js";
import { expectedLiquidity, expectMarket } from "../../test-utils/expectUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers");

const ERC20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const CEther: b.CEtherContract = artifacts.require("CEther");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

contract("Pool performs liquidation", async (accounts) => {
  let bProtocol: BProtocol;

  const deployer = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];

  let member1: string;
  let member2: string;
  let member3: string;
  let member4: string;

  const engine = new BProtocolEngine(accounts);
  const compound = new CompoundUtils();

  // Compound Contracts
  let comptroller: b.ComptrollerInstance;
  let priceOracle: b.FakePriceOracleInstance;

  // BToken Contracts
  let bETH: b.BEtherInstance;
  let bZRX: b.BErc20Instance;

  // Avatar Contracts
  let avatarUser1: b.AvatarInstance;
  let avatarUser2: b.AvatarInstance;

  // CTokens
  let cETH_addr: string;
  let cETH: b.CEtherInstance;
  let bETH_addr: string;
  let cZRX_addr: string;
  let cZRX: b.CErc20Instance;
  let bZRX_addr: string;

  // ZRX
  let ZRX: b.Erc20DetailedInstance;
  let ONE_ZRX: BN;
  let HUNDRED_ZRX: BN;

  // SCALE
  const SCALE = new BN(10).pow(new BN(18));

  // USD
  const USD_PER_ETH = new BN(100); // $100
  const ONE_ETH_RATE_IN_SCALE = SCALE;
  const ONE_USD_IN_SCALE = ONE_ETH_RATE_IN_SCALE.div(USD_PER_ETH);

  // Collateral Factor
  const HUNDRED_PERCENT = SCALE;
  const FIFTY_PERCENT = HUNDRED_PERCENT.div(new BN(2));

  async function init() {
    cETH_addr = compound.getContracts("cETH");
    cETH = await CEther.at(cETH_addr);
    cZRX_addr = compound.getContracts("cZRX");
    cZRX = await CErc20.at(cZRX_addr);

    ZRX = await ERC20Detailed.at(compound.getContracts("ZRX"));
    const decimals_ZRX = await ZRX.decimals();
    ONE_ZRX = new BN(10).pow(new BN(decimals_ZRX));
    HUNDRED_ZRX = ONE_ZRX.mul(new BN(100));
  }

  before(async () => {
    // Deploy Compound
    await engine.deployCompound();

    // Initialize variables
    await init();

    // Deploy BProtocol contracts
    bProtocol = await engine.deployBProtocol();
    comptroller = bProtocol.compound.comptroller;
    priceOracle = bProtocol.compound.priceOracle;

    member1 = bProtocol.members[0];
    member2 = bProtocol.members[1];
    member3 = bProtocol.members[2];
    member4 = bProtocol.members[3];
  });

  it("0. should set pre-condition", async () => {
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
  });

  it("1. should deploy BToken Contracts for cETH & cZRX", async () => {
    // BToken cETH
    bETH = await engine.deployNewBEther();
    expect(bETH.address).to.be.not.equal(ZERO_ADDRESS);
    bETH_addr = bETH.address;

    // BToken cZRX
    bZRX = await engine.deployNewBErc20("cZRX");
    expect(bZRX.address).to.be.not.equal(ZERO_ADDRESS);
    bZRX_addr = bZRX.address;
  });

  it("2. should deploy Avatar Contracts for User-1 and User-2", async () => {
    // Create Avatar for User1
    avatarUser1 = await engine.deployNewAvatar(user1);
    expect(avatarUser1.address).to.be.not.equal(ZERO_ADDRESS);

    // Create Avatar for User2
    avatarUser2 = await engine.deployNewAvatar(user2);
    expect(avatarUser2.address).to.be.not.equal(ZERO_ADDRESS);
  });

  it("3. User-1 should mint cETH with ETH", async () => {
    const bETH_addr = bETH.address;
    const balanceBefore = await cETH.balanceOf(avatarUser1.address);
    await bETH.mint({ from: user1, value: toWei("1", "ether") });
    const balanceAfter = await cETH.balanceOf(avatarUser1.address);
    expect(balanceAfter).to.be.bignumber.gt(balanceBefore);

    await bProtocol.bComptroller.enterMarket(bETH_addr, { from: user1 });
    const isAvatar1_has_ETH_membership = await comptroller.checkMembership(
      avatarUser1.address,
      cETH_addr,
    );
    expect(isAvatar1_has_ETH_membership).to.be.equal(true);
  });

  it("4. User-2 should mint cZRX with ZRX", async () => {
    await ZRX.transfer(user2, HUNDRED_ZRX, { from: deployer });

    await ZRX.approve(bZRX.address, HUNDRED_ZRX, { from: user2 });
    const balanceBefore = await cZRX.balanceOf(avatarUser2.address);
    await bZRX.mint(HUNDRED_ZRX, { from: user2 });
    const balanceAfter = await cZRX.balanceOf(avatarUser2.address);
    expect(balanceAfter).to.be.bignumber.gt(balanceBefore);
  });

  it("5. should validate setup ", async () => {
    // Validate ETH Market
    const ethMarket = await comptroller.markets(cETH_addr);
    expectMarket(ethMarket, true, FIFTY_PERCENT);

    // Validate ZRX Market
    const zrxMarket = await comptroller.markets(cZRX_addr);
    expectMarket(ethMarket, true, FIFTY_PERCENT);

    // Validate borrow paused
    const isZRX_BorrowPaused = await comptroller.borrowGuardianPaused(cZRX_addr);
    expect(isZRX_BorrowPaused).to.be.equal(false);

    // Validate Avatar1 ETH membership
    const isAvatar1_has_ETH_membership = await comptroller.checkMembership(
      avatarUser1.address,
      cETH_addr,
    );
    expect(isAvatar1_has_ETH_membership).to.be.equal(true);

    // Validate Avatar2 ZRX membership
    const isAvatar2_has_ZRX_membership = await comptroller.checkMembership(
      avatarUser2.address,
      cZRX_addr,
    );
    expect(isAvatar2_has_ZRX_membership).to.be.equal(true);

    // Validate User-1 account liquidity
    let accountLiquidity = await comptroller.getAccountLiquidity(avatarUser1.address);
    const FIFTY_USD_IN_SCALE = ONE_USD_IN_SCALE.mul(new BN(50));
    expectedLiquidity(accountLiquidity, ZERO, FIFTY_USD_IN_SCALE, ZERO);

    // Validate User-2 account liquidity
    accountLiquidity = await comptroller.getAccountLiquidity(avatarUser2.address);
    // TODO fix this later
    // TODO Find out why Liquidity is not FIFTY_USD
    // expectedLiquidity(accountLiquidity, ZERO, FIFTY_USD_IN_SCALE, ZERO, true);
  });

  it("6. User-1 should borrow ZRX", async () => {
    // Borrow 50 ZRX
    const FIFTY_ZRX = ONE_ZRX.mul(new BN(50));
    const zrxBalBefore = await ZRX.balanceOf(user1);
    await bZRX.borrow(FIFTY_ZRX, { from: user1 });
    const zrxBalAfter = await ZRX.balanceOf(user1);
    expect(zrxBalAfter).to.be.bignumber.gt(zrxBalBefore);

    // Validate account liquidity on Compound
    const accLiquidityOnCompound = await comptroller.getAccountLiquidity(avatarUser1.address);
    expectedLiquidity(accLiquidityOnCompound, ZERO, ZERO, ZERO);

    // account liquidity on Avatar
    const accLiquidityOnAvatar = await avatarUser1.methods["getAccountLiquidity()"]();
    expectedLiquidity(accLiquidityOnAvatar, ZERO, ZERO, ZERO);
  });

  it("7. Member should topup via pool", async () => {
    const pool: b.PoolInstance = bProtocol.pool;

    // Ensure member1 has ZRX balance
    const zrxBal = await ZRX.balanceOf(member1);
    expect(zrxBal).to.be.bignumber.gt(ZERO);

    // Topup amount
    const TEN_ZRX = ONE_ZRX.mul(new BN(10));
    const topupAmount = TEN_ZRX;

    // member1 deposits to pool
    await ZRX.approve(pool.address, TEN_ZRX, { from: member1 });
    await pool.methods["deposit(address,uint256)"](ZRX.address, TEN_ZRX, { from: member1 });

    await pool.topup(user1, bZRX_addr, topupAmount, false, { from: member1 });

    const zrxBalAfter = await ZRX.balanceOf(pool.address);

    // account liquidity on Compound
    const accLiquidityOnCompound = await comptroller.getAccountLiquidity(avatarUser1.address);
    const expectedLiquidityInUSD = ONE_USD_IN_SCALE.mul(new BN(10)); // $10
    expectedLiquidity(accLiquidityOnCompound, ZERO, expectedLiquidityInUSD, ZERO);

    // account liquidity on Avatar
    const accLiquidityOnAvatar = await avatarUser1.methods["getAccountLiquidity()"]();
    expectedLiquidity(accLiquidityOnAvatar, ZERO, ZERO, ZERO);
  });

  it("8. should increase ZRX rate to $1.1", async () => {
    // ONE_USD_IN_SCALE * 110 / 100 = $1.1 (IN SCALE)
    const NEW_RATE = ONE_USD_IN_SCALE.mul(new BN(110)).div(new BN(100));
    await priceOracle.setPrice(cZRX_addr, NEW_RATE);

    const getZRXPrice = await priceOracle.getUnderlyingPrice(cZRX_addr);
    expect(NEW_RATE).to.be.bignumber.equal(getZRXPrice);

    const getETHPrice = await priceOracle.getUnderlyingPrice(cETH_addr);
    expect(ONE_ETH_RATE_IN_SCALE).to.be.bignumber.equal(getETHPrice);

    // account liquidity on Compound
    const accLiquidityOnCompound = await comptroller.getAccountLiquidity(avatarUser1.address);
    // maxBorrowAllowed = (collateralValue * collateralFactor / 1e18)
    const maxBorrowAllowed = ONE_ETH_RATE_IN_SCALE.mul(FIFTY_PERCENT).div(SCALE);

    // borrowed = ( zrxTokensBorrowed * newRate / 1e18)
    const FIFTY_ZRX = ONE_ZRX.mul(new BN(50));
    const borrowed = FIFTY_ZRX.mul(NEW_RATE).div(SCALE);

    // toppedUpValue = toppedUpZRX * newRate / 1e18
    const TEN_ZRX = ONE_ZRX.mul(new BN(10));
    const toppedUpValue = TEN_ZRX.mul(NEW_RATE).div(SCALE);

    // borrowedOnCompound = borrowed - toppedUpValue
    const borrowedOnCompound = borrowed.sub(toppedUpValue);

    // expectLiquidity = maxBorrowAllowed - borrowedOnCompound
    const expectLiquidity: BN = maxBorrowAllowed.sub(borrowedOnCompound);

    expectedLiquidity(accLiquidityOnCompound, ZERO, expectLiquidity, ZERO);

    // account liquidity on Avatar
    // expectShortFall = (borrowedOnCompound + toppedUpValue) - maxBorrowAllowed
    const expectShortFall = borrowedOnCompound.add(toppedUpValue).sub(maxBorrowAllowed);
    const accLiquidityOnAvatar = await avatarUser1.methods["getAccountLiquidity()"]();
    expectedLiquidity(accLiquidityOnAvatar, ZERO, ZERO, expectShortFall);
  });

  it("9. Member should liquidate via Pool", async () => {
    const pool = bProtocol.pool;

    // validate liquidation incentive
    const liquidationIncentive = await comptroller.liquidationIncentiveMantissa();
    const expectLiqIncentive = SCALE.mul(new BN(110)).div(new BN(100));
    expect(expectLiqIncentive).to.be.bignumber.equal(liquidationIncentive);

    for (let index = 0; index < 10; index++) {
      /*
            const isAllowed = await comptroller.transferAllowed.call(
                cETH_addr,
                avatarUser1.address,
                pool,
                seize_cEther,
            );
            const liq = await comptroller.getAccountLiquidity(avatarUser1.address);
            const red = await comptroller.redeemAllowed.call(
                cETH_addr,
                avatarUser1.address,
                seize_cEther,
            );
            console.log(
                "index: " +
                    index +
                    " transferAllowed: " +
                    isAllowed +
                    " Liquidity: " +
                    liq[1] +
                    " ShortFall: " +
                    liq[2] +
                    " RedeemAllowed: " +
                    red,
            );
            */
      const canLiquidate = await avatarUser1.canLiquidate.call();
      // console.log("canLiquidate: ", canLiquidate);
      console.log(
        "remainingLiquidationAmount: " + (await avatarUser1.remainingLiquidationAmount()),
      );

      if (canLiquidate) {
        let underlyingAmtToLiquidate = ONE_ZRX.mul(new BN(3));

        const maxLiquidationAmount = await avatarUser1.getMaxLiquidationAmount.call(cZRX_addr);
        const memberInfo = await pool.getMemberTopupInfo(user1, member1);
        const amountLiquidated = memberInfo["amountLiquidated"];
        console.log("amountLiquidated: " + amountLiquidated.toString());
        const amtAvailForLiquidation = maxLiquidationAmount;
        console.log("maxLiquidationAmount: " + maxLiquidationAmount.toString());

        const toppedUpAmount = await avatarUser1.toppedUpAmount();

        underlyingAmtToLiquidate = underlyingAmtToLiquidate.lt(amtAvailForLiquidation)
          ? underlyingAmtToLiquidate
          : amtAvailForLiquidation;

        const result = await avatarUser1.calcAmountToLiquidate.call(
          cZRX_addr,
          underlyingAmtToLiquidate,
        );
        const amtToRepayOnCompound = result[1];

        console.log("underlyingAmtToLiquidate: " + underlyingAmtToLiquidate.toString());
        console.log("amtToRepayOnCompound: " + amtToRepayOnCompound.toString());

        // member1 deposit
        const member1_ZRX_bal = await ZRX.balanceOf(member1);
        expect(member1_ZRX_bal).to.be.bignumber.gt(amtToRepayOnCompound);
        await ZRX.approve(pool.address, amtToRepayOnCompound, { from: member1 });
        await pool.methods["deposit(address,uint256)"](ZRX.address, amtToRepayOnCompound, {
          from: member1,
        });

        const resetApprove: boolean = (await ZRX.allowance(pool.address, avatarUser1.address)).gt(
          new BN(0),
        );
        await pool.liquidateBorrow(
          user1,
          bETH_addr,
          bZRX_addr,
          underlyingAmtToLiquidate,
          amtToRepayOnCompound,
          resetApprove,
          { from: member1 },
        );
      } else {
        // console.log("Cannot liquidate further");

        break;
      }
    }

    // const accLiquidityOnCompound = await comptroller.getAccountLiquidity(avatarUser1.address);
    // expectedLiquidity(accLiquidityOnCompound, ZERO, ZERO, ZERO);

    // const accLiquidityOnAvatar = await avatarUser1.getAccountLiquidity();
    // expectedLiquidity(accLiquidityOnAvatar, ZERO, ZERO, ZERO);
  });

  it("10. Member topup should be 0 after full liquidation", async () => {
    const pool = bProtocol.pool;
    let toppedUpAmount = await avatarUser1.toppedUpAmount();
    expect(ZERO).to.be.bignumber.equal(toppedUpAmount);

    const isToppedUp = await avatarUser1.isToppedUp();
    expect(false).to.be.equal(isToppedUp);

    const canLiquidate = await avatarUser1.canLiquidate.call();
    expect(false).to.be.equal(canLiquidate);
  });
});
