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

    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const TEN_ZRX = new BN(10).mul(ONE_ZRX);
    const FIFTY_ZRX = new BN(50).mul(ONE_ZRX);
    const ONE_HUNDRED_ZRX = new BN(100).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);

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

    describe("Pool.getDebtTopupInfo()", async () => {
      beforeEach(async () => {
        // user has debt position
      });

      it("should get minDebt and isSmall of user's debt");

      it("should get isSmall=true when debt below minSharingThreshold");

      it("should get isSmall=false when debt above or equal minSharingThreshold");
    });

    describe("Pool.untop()", async () => {
      it("");
    });

    describe("Pool.smallTopupWinner()", async () => {
      it("");
    });

    describe("Pool.topup()", async () => {
      it("");
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
