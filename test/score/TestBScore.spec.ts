import * as b from "../../types/index";
import { BProtocolEngine, BProtocol, ONE_MONTH } from "../../test-utils/BProtocolEngine";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");
import BN from "bn.js";
import { CompoundUtils } from "@utils/CompoundUtils";
import { toWei } from "web3-utils";

const chai = require("chai");
const expect = chai.expect;
let snapshotId: string;
const ZERO = new BN(0);

const BScore: b.BScoreContract = artifacts.require("BScore");
const Avatar: b.AvatarContract = artifacts.require("Avatar");
const CToken: b.CTokenContract = artifacts.require("CToken");
const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const ComptrollerScenario: b.ComptrollerScenarioContract = artifacts.require("ComptrollerScenario");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

contract("BScore", async (accounts) => {
  const SIX_MONTHS = new BN(6).mul(ONE_MONTH);
  let bProtocol: BProtocol;
  let pool: b.PoolInstance;
  let bComptroller: b.BComptrollerInstance;
  let registry: b.RegistryInstance;
  let comptroller: b.ComptrollerInstance;
  let score: b.BScoreInstance;
  let compoundUtil: CompoundUtils;
  let priceOracle: b.FakePriceOracleInstance;
  let jar: b.CompoundJarInstance;
  let jarConnector: b.JarConnectorInstance;
  const a: BAccounts = new BAccounts(accounts);
  const engine = new BProtocolEngine(accounts);

  // Score variables
  let endDate: BN;
  let cTokens: string[];
  let supplyMultipliers: BN[];
  let borrowMultipliers: BN[];

  before(async () => {
    // Deploy Compound
    await engine.deployCompound();

    // Deploy BProtocol contracts
    bProtocol = await engine.deployBProtocol();
    pool = bProtocol.pool;
    bComptroller = bProtocol.bComptroller;
    registry = bProtocol.registry;
    score = bProtocol.score;
    jar = bProtocol.jar;
    jarConnector = bProtocol.jarConnector;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    priceOracle = bProtocol.compound.priceOracle;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
    await _load();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  async function _load() {
    endDate = new BN((await web3.eth.getBlock("latest")).timestamp).add(SIX_MONTHS);

    cTokens = [
      compoundUtil.getContracts("cETH"),
      compoundUtil.getContracts("cZRX"),
      compoundUtil.getContracts("cBAT"),
      compoundUtil.getContracts("cUSDT"),
      compoundUtil.getContracts("cWBTC"),
    ];

    supplyMultipliers = new Array(4);
    supplyMultipliers.push(new BN(1));
    supplyMultipliers.push(new BN(1));
    supplyMultipliers.push(new BN(1));
    supplyMultipliers.push(new BN(1));
    supplyMultipliers.push(new BN(1));

    borrowMultipliers = new Array(4);
    borrowMultipliers.push(new BN(1));
    borrowMultipliers.push(new BN(1));
    borrowMultipliers.push(new BN(1));
    borrowMultipliers.push(new BN(1));
    borrowMultipliers.push(new BN(1));
  }

  async function toCTokenAmount(cToken: string, underlyingAmt: BN) {
    const SCALE = new BN(10).pow(new BN(18));
    // underlying = cTokenAmt * exchangeRate / 1e18
    // cTokenAmt = (underlying * 1e18) / exchangeRate
    const cTKN = await CToken.at(cToken);
    const exchangeRate = await cTKN.exchangeRateCurrent.call();
    return underlyingAmt.mul(SCALE).div(exchangeRate);
  }

  async function advanceBlockInCompound(num: number) {
    const comptrollerScen = await ComptrollerScenario.at(comptroller.address);
    await comptrollerScen.fastForward(new BN(num));
  }

  async function nowTime() {
    return new BN((await web3.eth.getBlock("latest")).timestamp);
  }

  async function getCurrentCollScoreBalance(avatar: string, cToken: string) {
    const user = await score.user(avatar);
    const asset = await score.collAsset(cToken);
    return await score.getCurrentBalance(user, asset);
  }

  async function getCurrentDebtScoreBalance(avatar: string, cToken: string) {
    const user = await score.user(avatar);
    const asset = await score.debtAsset(cToken);
    return await score.getCurrentBalance(user, asset);
  }

  async function getGlobalCollScoreBalance(cToken: string) {
    const user = ZERO_ADDRESS;
    const asset = await score.collAsset(cToken);
    return await score.getCurrentBalance(user, asset);
  }

  async function getGlobalDebtScoreBalance(cToken: string) {
    const user = ZERO_ADDRESS;
    const asset = await score.debtAsset(cToken);
    return await score.getCurrentBalance(user, asset);
  }

  async function getNowCollScore(avatar: string, cToken: string) {
    const user = await score.user(avatar);
    const collAsset = await score.collAsset(cToken);
    return await score.getScore(user, collAsset, await nowTime(), 0, 0);
  }

  async function getNowDebtScore(avatar: string, cToken: string, now: BN) {
    const user = await score.user(avatar);
    const collAsset = await score.debtAsset(cToken);
    const start = await score.start();
    return await score.getScore(user, collAsset, now, start, 0);
  }

  function expectInRange(actualVal: BN, expectedVal: BN, plusMinusPercent: number) {
    const plusMinusRageBN = new BN(plusMinusPercent);
    expect(plusMinusRageBN.lt(new BN(100)));
    expect(plusMinusRageBN.gt(ZERO));

    const portion = actualVal.mul(plusMinusRageBN).div(new BN(100));
    expect(expectedVal).to.be.bignumber.lessThan(actualVal.add(portion));
    expect(expectedVal).to.be.bignumber.greaterThan(actualVal.sub(portion));
  }

  describe("BScore", async () => {
    // SCALE
    const SCALE = new BN(10).pow(new BN(18));

    // Collateral Factor
    const HUNDRED_PERCENT = SCALE;
    const FIFTY_PERCENT = HUNDRED_PERCENT.div(new BN(2));

    // USD
    const USD_PER_ETH = new BN(100); // $100
    const ONE_ETH_RATE_IN_SCALE = SCALE;
    const ONE_USD_IN_SCALE = ONE_ETH_RATE_IN_SCALE.div(USD_PER_ETH);

    const ONE_ETH = new BN(10).pow(new BN(18));
    const HALF_ETH = ONE_ETH.div(new BN(2));
    const FIVE_ETH = new BN(5).mul(ONE_ETH);
    const TEN_ETH = new BN(10).mul(ONE_ETH);
    const ZERO = new BN(0);

    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const TEN_ZRX = new BN(10).mul(ONE_ZRX);
    const ONE_HUNDRED_ZRX = new BN(100).mul(ONE_ZRX);
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);

    const ONE_USDT = new BN(10).pow(new BN(6));
    const ONE_HUNDRED_USDT = new BN(100).mul(ONE_USDT);
    const ONE_THOUSAND_USDT = new BN(1000).mul(ONE_USDT);
    const FIVE_HUNDRED_USDT = new BN(500).mul(ONE_USDT);

    const ONE_WBTC = new BN(10).pow(new BN(8));
    const HALF_WBTC = ONE_WBTC.div(new BN(2));
    const POINT_ONE_WBTC = ONE_WBTC.div(new BN(10));

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

    // WBTC
    let WBTC_addr: string;
    let WBTC: b.Erc20DetailedInstance;

    let bWBTC_addr: string;
    let bWBTC: b.BErc20Instance;

    let cWBTC_addr: string;
    let cWBTC: b.CErc20Instance;

    // ETH
    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    let cETH_addr: string;
    let cETH: b.CEtherInstance;

    // MAINNET DATA
    // =============
    // TOKEN PRICES
    const ONE_ETH_IN_USD_MAINNET = new BN("1617455000000000000000"); // 18 decimals, ($1617.45)
    const ONE_ZRX_IN_USD_MAINNET = new BN("1605584000000000000"); // 18 decimal, ($1.6)
    const ONE_USDT_IN_USD_MAINNET = new BN("1000000000000000000000000000000"); //30 decimals, ($1)
    const ONE_BAT_IN_USD_MAINNET = new BN("409988000000000000"); // 18 decimals, ($0.4)
    const ONE_WBTC_IN_USD_MAINNET = new BN("392028400000000000000000000000000"); // 28 decimals, ($39202.8)

    const _18d = new BN(10).pow(new BN(18));
    const _30d = new BN(10).pow(new BN(30));
    const _28d = new BN(10).pow(new BN(28));
    // ONE_ETH * 1e18 / ONE_ETH_IN_USD_MAINNET
    const ONE_USD_WO_ZRX_MAINNET = ONE_ZRX.mul(_18d).div(ONE_ZRX_IN_USD_MAINNET);
    const ONE_USD_WO_ETH_MAINNET = ONE_ETH.mul(_18d).div(ONE_ETH_IN_USD_MAINNET);
    const ONE_USD_WO_USDT_MAINNET = ONE_USDT.mul(_30d).div(ONE_USDT_IN_USD_MAINNET);
    const ONE_USD_WO_BAT_MAINNET = ONE_BAT.mul(_18d).div(ONE_BAT_IN_USD_MAINNET);
    const ONE_USD_WO_WBTC_MAINNET = ONE_WBTC.mul(_28d).div(ONE_WBTC_IN_USD_MAINNET);

    // COMP SPEEDS
    const cZRX_COMP_SPEEDS_MAINNET = new BN("1950000000000000");
    const cETH_COMP_SPEEDS_MAINNET = new BN("10750000000000000");
    const cUSDT_COMP_SPEEDS_MAINNET = new BN("9650000000000000");
    const cBAT_COMP_SPEEDS_MAINNET = new BN("1950000000000000");
    const cWBTC_COMP_SPEEDS_MAINNET = new BN("10750000000000000");

    async function setMainnetTokenPrice() {
      // mainnet snapshot prices
      await priceOracle.setPrice(cETH_addr, ONE_ETH_IN_USD_MAINNET);
      await priceOracle.setPrice(cZRX_addr, ONE_ZRX_IN_USD_MAINNET);
      await priceOracle.setPrice(cUSDT_addr, ONE_USDT_IN_USD_MAINNET);
      await priceOracle.setPrice(cBAT_addr, ONE_BAT_IN_USD_MAINNET);
      await priceOracle.setPrice(cWBTC_addr, ONE_WBTC_IN_USD_MAINNET);

      //   console.log("$1 ETH = " + ONE_USD_WO_ETH_MAINNET.toString());
      //   console.log("$1 ZRX = " + ONE_USD_WO_ZRX_MAINNET.toString());
      //   console.log("$1 USDT = " + ONE_USD_WO_USDT_MAINNET.toString());
      //   console.log("$1 BAT = " + ONE_USD_WO_BAT_MAINNET.toString());
      //   console.log("$1 WBTC = " + ONE_USD_WO_WBTC_MAINNET.toString());
    }

    async function setMainnetCompSpeeds() {
      const comptrollerScen = await ComptrollerScenario.at(comptroller.address);
      await comptrollerScen.setCompSpeed(cETH_addr, cETH_COMP_SPEEDS_MAINNET);
      await comptrollerScen.setCompSpeed(cZRX_addr, cZRX_COMP_SPEEDS_MAINNET);
      await comptrollerScen.setCompSpeed(cUSDT_addr, cUSDT_COMP_SPEEDS_MAINNET);
      await comptrollerScen.setCompSpeed(cBAT_addr, cBAT_COMP_SPEEDS_MAINNET);
      await comptrollerScen.setCompSpeed(cWBTC_addr, cWBTC_COMP_SPEEDS_MAINNET);
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

      // WBTC
      bWBTC = await engine.deployNewBErc20("cWBTC");
      bWBTC_addr = bWBTC.address;

      WBTC_addr = compoundUtil.getTokens("WBTC");
      WBTC = await Erc20Detailed.at(WBTC_addr);

      cWBTC_addr = compoundUtil.getContracts("cWBTC");
      cWBTC = await CErc20.at(cWBTC_addr);

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

      await WBTC.transfer(a.user1, ONE_WBTC, { from: a.deployer });
      expect(await WBTC.balanceOf(a.user1)).to.be.bignumber.equal(ONE_WBTC);

      await WBTC.transfer(a.user2, ONE_WBTC, { from: a.deployer });
      expect(await WBTC.balanceOf(a.user2)).to.be.bignumber.equal(ONE_WBTC);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      //   await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));

      // SET COLLATERAL FACTOR
      // =======================
      await comptroller._setCollateralFactor(cETH_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cZRX_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cBAT_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cUSDT_addr, FIFTY_PERCENT);
      await comptroller._setCollateralFactor(cWBTC_addr, FIFTY_PERCENT);

      //   // SET TOKEN PRICE
      //   const ethRate = ONE_USD_IN_SCALE.mul(new BN(100)); // $100
      //   await priceOracle.setPrice(cETH_addr, ethRate);
      //   await priceOracle.setPrice(cZRX_addr, ONE_USD_IN_SCALE); // $1
      //   await priceOracle.setPrice(cBAT_addr, ONE_USD_IN_SCALE); // $1
      //   await priceOracle.setPrice(cUSDT_addr, ONE_USD_IN_SCALE); // $1
      //   const wbtcRate = ONE_USD_IN_SCALE.mul(new BN(10000)); // $1000
      //   await priceOracle.setPrice(cWBTC_addr, wbtcRate);

      // MAINNET
      await setMainnetTokenPrice();

      await comptroller.refreshCompSpeeds();
    });

    describe("BScore.init()", async () => {
      it("should init", async () => {
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        const newScore = await BScore.new(
          registry.address,
          now,
          endDate,
          cTokens,
          supplyMultipliers,
          borrowMultipliers,
        );

        expect(await newScore.registry()).to.be.equal(registry.address);
        expect(await newScore.endDate()).to.be.bignumber.equal(endDate);

        for (let i = 0; i < cTokens.length; i++) {
          const cTokenAddr = cTokens[i];
          expect(await newScore.supplyMultiplier(cTokenAddr)).to.be.bignumber.equal(new BN(1));
          expect(await newScore.borrowMultiplier(cTokenAddr)).to.be.bignumber.equal(new BN(1));

          const initSnapshot = await newScore.initialSnapshot(cTokenAddr);
          const cToken = await CToken.at(cTokenAddr);
          const expectedExchangeRate = await cToken.exchangeRateCurrent.call();
          const borrowState = await comptroller.compBorrowState(cTokenAddr);
          const supplyState = await comptroller.compSupplyState(cTokenAddr);
          const expectedBorrowIndex = borrowState["index"];
          const expectedSupplyIndex = supplyState["index"];

          expect(expectedExchangeRate).to.be.bignumber.equal(initSnapshot["exchangeRate"]);
          expect(expectedSupplyIndex).to.be.bignumber.equal(initSnapshot["supplyIndex"]);
          expect(expectedBorrowIndex).to.be.bignumber.equal(initSnapshot["borrowIndex"]);
        }

        await newScore.updateIndex(cTokens);

        for (let i = 0; i < cTokens.length; i++) {
          const cTokenAddr = cTokens[i];
          const snapshot = await newScore.snapshot(cTokenAddr);
          const cToken = await CToken.at(cTokenAddr);
          const expectedExchangeRate = await cToken.exchangeRateCurrent.call();
          const borrowState = await comptroller.compBorrowState(cTokenAddr);
          const supplyState = await comptroller.compSupplyState(cTokenAddr);
          const expectedBorrowIndex = borrowState["index"];
          const expectedSupplyIndex = supplyState["index"];

          expect(expectedExchangeRate).to.be.bignumber.equal(snapshot["exchangeRate"]);
          expect(expectedSupplyIndex).to.be.bignumber.equal(snapshot["supplyIndex"]);
          expect(expectedBorrowIndex).to.be.bignumber.equal(snapshot["borrowIndex"]);
        }
      });

      it("should fail when endDate is not in the future", async () => {
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        await expectRevert(
          BScore.new(registry.address, now, now, cTokens, supplyMultipliers, borrowMultipliers),
          "Score: end-date-not-in-future",
        );
      });

      it("should fail when cToken address is zero", async () => {
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        await expectRevert(
          BScore.new(registry.address, now, endDate, [ZERO_ADDRESS], [new BN(1)], [new BN(1)]),
          "Score: cToken-address-is-zero",
        );
      });

      it("should fail when supplyMultiplier is zero", async () => {
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        await expectRevert(
          BScore.new(
            registry.address,
            now,
            endDate,
            [compoundUtil.getContracts("cETH")],
            [new BN(0)],
            [new BN(1)],
          ),
          "Score: supply-multiplier-is-zero",
        );
      });

      it("should fail when borrowMultiplier is zero", async () => {
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        await expectRevert(
          BScore.new(
            registry.address,
            now,
            endDate,
            [compoundUtil.getContracts("cETH")],
            [new BN(1)],
            [new BN(0)],
          ),
          "Score: borrow-multiplier-is-zero",
        );
      });
    });

    describe("BScore.slashScore()", async () => {
      it("when repayBorrowBehalf() on Compound", async () => {
        // user2 mints ZRX
        await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user2 });
        await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user2 });

        // user1 borrow ZRX
        const _1200USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(1200));
        const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
        await bETH.mint({ from: a.user1, value: _1200USD_ETH });
        await bZRX.borrow(_500USD_ZRX, { from: a.user1 });
        const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

        await advanceBlockInCompound(200);
        await time.increase(ONE_MONTH);

        await setMainnetCompSpeeds();

        // trigger borrow index update
        await comptroller.borrowAllowed(cZRX_addr, avatar1.address, ONE_ZRX);

        expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.not.equal(ZERO);
        expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
          cZRX_COMP_SPEEDS_MAINNET,
        );

        const prevBorrowBal = await bZRX.borrowBalanceCurrent.call(a.user1);
        expectInRange(prevBorrowBal, _500USD_ZRX, 1); // 1% in range, as interest on borrow
        const borrowInterestAccured = prevBorrowBal.sub(_500USD_ZRX);

        let userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
        expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_ZRX);

        await score.updateIndex(cTokens);
        const now = await nowTime();

        // repayBorrowBehalf() on Compound
        // Assume member4 = someone repaying on behalf of user1
        const _100USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(100));
        await ZRX.approve(cZRX_addr, _100USD_ZRX, { from: a.member4 });
        await cZRX.repayBorrowBehalf(avatar1.address, _100USD_ZRX, { from: a.member4 });

        // borrow balance reduced on B approx $400
        const currBorrowBal = await bZRX.borrowBalanceCurrent.call(a.user1);
        expect(currBorrowBal).to.be.bignumber.equal(prevBorrowBal.sub(_100USD_ZRX));

        // no change in score approx $500
        userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
        expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_ZRX);

        // someone slash score
        await score.slashScore(a.user1, cZRX_addr, { from: a.dummy1 });

        // score balance should be reduced
        userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
        expectInRange(userDebtScoreBalance, _500USD_ZRX.sub(_100USD_ZRX), 1);
      });
    });

    describe("Integration Tests", async () => {
      describe("=> Deployment setup pre-conditions check...", async () => {
        it("should have compMarket for all cTokens", async () => {
          // THIS TEST IS TO ENSURE THAT THE SETUP IS OK FOR FURTHER TESTS

          expect(await comptroller.compRate()).to.be.bignumber.not.equal(ZERO);

          for (let i = 0; i < cTokens.length; i++) {
            const cToken = cTokens[i];
            const name = await (await CToken.at(cToken)).name();
            // console.log("Checking market " + name + " ...");
            const market = await comptroller.markets(cToken);
            // console.log(market);
            expect(market["isListed"]).to.be.equal(true);
            expect(market["isComped"]).to.be.equal(true);
            expect(market["collateralFactorMantissa"]).to.be.bignumber.equal(FIFTY_PERCENT);
            // console.log("Market " + name + " OK.");
          }
        });

        it("should have all markets", async () => {
          const markets = await comptroller.getAllMarkets();
          expect(markets.length).to.be.equal(5);
          expect(markets[0]).to.be.equal(cETH_addr);
          expect(markets[1]).to.be.equal(cZRX_addr);
          expect(markets[2]).to.be.equal(cBAT_addr);
          expect(markets[3]).to.be.equal(cUSDT_addr);
          expect(markets[4]).to.be.equal(cWBTC_addr);
        });

        it("should have asset price for each market", async () => {
          for (let i = 0; i < cTokens.length; i++) {
            const cTokenAddr = cTokens[i];
            const cToken = await CToken.at(cTokenAddr);
            const name = await cToken.name();
            // console.log("Checking market " + name + " ...");
            const price = await bProtocol.compound.priceOracle.getUnderlyingPrice(cTokenAddr);
            expect(price).to.be.bignumber.not.equal(ZERO);
            // console.log(price.toString());
            expect(await cToken.borrowRatePerBlock()).to.be.bignumber.not.equal(ZERO);
            // console.log("Market " + name + " OK.");
          }
        });

        it("should have compSupplyIndex and compBorrowIndex for each cTokens", async () => {
          // THIS TEST IS TO ENSURE THAT THE SETUP IS OK FOR FURTHER TESTS

          for (let i = 0; i < cTokens.length; i++) {
            const cToken = cTokens[i];
            const name = await (await CToken.at(cToken)).name();
            // console.log("Checking market " + name + " ...");
            let compSupplyState = await comptroller.compSupplyState(cToken);
            // console.log(compSupplyState["index"]);
            // console.log(compSupplyState["block"]);
            expect(
              compSupplyState["index"],
              "not have index for cToken:" + name,
            ).to.be.bignumber.not.equal(ZERO);

            expect(
              compSupplyState["block"],
              "zero block for cToken:" + name,
            ).to.be.bignumber.not.equal(ZERO);

            let compBorrowState = await comptroller.compBorrowState(cToken);
            // console.log(compBorrowState["index"]);
            // console.log(compBorrowState["block"]);
            expect(
              compBorrowState["index"],
              "not have index for cToken:" + name,
            ).to.be.bignumber.not.equal(ZERO);
            expect(
              compBorrowState["block"],
              "zero block for cToken:" + name,
            ).to.be.bignumber.not.equal(ZERO);
            // console.log("Market " + name + " OK.");
          }
        });
      });

      describe("should have score when user mint", async () => {
        it("mint ZRX", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];
          //   console.log(prevCompSupplyIndex.toString());

          //   let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          //   const prevCompSupplyIndex = compSupplyState["index"];
          //   console.log("compSupplyState[cZRX].block: " + compSupplyState["block"]);
          //   console.log("compSupplyState[cZRX].index: " + compSupplyState["index"]);
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow ZRX so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // mint againt
          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1, ONE_ZRX);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          await score.updateIndex(cTokens);
          //   console.log("compSupplyState[cZRX].block: " + supplyState["block"]);
          //   console.log("compSupplyState[cZRX].index: " + compSupplyState["index"]);
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          expect(userCollScore).to.be.bignumber.not.equal(ZERO);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cZRX_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);
          //   console.log("userScore:" + userScore.toString());

          const supplyMultiplier = await score.supplyMultiplier(cZRX_addr);
          // ZRX supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(2));
          //   console.log("supplyMultiplier: " + supplyMultiplier.toString());
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cZRX.exchangeRateCurrent.call());
          console.log("Score deltaSupplyIndex: " + deltaSupplyIndex.toString());
          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);
          // score = multiplier  * speed * deltaBlocks * mintAmt * time
          console.log("expectedCollScore: " + expectedCollScore.toString());
          //   console.log("collScore: " + expectedCollScore.toString());
          //   console.log("compSpeeds[cZRX]: " + (await comptroller.compSpeeds(cZRX_addr)).toString());
          //   console.log("compRate: " + (await comptroller.compRate()).toString());
          //   console.log(
          //     "cZRX price: " +
          //       (await bProtocol.compound.priceOracle.getUnderlyingPrice(cZRX_addr)).toString(),
          //   );
          //   console.log("cZRX borrowRatePerBlock: " + (await cZRX.borrowRatePerBlock()).toString());
          //   console.log("cZRX totalBorrows: " + (await cZRX.totalBorrows()).toString());

          const globalCollScore = await score.getCollGlobalScore(cZRX_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          const globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ZRX);
        });

        it("mint ETH", async () => {
          let compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const prevCompSupplyIndex = compSupplyState["index"];
          //   console.log(prevCompSupplyIndex.toString());

          // user1 mint
          const _500USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(500));
          await bETH.mint({ from: a.user1, value: _500USD_ETH });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow ETH so that index changes
          await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user2 });
          await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user2 });
          await bETH.borrow(ONE_ETH.div(new BN(4)), { from: a.user2 });

          await advanceBlockInCompound(200);

          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_ETH);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.equal(
            cETH_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          console.log("cETH.totalSupply:" + (await cETH.totalSupply()).toString());
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cETH_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cETH_addr);
          // ETH supplyMultiplier is 5
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));
          //   console.log("currCompSupplyIndex: " + currCompSupplyIndex.toString());
          //   console.log("borrowRatePerBlock: " + (await cETH.borrowRatePerBlock()).toString());
          //   console.log("totalBorrows: " + (await cETH.totalBorrows()).toString());
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const actualDeltaSupplyIndex = currCompSupplyIndex.sub(prevCompSupplyIndex);
          console.log("actualDeltaIndex: " + actualDeltaSupplyIndex.toString());
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cETH.exchangeRateCurrent.call());
          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          console.log("Score deltaSupplyIndex: " + deltaSupplyIndex.toString());

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);
          //   console.log(userScore.toString());

          const globalCollScore = await score.getCollGlobalScore(cETH_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ETH);

          const globalScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ETH);
        });

        it("mint USDT", async () => {
          let compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(500));
          await USDT.approve(bUSDT_addr, _500USD_USDT, { from: a.user1 });
          await bUSDT.mint(_500USD_USDT, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow USDT so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bUSDT.borrow(ONE_HUNDRED_USDT, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cUSDT_addr, avatar1, ONE_USDT);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.equal(
            cUSDT_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cUSDT_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cUSDT_addr);
          // USDT supplyMultiplier is 3
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(3));
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cUSDT.exchangeRateCurrent.call());
          console.log("Score deltaSupplyIndex: " + deltaSupplyIndex.toString());

          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cUSDT_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cUSDT_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_USDT);

          const globalScoreBal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_USDT);
        });

        it("mint WBTC", async () => {
          let compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(500));
          await WBTC.approve(bWBTC_addr, _500USD_WBTC, { from: a.user1 });
          await bWBTC.mint(_500USD_WBTC, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow WBTC so that index changes
          const POINT_ZERO_ONE = POINT_ONE_WBTC.div(new BN(10)); // $100
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bWBTC.borrow(POINT_ZERO_ONE, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cWBTC_addr, avatar1, POINT_ZERO_ONE);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cWBTC_addr)).to.be.bignumber.equal(
            cWBTC_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cWBTC_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cWBTC_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cWBTC_addr);
          // WBTC supplyMultiplier is 5
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));
          //   console.log(prevCompSupplyIndex.toString());
          //   console.log(currCompSupplyIndex.toString());

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cWBTC.exchangeRateCurrent.call());
          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          console.log("deltaSupplyIndex: " + deltaSupplyIndex.toString());

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cWBTC_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_WBTC);

          const globalScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_WBTC);
        });
      });

      describe("should have score when user borrow", async () => {
        it("borrow ZRX", async () => {
          let compBorrowState = await comptroller.compBorrowState(cZRX_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          // user2 mints ZRX
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user2 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user2 });

          // user1 borrow ZRX
          const _1200USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(1200));
          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await bETH.mint({ from: a.user1, value: _1200USD_ETH });
          await bZRX.borrow(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);
          await time.increase(ONE_MONTH);

          await setMainnetCompSpeeds();

          // trigger borrow index update
          await comptroller.borrowAllowed(cZRX_addr, avatar1.address, ONE_ZRX);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.not.equal(ZERO);
          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_ZRX);

          compBorrowState = await comptroller.compBorrowState(cZRX_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cZRX_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(3));

          await score.updateIndex(cTokens);
          const now = await nowTime();

          const debtScore = await getNowDebtScore(avatar1.address, cZRX_addr, now);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
          //   console.log(borrowMultiplier.toString());
          //   console.log(deltaBorrowIndex.toString());
          //   console.log(debtScore.toString());
          const expectedDebtScore = borrowMultiplier
            .mul(deltaBorrowIndex)
            .div(SCALE)
            .mul(debtScore);

          const userDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          console.log("userDebtScore: " + userDebtScore.toString());
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cZRX_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(_500USD_ZRX);

          const globalDebtScore = await score.getDebtGlobalScore(cZRX_addr, now);
          expect(globalDebtScore).to.be.bignumber.equal(expectedDebtScore);

          const userScoreBal = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);
        });

        it("borrow ETH", async () => {
          let compBorrowState = await comptroller.compBorrowState(cETH_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          // user2 mints ETH
          await bETH.mint({ from: a.user2, value: FIVE_ETH });

          // user1 borrow ETH
          const _500USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(500));
          const _1200USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(1200));

          await ZRX.approve(bZRX_addr, _1200USD_ZRX, { from: a.user1 });
          await bZRX.mint(_1200USD_ZRX, { from: a.user1 });
          await bETH.borrow(_500USD_ETH, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);

          await setMainnetCompSpeeds();

          // trigger borrow index update
          await comptroller.borrowAllowed(cETH_addr, avatar1.address, ONE_USD_WO_ETH_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.equal(
            cETH_COMP_SPEEDS_MAINNET,
          );

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cETH_addr);
          expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_ETH);

          compBorrowState = await comptroller.compBorrowState(cETH_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cETH_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(10));

          await score.updateIndex(cTokens);
          const now = await nowTime();

          const debtScore = await getNowDebtScore(avatar1.address, cETH_addr, now);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
          const expectedDebtScore = borrowMultiplier
            .mul(deltaBorrowIndex)
            .div(SCALE)
            .mul(debtScore);

          const userDebtScore = await score.getDebtScore(a.user1, cETH_addr, now);
          console.log("userDebtScore: " + userDebtScore.toString());
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cETH_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(_500USD_ETH);

          const globalDebtScore = await score.getDebtGlobalScore(cETH_addr, now);
          expect(globalDebtScore).to.be.bignumber.equal(expectedDebtScore);

          const userScoreBal = await getCurrentDebtScoreBalance(avatar1.address, cETH_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ETH);
        });

        it("borrow USDT", async () => {
          let compBorrowState = await comptroller.compBorrowState(cUSDT_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          // user2 mints USDT
          await USDT.approve(bUSDT_addr, FIVE_HUNDRED_USDT, { from: a.user2 });
          await bUSDT.mint(FIVE_HUNDRED_USDT, { from: a.user2 });

          // user1 borrow USDT
          const _1200USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(1200));
          const _500USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(500));

          await bETH.mint({ from: a.user1, value: _1200USD_ETH });
          await bUSDT.borrow(_500USD_USDT, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);

          await setMainnetCompSpeeds();

          // trigger borrow index update
          await comptroller.borrowAllowed(cUSDT_addr, avatar1.address, ONE_USD_WO_USDT_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.equal(
            cUSDT_COMP_SPEEDS_MAINNET,
          );

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(
            avatar1.address,
            cUSDT_addr,
          );
          expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_USDT);

          compBorrowState = await comptroller.compBorrowState(cUSDT_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cUSDT_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(4));

          await score.updateIndex(cTokens);
          const now = await nowTime();

          const debtScore = await getNowDebtScore(avatar1.address, cUSDT_addr, now);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
          const expectedDebtScore = borrowMultiplier
            .mul(deltaBorrowIndex)
            .div(SCALE)
            .mul(debtScore);

          const userDebtScore = await score.getDebtScore(a.user1, cUSDT_addr, now);
          console.log("userDebtScore: " + userDebtScore.toString());
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cUSDT_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(_500USD_USDT);
        });

        it("borrow WBTC", async () => {
          let compBorrowState = await comptroller.compBorrowState(cWBTC_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          // user2 mints WBTC
          await WBTC.approve(bWBTC_addr, ONE_WBTC, { from: a.user2 });
          await bWBTC.mint(ONE_WBTC, { from: a.user2 });

          // user1 borrow USDT
          const _1200USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(1200));
          const _500USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(500));

          await bETH.mint({ from: a.user1, value: _1200USD_ETH });
          await bWBTC.borrow(_500USD_WBTC, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);

          await setMainnetCompSpeeds();

          // trigger borrow index update
          await comptroller.borrowAllowed(cWBTC_addr, avatar1.address, ONE_USD_WO_WBTC_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cWBTC_addr)).to.be.bignumber.equal(
            cWBTC_COMP_SPEEDS_MAINNET,
          );

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(
            avatar1.address,
            cWBTC_addr,
          );
          expect(userDebtScoreBalance).to.be.bignumber.equal(_500USD_WBTC);

          compBorrowState = await comptroller.compBorrowState(cWBTC_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cWBTC_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(10));

          await score.updateIndex(cTokens);
          const now = await nowTime();

          const debtScore = await getNowDebtScore(avatar1.address, cWBTC_addr, now);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
          const expectedDebtScore = borrowMultiplier
            .mul(deltaBorrowIndex)
            .div(SCALE)
            .mul(debtScore);

          const userDebtScore = await score.getDebtScore(a.user1, cWBTC_addr, now);
          console.log("userDebtScore: " + userDebtScore.toString());
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(_500USD_WBTC);
        });
      });

      describe("should have score when repay", async () => {
        it("mint-ETH, borrow-WBTC, repay-WBTC, redeem-ETH", async () => {
          // 1 =========
          // user1 mint
          const _5000USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(5000));
          await bETH.mint({ from: a.user1, value: _5000USD_ETH });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 mint WBTC
          await WBTC.approve(bWBTC_addr, ONE_WBTC, { from: a.user2 });
          await bWBTC.mint(ONE_WBTC, { from: a.user2 });
          const avatar2 = await registry.avatarOf(a.user2);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_ETH);

          await time.increase(ONE_MONTH);

          // Validate scores
          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.equal(
            cETH_COMP_SPEEDS_MAINNET,
          );

          let user1ETHScoreBal = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expect(user1ETHScoreBal).to.be.bignumber.equal(_5000USD_ETH);

          const user2WBTCScoreBal = await getCurrentCollScoreBalance(avatar2, cWBTC_addr);
          expect(user2WBTCScoreBal).to.be.bignumber.equal(ONE_WBTC);

          let globalETHScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expect(globalETHScoreBal).to.be.bignumber.equal(_5000USD_ETH);

          const globalWBTCScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalWBTCScoreBal).to.be.bignumber.equal(ONE_WBTC);

          // 2 ======
          // user1 borrow WBTC
          const _1000USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(1000));
          await bWBTC.borrow(_1000USD_WBTC, { from: a.user1 });

          let user1WBTCDebtScoreBal = await getCurrentDebtScoreBalance(avatar1, cWBTC_addr);
          expect(user1WBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC);

          let globalWBTCDebtScoreBal = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(globalWBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC);

          // 3 ======
          // user1 repay WBTC
          const _500USD_WBTC = _1000USD_WBTC.div(new BN(2));
          await WBTC.approve(bWBTC_addr, _500USD_WBTC, { from: a.user1 });
          await bWBTC.repayBorrow(_500USD_WBTC, { from: a.user1 });

          user1WBTCDebtScoreBal = await getCurrentDebtScoreBalance(avatar1, cWBTC_addr);
          expect(user1WBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC.sub(_500USD_WBTC));

          globalWBTCDebtScoreBal = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(globalWBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC.sub(_500USD_WBTC));

          // 4 =======
          // user1 redeem ETH
          const _1000USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(1000));
          await bETH.redeemUnderlying(_1000USD_ETH, { from: a.user1 });

          user1WBTCDebtScoreBal = await getCurrentDebtScoreBalance(avatar1, cWBTC_addr);
          expect(user1WBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC.sub(_500USD_WBTC));

          globalWBTCDebtScoreBal = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(globalWBTCDebtScoreBal).to.be.bignumber.equal(_1000USD_WBTC.sub(_500USD_WBTC));

          user1ETHScoreBal = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expect(user1ETHScoreBal).to.be.bignumber.equal(_5000USD_ETH.sub(_1000USD_ETH));

          globalETHScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expect(globalETHScoreBal).to.be.bignumber.equal(_5000USD_ETH.sub(_1000USD_ETH));
        });
      });

      describe("should have score when transfer", async () => {
        it("transfer ZRX", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1, ONE_USD_WO_ZRX_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cZRX_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cZRX_addr);
          // ZRX supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(2));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cZRX.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cZRX_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          let globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          // TRANSFER
          const _100USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cZRX_addr, _100USD_ZRX);

          await bZRX.transfer(a.dummy1, cTokenAmt, { from: a.user1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cZRX_addr);
          expectInRange(userScoreBalUser1, _500USD_ZRX.sub(_100USD_ZRX), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cZRX_addr);
          expectInRange(userScoreBalDummy1, _100USD_ZRX, 1);

          await time.increase(1);

          const dummy1CollScore = await score.getCollScore(a.dummy1, cZRX_addr, await nowTime());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);

          globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expectInRange(globalScoreBal, _500USD_ZRX, 1);
        });

        it("transfer ETH", async () => {
          let compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(500));
          await bETH.mint({ from: a.user1, value: _500USD_ETH });
          const avatar1 = await registry.avatarOf(a.user1);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_USD_WO_ETH_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.equal(
            cETH_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cETH_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cETH_addr);
          // ETH supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cETH.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cETH_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ETH);

          let globalScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ETH);

          // TRANSFER
          const _100USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cETH_addr, _100USD_ETH);

          await bETH.transfer(a.dummy1, cTokenAmt, { from: a.user1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expectInRange(userScoreBalUser1, _500USD_ETH.sub(_100USD_ETH), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cETH_addr);
          expectInRange(userScoreBalDummy1, _100USD_ETH, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expectInRange(globalScoreBal, _500USD_ETH, 1);
        });

        it("transfer USDT", async () => {
          let compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(500));
          await USDT.approve(bUSDT_addr, _500USD_USDT, { from: a.user1 });
          await bUSDT.mint(_500USD_USDT, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow USDT so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bUSDT.borrow(ONE_HUNDRED_USDT, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cUSDT_addr, avatar1, ONE_USDT);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.equal(
            cUSDT_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cUSDT_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cUSDT_addr);
          // USDT supplyMultiplier is 3
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(3));
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cUSDT.exchangeRateCurrent.call());
          console.log("Score deltaSupplyIndex: " + deltaSupplyIndex.toString());

          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cUSDT_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cUSDT_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_USDT);

          let globalScoreBal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_USDT);

          // TRANSFER
          const _100USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cUSDT_addr, _100USD_USDT);

          await bUSDT.transfer(a.dummy1, cTokenAmt, { from: a.user1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cUSDT_addr);
          expectInRange(userScoreBalUser1, _500USD_USDT.sub(_100USD_USDT), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cUSDT_addr);
          expectInRange(userScoreBalDummy1, _100USD_USDT, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cUSDT_addr);
          expectInRange(globalScoreBal, _500USD_USDT, 1);
        });

        it("transfer WBTC", async () => {
          let compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(500));
          await WBTC.approve(bWBTC_addr, _500USD_WBTC, { from: a.user1 });
          await bWBTC.mint(_500USD_WBTC, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow WBTC so that index changes
          const POINT_ZERO_ONE = POINT_ONE_WBTC.div(new BN(10)); // $100
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bWBTC.borrow(POINT_ZERO_ONE, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cWBTC_addr, avatar1, POINT_ZERO_ONE);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cWBTC_addr)).to.be.bignumber.equal(
            cWBTC_COMP_SPEEDS_MAINNET,
          );

          let userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          console.log("userScoreBalUser1: " + userScoreBalUser1.toString());

          compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          let now = await nowTime();
          let oldUserCollScore = await score.getCollScore(a.user1, cWBTC_addr, now);
          console.log("oldUserCollScore: " + oldUserCollScore.toString());
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cWBTC_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cWBTC_addr);
          // WBTC supplyMultiplier is 5
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));
          //   console.log(prevCompSupplyIndex.toString());
          //   console.log(currCompSupplyIndex.toString());

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cWBTC.exchangeRateCurrent.call());
          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          console.log("deltaSupplyIndex: " + deltaSupplyIndex.toString());

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(oldUserCollScore);

          const globalCollScore = await score.getCollGlobalScore(cWBTC_addr, now);
          console.log("globalCollScore: " + globalCollScore.toString());
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_WBTC);

          let globalScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_WBTC);

          // TRANSFER
          const _100USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cWBTC_addr, _100USD_WBTC);

          await bWBTC.transfer(a.dummy1, cTokenAmt, { from: a.user1 });

          now = await nowTime();
          const newUserCollScore = await score.getCollScore(a.user1, cWBTC_addr, now);
          console.log("newUserCollScore: " + newUserCollScore.toString());
          expect(oldUserCollScore).to.be.bignumber.not.equal(newUserCollScore);

          userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          console.log("userScoreBalUser1: " + userScoreBalUser1.toString());

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cWBTC_addr);
          console.log("userScoreBalDummy1: " + userScoreBalDummy1.toString());

          await time.increase(1);
          // dummy1 score
          const dummy1CollScore = await score.getCollScore(a.dummy1, cWBTC_addr, await nowTime());
          console.log("dummy1CollScore: " + dummy1CollScore.toString());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);

          //   const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          //   expectInRange(userScoreBalUser1, _500USD_WBTC.sub(_100USD_WBTC), 1);

          //   const avatarDummy1 = await registry.avatarOf(a.dummy1);
          //   const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cWBTC_addr);
          //   expectInRange(userScoreBalDummy1, _100USD_WBTC, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_WBTC);
        });
      });

      describe("should have score when transferFrom", async () => {
        it("transferFrom ZRX", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1, ONE_USD_WO_ZRX_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cZRX_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cZRX_addr);
          // ZRX supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(2));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cZRX.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cZRX_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          let globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          // TRANSFER FROM
          const _100USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cZRX_addr, _100USD_ZRX);

          await bZRX.approve(a.dummy1, cTokenAmt, { from: a.user1 });
          await bZRX.transferFrom(a.user1, a.dummy1, cTokenAmt, { from: a.dummy1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cZRX_addr);
          expectInRange(userScoreBalUser1, _500USD_ZRX.sub(_100USD_ZRX), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cZRX_addr);
          expectInRange(userScoreBalDummy1, _100USD_ZRX, 1);

          await time.increase(1);

          const dummy1CollScore = await score.getCollScore(a.dummy1, cZRX_addr, await nowTime());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);

          globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expectInRange(globalScoreBal, _500USD_ZRX, 1);
        });

        it("transferFrom ETH", async () => {
          let compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(500));
          await bETH.mint({ from: a.user1, value: _500USD_ETH });
          const avatar1 = await registry.avatarOf(a.user1);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_USD_WO_ETH_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.equal(
            cETH_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cETH_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cETH_addr);
          // ETH supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cETH.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cETH_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ETH);

          let globalScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ETH);

          // TRANSFER FROM
          const _100USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cETH_addr, _100USD_ETH);

          await bETH.approve(a.dummy1, cTokenAmt, { from: a.user1 });
          await bETH.transferFrom(a.user1, a.dummy1, cTokenAmt, { from: a.dummy1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cETH_addr);
          expectInRange(userScoreBalUser1, _500USD_ETH.sub(_100USD_ETH), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cETH_addr);
          expectInRange(userScoreBalDummy1, _100USD_ETH, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cETH_addr);
          expectInRange(globalScoreBal, _500USD_ETH, 1);
        });

        it("transferFrom USDT", async () => {
          let compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(500));
          await USDT.approve(bUSDT_addr, _500USD_USDT, { from: a.user1 });
          await bUSDT.mint(_500USD_USDT, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow USDT so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bUSDT.borrow(ONE_HUNDRED_USDT, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cUSDT_addr, avatar1, ONE_USDT);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.equal(
            cUSDT_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cUSDT_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cUSDT_addr);
          // USDT supplyMultiplier is 3
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(3));
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cUSDT.exchangeRateCurrent.call());
          console.log("Score deltaSupplyIndex: " + deltaSupplyIndex.toString());

          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cUSDT_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cUSDT_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_USDT);

          let globalScoreBal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_USDT);

          // TRANSFER FROM
          const _100USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cUSDT_addr, _100USD_USDT);

          await bUSDT.approve(a.dummy1, cTokenAmt, { from: a.user1 });
          await bUSDT.transferFrom(a.user1, a.dummy1, cTokenAmt, { from: a.dummy1 });

          const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cUSDT_addr);
          expectInRange(userScoreBalUser1, _500USD_USDT.sub(_100USD_USDT), 1);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cUSDT_addr);
          expectInRange(userScoreBalDummy1, _100USD_USDT, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cUSDT_addr);
          expectInRange(globalScoreBal, _500USD_USDT, 1);
        });

        it("transferFrom WBTC", async () => {
          let compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(500));
          await WBTC.approve(bWBTC_addr, _500USD_WBTC, { from: a.user1 });
          await bWBTC.mint(_500USD_WBTC, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow WBTC so that index changes
          const POINT_ZERO_ONE = POINT_ONE_WBTC.div(new BN(10)); // $100
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bWBTC.borrow(POINT_ZERO_ONE, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cWBTC_addr, avatar1, POINT_ZERO_ONE);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cWBTC_addr)).to.be.bignumber.equal(
            cWBTC_COMP_SPEEDS_MAINNET,
          );

          let userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          console.log("userScoreBalUser1: " + userScoreBalUser1.toString());

          compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          let now = await nowTime();
          let oldUserCollScore = await score.getCollScore(a.user1, cWBTC_addr, now);
          console.log("oldUserCollScore: " + oldUserCollScore.toString());
          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cWBTC_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cWBTC_addr);
          // WBTC supplyMultiplier is 5
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));
          //   console.log(prevCompSupplyIndex.toString());
          //   console.log(currCompSupplyIndex.toString());

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cWBTC.exchangeRateCurrent.call());
          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          console.log("deltaSupplyIndex: " + deltaSupplyIndex.toString());

          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(oldUserCollScore);

          const globalCollScore = await score.getCollGlobalScore(cWBTC_addr, now);
          console.log("globalCollScore: " + globalCollScore.toString());
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          const userScoreBal = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_WBTC);

          let globalScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_WBTC);

          // TRANSFER FROM
          const _100USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cWBTC_addr, _100USD_WBTC);

          await bWBTC.approve(a.dummy1, cTokenAmt, { from: a.user1 });
          await bWBTC.transferFrom(a.user1, a.dummy1, cTokenAmt, { from: a.dummy1 });

          now = await nowTime();
          const newUserCollScore = await score.getCollScore(a.user1, cWBTC_addr, now);
          console.log("newUserCollScore: " + newUserCollScore.toString());
          expect(oldUserCollScore).to.be.bignumber.not.equal(newUserCollScore);

          userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          console.log("userScoreBalUser1: " + userScoreBalUser1.toString());

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cWBTC_addr);
          console.log("userScoreBalDummy1: " + userScoreBalDummy1.toString());

          await time.increase(1);
          // dummy1 score
          const dummy1CollScore = await score.getCollScore(a.dummy1, cWBTC_addr, await nowTime());
          console.log("dummy1CollScore: " + dummy1CollScore.toString());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);

          //   const userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1, cWBTC_addr);
          //   expectInRange(userScoreBalUser1, _500USD_WBTC.sub(_100USD_WBTC), 1);

          //   const avatarDummy1 = await registry.avatarOf(a.dummy1);
          //   const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cWBTC_addr);
          //   expectInRange(userScoreBalDummy1, _100USD_WBTC, 1);

          globalScoreBal = await getGlobalCollScoreBalance(cWBTC_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_WBTC);
        });
      });

      describe("should decrease score when member liquidateBorrow", async () => {
        it("liquidate ZRX", async () => {
          const _10000USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(10000));
          // deployer give tokens to user2
          await ZRX.transfer(a.user2, _10000USD_ZRX, { from: a.deployer });

          // user1 mint ETH collateral
          // 50 USD extra to cover some truncation errors
          const _10050USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(10050));
          await bETH.mint({ from: a.user1, value: _10050USD_ETH });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 mint- supply ZRX liquidity
          await ZRX.approve(bZRX_addr, _10000USD_ZRX, { from: a.user2 });
          await bZRX.mint(_10000USD_ZRX, { from: a.user2 });

          // user1 borrow ZRX
          // borrow close to max limit
          const _5000USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(5000));
          await bZRX.borrow(_5000USD_ZRX, { from: a.user1 });

          let user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.not.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.equal(ZERO);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1.address, ONE_USD_WO_ETH_MAINNET);
          let result = await comptroller.mintAllowed.call(
            cETH_addr,
            avatar1.address,
            ONE_USD_WO_ETH_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);
          // just trigger borrow index recalculation
          await comptroller.borrowAllowed(cZRX_addr, avatar1.address, ONE_USD_WO_ZRX_MAINNET);
          result = await comptroller.borrowAllowed.call(
            cZRX_addr,
            avatar1.address,
            ONE_USD_WO_ZRX_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);
          // time change
          await time.increase(ONE_MONTH);

          // update index
          await score.updateIndex(cTokens);

          let now = await nowTime();
          let user1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          let user1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          let newUser1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          let newUser1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          const beforePerSecondETHCollScoreIncrease = newUser1ETHCollScore.sub(user1ETHCollScore);
          const beforePerSecondZRXDebtScoreIncrease = newUser1ZRXDebtScore.sub(user1ZRXDebtScore);

          // validate user1 collateral score
          expect(user1ETHCollScore).to.be.bignumber.not.equal(ZERO);
          // validate user1 debt score
          expect(user1ZRXDebtScore).to.be.bignumber.not.equal(ZERO);
          let ethScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cETH_addr);
          expect(ethScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalUser1: " + ethScoreBalUser1.toString());
          let ethScoreBalGlobal = await getGlobalCollScoreBalance(cETH_addr);
          expect(ethScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalGlobal: " + ethScoreBalGlobal.toString());
          let zrxScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(zrxScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("zrxScoreBalUser1: " + zrxScoreBalUser1.toString());
          let zrxScoreBalGlobal = await getGlobalDebtScoreBalance(cZRX_addr);
          expect(zrxScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("zrxScoreBalGlobal: " + zrxScoreBalGlobal.toString());

          // Change ZRX rate 110%
          const newZRXPrice = ONE_ZRX_IN_USD_MAINNET.mul(new BN(110)).div(new BN(100));
          await priceOracle.setPrice(cZRX_addr, newZRXPrice);

          // open for liquidation
          user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.not.equal(ZERO);

          // member deposit minTopup
          const debtInfo = await pool.getDebtTopupInfo.call(a.user1, bZRX_addr);
          const minTopup = debtInfo["minTopup"];
          await ZRX.approve(pool.address, minTopup, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](ZRX_addr, minTopup, { from: a.member1 });
          // member topup
          await pool.topup(a.user1, bZRX_addr, minTopup, false, { from: a.member1 });
          const maxLiquidationAmount = await avatar1.getMaxLiquidationAmount.call(cZRX_addr);
          expect(maxLiquidationAmount).to.be.bignumber.not.equal(ZERO);
          expect(await avatar1.canLiquidate.call()).to.be.equal(true);

          // member liquidate
          const remainingBalToDeposit = maxLiquidationAmount.sub(minTopup);
          await ZRX.approve(pool.address, remainingBalToDeposit, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](ZRX_addr, remainingBalToDeposit, {
            from: a.member1,
          });
          await pool.liquidateBorrow(a.user1, bETH_addr, bZRX_addr, maxLiquidationAmount, {
            from: a.member1,
          });
          expect(await avatar1.canLiquidate.call()).to.be.equal(false);

          const currEthScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cETH_addr);
          expect(currEthScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currEthScoreBalUser1: " + currEthScoreBalUser1.toString());
          const currEthScoreBalGlobal = await getGlobalCollScoreBalance(cETH_addr);
          expect(currEthScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currEthScoreBalGlobal: " + currEthScoreBalGlobal.toString());
          const currZrxScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(currZrxScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currZrxScoreBalUser1: " + currZrxScoreBalUser1.toString());
          const currZrxScoreBalGlobal = await getGlobalDebtScoreBalance(cZRX_addr);
          expect(currZrxScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currZrxScoreBalGlobal: " + currZrxScoreBalGlobal.toString());

          // validate user1 collateral and debt balance should have decreased
          expect(currEthScoreBalUser1).to.be.bignumber.lessThan(ethScoreBalUser1);
          expect(currEthScoreBalGlobal).to.be.bignumber.lessThan(ethScoreBalGlobal);
          expect(currZrxScoreBalUser1).to.be.bignumber.lessThan(zrxScoreBalUser1);
          expect(currZrxScoreBalGlobal).to.be.bignumber.lessThan(zrxScoreBalGlobal);

          // refresh comp speeds to update the index
          await comptroller.refreshCompSpeeds();

          // validate that per second increase in score is slowed down after liquidateBorrow
          now = await nowTime();
          user1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          user1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          newUser1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          newUser1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          const afterPerSecondETHCollScoreIncrease = newUser1ETHCollScore.sub(user1ETHCollScore);
          const afterPerSecondZRXDebtScoreIncrease = newUser1ZRXDebtScore.sub(user1ZRXDebtScore);

          expect(beforePerSecondETHCollScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondETHCollScoreIncrease,
          );
          expect(beforePerSecondZRXDebtScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondZRXDebtScoreIncrease,
          );
        });

        it("liquidate ETH", async () => {
          const _10000USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(10000));
          // deployer give tokens to user1 and user2
          const _8000USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(8000));
          await USDT.transfer(a.user1, _8000USD_USDT, { from: a.deployer });

          // user1 mint USDT collateral
          await USDT.approve(bUSDT_addr, _8000USD_USDT, { from: a.user1 });
          await bUSDT.mint(_8000USD_USDT, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 mint- supply ETH liquidity
          await bETH.mint({ from: a.user2, value: _10000USD_ETH });

          // user1 borrow ETH
          // borrow close to max limit
          // 50 USD less to cover some truncation errors
          const _3950USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(3950));
          await bETH.borrow(_3950USD_ETH, { from: a.user1 });

          let user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.not.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.equal(ZERO);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cUSDT_addr, avatar1.address, ONE_USD_WO_USDT_MAINNET);
          let result = await comptroller.mintAllowed.call(
            cUSDT_addr,
            avatar1.address,
            ONE_USD_WO_USDT_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);

          // just trigger borrow index recalculation
          await comptroller.borrowAllowed(cETH_addr, avatar1.address, ONE_USD_WO_ETH_MAINNET);
          result = await comptroller.borrowAllowed.call(
            cETH_addr,
            avatar1.address,
            ONE_USD_WO_ETH_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);

          // time change
          await time.increase(ONE_MONTH);

          // update index
          await score.updateIndex(cTokens);

          let now = await nowTime();
          let user1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          let user1ETHDebtScore = await score.getDebtScore(a.user1, cETH_addr, now);
          expect(user1ETHDebtScore).to.be.bignumber.not.equal(ZERO);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          let newUser1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          let newUser1ETHDebtScore = await score.getDebtScore(a.user1, cETH_addr, now);
          const beforePerSecondUSDTCollScoreIncrease = newUser1USDTCollScore.sub(
            user1USDTCollScore,
          );
          const beforePerSecondETHDebtScoreIncrease = newUser1ETHDebtScore.sub(user1ETHDebtScore);

          // validate user1 collateral score
          expect(user1USDTCollScore).to.be.bignumber.not.equal(ZERO);
          // validate user1 debt score
          expect(user1ETHDebtScore).to.be.bignumber.not.equal(ZERO);
          let usdtScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cUSDT_addr);
          expect(usdtScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("usdtScoreBalUser1: " + usdtScoreBalUser1.toString());
          let usdtScoreBalGlobal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(usdtScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("usdtScoreBalGlobal: " + usdtScoreBalGlobal.toString());
          let ethScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cETH_addr);
          expect(ethScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalUser1: " + ethScoreBalUser1.toString());
          let ethScoreBalGlobal = await getGlobalDebtScoreBalance(cETH_addr);
          expect(ethScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalGlobal: " + ethScoreBalGlobal.toString());

          // Change ETH rate 110%
          const newETHPrice = ONE_ETH_IN_USD_MAINNET.mul(new BN(110)).div(new BN(100));
          await priceOracle.setPrice(cETH_addr, newETHPrice);

          // open for liquidation
          user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.not.equal(ZERO);

          // member deposit minTopup
          const debtInfo = await pool.getDebtTopupInfo.call(a.user1, bETH_addr);
          const minTopup = debtInfo["minTopup"];
          await pool.methods["deposit()"]({ from: a.member1, value: minTopup });
          // member topup
          await pool.topup(a.user1, bETH_addr, minTopup, false, { from: a.member1 });
          const maxLiquidationAmount = await avatar1.getMaxLiquidationAmount.call(cETH_addr);
          expect(maxLiquidationAmount).to.be.bignumber.not.equal(ZERO);
          expect(await avatar1.canLiquidate.call()).to.be.equal(true);

          // member liquidate
          const remainingBalToDeposit = maxLiquidationAmount.sub(minTopup);
          await pool.methods["deposit()"]({
            from: a.member1,
            value: remainingBalToDeposit,
          });
          await pool.liquidateBorrow(a.user1, bUSDT_addr, bETH_addr, maxLiquidationAmount, {
            from: a.member1,
          });
          expect(await avatar1.canLiquidate.call()).to.be.equal(false);

          const currUsdtScoreBalUser1 = await getCurrentCollScoreBalance(
            avatar1.address,
            cUSDT_addr,
          );
          expect(currUsdtScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currUsdtScoreBalUser1: " + currUsdtScoreBalUser1.toString());
          const currUsdtScoreBalGlobal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(currUsdtScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currUsdtScoreBalGlobal: " + currUsdtScoreBalGlobal.toString());
          const currEthScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cETH_addr);
          expect(currEthScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currEthScoreBalUser1: " + currEthScoreBalUser1.toString());
          const currEthScoreBalGlobal = await getGlobalDebtScoreBalance(cETH_addr);
          expect(currEthScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currEthScoreBalGlobal: " + currEthScoreBalGlobal.toString());

          // validate user1 collateral and debt balance should have decreased
          expect(currUsdtScoreBalUser1).to.be.bignumber.lessThan(usdtScoreBalUser1);
          expect(currUsdtScoreBalGlobal).to.be.bignumber.lessThan(usdtScoreBalGlobal);
          expect(currEthScoreBalUser1).to.be.bignumber.lessThan(ethScoreBalUser1);
          expect(currEthScoreBalGlobal).to.be.bignumber.lessThan(ethScoreBalGlobal);

          // refresh comp speeds to update the index
          await comptroller.refreshCompSpeeds();

          // validate that per second increase in score is slowed down after liquidateBorrow
          now = await nowTime();
          user1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          user1ETHDebtScore = await score.getDebtScore(a.user1, cETH_addr, now);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          newUser1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          newUser1ETHDebtScore = await score.getDebtScore(a.user1, cETH_addr, now);
          const afterPerSecondUSDTCollScoreIncrease = newUser1USDTCollScore.sub(user1USDTCollScore);
          const afterPerSecondETHDebtScoreIncrease = newUser1ETHDebtScore.sub(user1ETHDebtScore);

          expect(beforePerSecondUSDTCollScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondUSDTCollScoreIncrease,
          );
          expect(beforePerSecondETHDebtScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondETHDebtScoreIncrease,
          );
        });

        it("liquidate WBTC", async () => {
          const _10000USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(10000));
          // deployer give tokens to user1 and user2
          const _8000USD_USDT = ONE_USD_WO_USDT_MAINNET.mul(new BN(8000));
          await USDT.transfer(a.user1, _8000USD_USDT, { from: a.deployer });

          // user1 mint USDT collateral
          await USDT.approve(bUSDT_addr, _8000USD_USDT, { from: a.user1 });
          await bUSDT.mint(_8000USD_USDT, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 mint- supply WBTC liquidity
          await WBTC.approve(bWBTC_addr, _10000USD_WBTC, { from: a.user2 });
          await bWBTC.mint(_10000USD_WBTC, { from: a.user2 });

          // user1 borrow WBTC
          // borrow close to max limit
          // 50 USD less to cover some truncation errors
          const _3950USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(3950));
          await bWBTC.borrow(_3950USD_WBTC, { from: a.user1 });

          let user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.not.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.equal(ZERO);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cUSDT_addr, avatar1.address, ONE_USD_WO_USDT_MAINNET);
          let result = await comptroller.mintAllowed.call(
            cUSDT_addr,
            avatar1.address,
            ONE_USD_WO_USDT_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);

          // just trigger borrow index recalculation
          await comptroller.borrowAllowed(cWBTC_addr, avatar1.address, ONE_USD_WO_WBTC_MAINNET);
          result = await comptroller.borrowAllowed.call(
            cWBTC_addr,
            avatar1.address,
            ONE_USD_WO_WBTC_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);

          // time change
          await time.increase(ONE_MONTH);

          // update index
          await score.updateIndex(cTokens);

          let now = await nowTime();
          let user1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          let user1WBTCDebtScore = await score.getDebtScore(a.user1, cWBTC_addr, now);
          expect(user1WBTCDebtScore).to.be.bignumber.not.equal(ZERO);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          let newUser1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          let newUser1WBTCDebtScore = await score.getDebtScore(a.user1, cWBTC_addr, now);
          const beforePerSecondUSDTCollScoreIncrease = newUser1USDTCollScore.sub(
            user1USDTCollScore,
          );
          const beforePerSecondWBTCDebtScoreIncrease = newUser1WBTCDebtScore.sub(
            user1WBTCDebtScore,
          );

          // validate user1 collateral score
          expect(user1USDTCollScore).to.be.bignumber.not.equal(ZERO);
          // validate user1 debt score
          expect(user1WBTCDebtScore).to.be.bignumber.not.equal(ZERO);
          let usdtScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cUSDT_addr);
          expect(usdtScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("usdtScoreBalUser1: " + usdtScoreBalUser1.toString());
          let usdtScoreBalGlobal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(usdtScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("usdtScoreBalGlobal: " + usdtScoreBalGlobal.toString());
          let wbtcScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cWBTC_addr);
          expect(wbtcScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("wbtcScoreBalUser1: " + wbtcScoreBalUser1.toString());
          let wbtcScoreBalGlobal = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(wbtcScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("wbtcScoreBalGlobal: " + wbtcScoreBalGlobal.toString());

          // Change WBTC rate 110%
          const newWBTCPrice = ONE_WBTC_IN_USD_MAINNET.mul(new BN(110)).div(new BN(100));
          await priceOracle.setPrice(cWBTC_addr, newWBTCPrice);

          // open for liquidation
          user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.not.equal(ZERO);

          // member deposit minTopup
          const debtInfo = await pool.getDebtTopupInfo.call(a.user1, bWBTC_addr);
          const minTopup = debtInfo["minTopup"];
          await WBTC.approve(pool.address, minTopup, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](WBTC_addr, minTopup, { from: a.member1 });
          // member topup
          await pool.topup(a.user1, bWBTC_addr, minTopup, false, { from: a.member1 });
          const maxLiquidationAmount = await avatar1.getMaxLiquidationAmount.call(cWBTC_addr);
          expect(maxLiquidationAmount).to.be.bignumber.not.equal(ZERO);
          expect(await avatar1.canLiquidate.call()).to.be.equal(true);

          // member liquidate
          const remainingBalToDeposit = maxLiquidationAmount.sub(minTopup);
          await WBTC.approve(pool.address, remainingBalToDeposit, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](WBTC_addr, remainingBalToDeposit, {
            from: a.member1,
          });

          await pool.liquidateBorrow(a.user1, bUSDT_addr, bWBTC_addr, maxLiquidationAmount, {
            from: a.member1,
          });
          expect(await avatar1.canLiquidate.call()).to.be.equal(false);

          const currUsdtScoreBalUser1 = await getCurrentCollScoreBalance(
            avatar1.address,
            cUSDT_addr,
          );
          expect(currUsdtScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currUsdtScoreBalUser1: " + currUsdtScoreBalUser1.toString());
          const currUsdtScoreBalGlobal = await getGlobalCollScoreBalance(cUSDT_addr);
          expect(currUsdtScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currUsdtScoreBalGlobal: " + currUsdtScoreBalGlobal.toString());
          const currWbtcScoreBalUser1 = await getCurrentDebtScoreBalance(
            avatar1.address,
            cWBTC_addr,
          );
          expect(currWbtcScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("currWbtcScoreBalUser1: " + currWbtcScoreBalUser1.toString());
          const currWbtcScoreBalGlobal = await getGlobalDebtScoreBalance(cWBTC_addr);
          expect(currWbtcScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("currWbtcScoreBalGlobal: " + currWbtcScoreBalGlobal.toString());

          // validate user1 collateral and debt balance should have decreased
          expect(currUsdtScoreBalUser1).to.be.bignumber.lessThan(usdtScoreBalUser1);
          expect(currUsdtScoreBalGlobal).to.be.bignumber.lessThan(usdtScoreBalGlobal);
          expect(currWbtcScoreBalUser1).to.be.bignumber.lessThan(wbtcScoreBalUser1);
          expect(currWbtcScoreBalGlobal).to.be.bignumber.lessThan(wbtcScoreBalGlobal);

          // refresh comp speeds to update the index
          await comptroller.refreshCompSpeeds();

          // validate that per second increase in score is slowed down after liquidateBorrow
          now = await nowTime();
          user1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          user1WBTCDebtScore = await score.getDebtScore(a.user1, cWBTC_addr, now);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          newUser1USDTCollScore = await score.getCollScore(a.user1, cUSDT_addr, now);
          newUser1WBTCDebtScore = await score.getDebtScore(a.user1, cWBTC_addr, now);
          const afterPerSecondUSDTCollScoreIncrease = newUser1USDTCollScore.sub(user1USDTCollScore);
          const afterPerSecondWBTCDebtScoreIncrease = newUser1WBTCDebtScore.sub(user1WBTCDebtScore);

          expect(beforePerSecondUSDTCollScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondUSDTCollScoreIncrease,
          );
          expect(beforePerSecondWBTCDebtScoreIncrease).to.be.bignumber.greaterThan(
            afterPerSecondWBTCDebtScoreIncrease,
          );
        });
      });

      describe("=> should not update the score when user quit <=", async () => {
        it("when mint", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 borrow ZRX so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user2 });

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1.address, ONE_ZRX);

          await time.increase(ONE_MONTH);

          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          await score.updateIndex(cTokens);

          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          expect(userCollScore).to.be.bignumber.not.equal(ZERO);

          // user quit
          expect(await avatar1.quit()).to.be.equal(false);
          await avatar1.quitB({ from: a.user1 });
          expect(await avatar1.quit()).to.be.equal(true);

          // user1 get more ZRX from deployer
          await ZRX.transfer(a.user1, FIVE_HUNDRED_ZRX, { from: a.deployer });
          // mint again
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });

          // no change in coll balance
          const updatedCollBalance = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(updatedCollBalance).to.be.bignumber.equal(_500USD_ZRX);
        });

        it("when borrow");

        it("when repay");

        it("when redeem");

        it("when redeemUnderlying");

        it("when liquidateBorrow", async () => {
          const _10000USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(10000));
          // deployer give tokens to user2
          await ZRX.transfer(a.user2, _10000USD_ZRX, { from: a.deployer });

          // user1 mint ETH collateral
          // 50 USD extra to cover some truncation errors
          const _10050USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(10050));
          await bETH.mint({ from: a.user1, value: _10050USD_ETH });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 mint- supply ZRX liquidity
          await ZRX.approve(bZRX_addr, _10000USD_ZRX, { from: a.user2 });
          await bZRX.mint(_10000USD_ZRX, { from: a.user2 });

          // user1 borrow ZRX
          // borrow close to max limit
          const _5000USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(5000));
          await bZRX.borrow(_5000USD_ZRX, { from: a.user1 });

          let user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.not.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.equal(ZERO);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1.address, ONE_USD_WO_ETH_MAINNET);
          let result = await comptroller.mintAllowed.call(
            cETH_addr,
            avatar1.address,
            ONE_USD_WO_ETH_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);
          // just trigger borrow index recalculation
          await comptroller.borrowAllowed(cZRX_addr, avatar1.address, ONE_USD_WO_ZRX_MAINNET);
          result = await comptroller.borrowAllowed.call(
            cZRX_addr,
            avatar1.address,
            ONE_USD_WO_ZRX_MAINNET,
          );
          expect(result).to.be.bignumber.equal(ZERO);
          // time change
          await time.increase(ONE_MONTH);

          // update index
          await score.updateIndex(cTokens);

          let now = await nowTime();
          let user1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          let user1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          await time.increase(1);
          now = now.add(new BN(1)); // fix intermittent timestamp issue. ensure to calculate only for 1 sec
          let newUser1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          let newUser1ZRXDebtScore = await score.getDebtScore(a.user1, cZRX_addr, now);
          const beforePerSecondETHCollScoreIncrease = newUser1ETHCollScore.sub(user1ETHCollScore);
          const beforePerSecondZRXDebtScoreIncrease = newUser1ZRXDebtScore.sub(user1ZRXDebtScore);

          // validate user1 collateral score
          expect(user1ETHCollScore).to.be.bignumber.not.equal(ZERO);
          // validate user1 debt score
          expect(user1ZRXDebtScore).to.be.bignumber.not.equal(ZERO);
          let ethScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cETH_addr);
          expect(ethScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalUser1: " + ethScoreBalUser1.toString());
          let ethScoreBalGlobal = await getGlobalCollScoreBalance(cETH_addr);
          expect(ethScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("ethScoreBalGlobal: " + ethScoreBalGlobal.toString());
          let zrxScoreBalUser1 = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(zrxScoreBalUser1).to.be.bignumber.not.equal(ZERO);
          console.log("zrxScoreBalUser1: " + zrxScoreBalUser1.toString());
          let zrxScoreBalGlobal = await getGlobalDebtScoreBalance(cZRX_addr);
          expect(zrxScoreBalGlobal).to.be.bignumber.not.equal(ZERO);
          console.log("zrxScoreBalGlobal: " + zrxScoreBalGlobal.toString());

          // Change ZRX rate 110%
          const newZRXPrice = ONE_ZRX_IN_USD_MAINNET.mul(new BN(110)).div(new BN(100));
          await priceOracle.setPrice(cZRX_addr, newZRXPrice);

          // open for liquidation
          user1AccLiquidity = await bComptroller.getAccountLiquidity(a.user1);
          expect(user1AccLiquidity["liquidity"].toString()).to.be.bignumber.equal(ZERO);
          expect(user1AccLiquidity["shortFall"].toString()).to.be.bignumber.not.equal(ZERO);

          // user quit before liquidation
          expect(await avatar1.quit()).to.be.equal(false);
          await avatar1.quitB({ from: a.user1 });
          expect(await avatar1.quit()).to.be.equal(true);

          // member deposit minTopup
          const debtInfo = await pool.getDebtTopupInfo.call(a.user1, bZRX_addr);
          const minTopup = debtInfo["minTopup"];
          await ZRX.approve(pool.address, minTopup, { from: a.member1 });
          await pool.methods["deposit(address,uint256)"](ZRX_addr, minTopup, { from: a.member1 });

          // member try to topup, but cannot
          await expectRevert(
            pool.topup(a.user1, bZRX_addr, minTopup, false, { from: a.member1 }),
            "Cushion: user-quit-B",
          );
          const maxLiquidationAmount = await avatar1.getMaxLiquidationAmount.call(cZRX_addr);
          expect(maxLiquidationAmount).to.be.bignumber.not.equal(ZERO);

          // MEMBER CANNOT CALL liquidateBorrow(), HENCE NOT SCORE UPDATION
          expect(await avatar1.canLiquidate.call()).to.be.equal(false);
        });

        it("when transfer", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1.address, ONE_USD_WO_ZRX_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          const user = await score.user(avatar1.address);
          const collAsset = await score.collAsset(cZRX_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cZRX_addr);
          // ZRX supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(2));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cZRX.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cZRX_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          let globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          // quit
          expect(await avatar1.quit()).to.be.equal(false);
          await avatar1.quitB({ from: a.user1 });
          expect(await avatar1.quit()).to.be.equal(true);

          // TRANSFER
          const _100USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cZRX_addr, _100USD_ZRX);

          await bZRX.transfer(a.dummy1, cTokenAmt, { from: a.user1 });

          let userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBalUser1).to.be.bignumber.equal(_500USD_ZRX);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cZRX_addr);
          expectInRange(userScoreBalDummy1, _100USD_ZRX, 1);

          await time.increase(1);

          // no change in score of user1
          userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBalUser1).to.be.bignumber.equal(_500USD_ZRX);

          const dummy1CollScore = await score.getCollScore(a.dummy1, cZRX_addr, await nowTime());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);
        });

        it("when transferFrom", async () => {
          let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
          await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
          await bZRX.mint(_500USD_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cZRX_addr, avatar1.address, ONE_USD_WO_ZRX_MAINNET);

          await time.increase(ONE_MONTH);

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.equal(
            cZRX_COMP_SPEEDS_MAINNET,
          );
          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          await score.updateIndex(cTokens);
          const now = await nowTime();
          const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
          const user = await score.user(avatar1.address);
          const collAsset = await score.collAsset(cZRX_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);

          const supplyMultiplier = await score.supplyMultiplier(cZRX_addr);
          // ZRX supplyMultiplier is 2
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(2));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);

          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cZRX.exchangeRateCurrent.call());

          // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
          const expectedCollScore = supplyMultiplier
            .mul(deltaSupplyIndex)
            .div(SCALE)
            .mul(userScore);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

          const globalCollScore = await score.getCollGlobalScore(cZRX_addr, now);
          expect(globalCollScore).to.be.bignumber.equal(expectedCollScore);

          let userScoreBal = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          let globalScoreBal = await getGlobalCollScoreBalance(cZRX_addr);
          expect(globalScoreBal).to.be.bignumber.equal(_500USD_ZRX);

          // quit
          expect(await avatar1.quit()).to.be.equal(false);
          await avatar1.quitB({ from: a.user1 });
          expect(await avatar1.quit()).to.be.equal(true);

          // TRANSFER FROM
          const _100USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(100));
          const cTokenAmt = await toCTokenAmount(cZRX_addr, _100USD_ZRX);

          await bZRX.approve(a.dummy1, cTokenAmt, { from: a.user1 });
          await bZRX.transferFrom(a.user1, a.dummy1, cTokenAmt, { from: a.dummy1 });

          let userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBalUser1).to.be.bignumber.equal(_500USD_ZRX);

          const avatarDummy1 = await registry.avatarOf(a.dummy1);
          const userScoreBalDummy1 = await getCurrentCollScoreBalance(avatarDummy1, cZRX_addr);
          expectInRange(userScoreBalDummy1, _100USD_ZRX, 1);

          await time.increase(1);

          userScoreBalUser1 = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(userScoreBalUser1).to.be.bignumber.equal(_500USD_ZRX);

          const dummy1CollScore = await score.getCollScore(a.dummy1, cZRX_addr, await nowTime());
          expect(dummy1CollScore).to.be.bignumber.not.equal(ZERO);
        });
      });

      describe("Integration Tests with Jar", async () => {
        async function mintSomeCTokensOnCompoundAndSendToJar() {
          // Deployer mints some cZRX, cETH, cUSDT, cWBTC and send to the Jar contract
          // cZRX
          await ZRX.approve(cZRX_addr, ONE_HUNDRED_ZRX, { from: a.deployer });
          await cZRX.mint(ONE_HUNDRED_ZRX, { from: a.deployer });
          // cETH
          await cETH.mint({ from: a.deployer, value: ONE_ETH });
          // cUSDT
          await USDT.approve(cUSDT_addr, ONE_THOUSAND_USDT, { from: a.deployer });
          await cUSDT.mint(ONE_THOUSAND_USDT, { from: a.deployer });
          // cWBTC
          await WBTC.approve(cWBTC_addr, ONE_WBTC, { from: a.deployer });
          await cWBTC.mint(ONE_WBTC, { from: a.deployer });

          // validate cToken balances
          const cZRXBal = await cZRX.balanceOf(a.deployer);
          const cETHBal = await cETH.balanceOf(a.deployer);
          const cUSDTBal = await cETH.balanceOf(a.deployer);
          const cWBTCBal = await cWBTC.balanceOf(a.deployer);
          expect(cZRXBal).to.be.bignumber.not.equal(ZERO);
          expect(cETHBal).to.be.bignumber.not.equal(ZERO);
          expect(cUSDTBal).to.be.bignumber.not.equal(ZERO);
          expect(cWBTCBal).to.be.bignumber.not.equal(ZERO);

          // transfer cTokens to Jar contract
          await cZRX.transfer(jar.address, cZRXBal, { from: a.deployer });
          await cETH.transfer(jar.address, cETHBal, { from: a.deployer });
          await cUSDT.transfer(jar.address, cUSDTBal, { from: a.deployer });
          await cWBTC.transfer(jar.address, cWBTCBal, { from: a.deployer });
        }

        it("two users mints same USD value ETH and WBTC, Jar balance shared 50-50", async () => {
          // user1 mints ETH
          const _5000USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(5000));
          await bETH.mint({ from: a.user1, value: _5000USD_ETH });

          // user2 mints WBTC
          const _5000USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(5000));
          await WBTC.approve(bWBTC_addr, _5000USD_WBTC, { from: a.user2 });
          await bWBTC.mint(_5000USD_WBTC, { from: a.user2 });

          const avatar1 = await registry.avatarOf(a.user1);
          const avatar2 = await registry.avatarOf(a.user2);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_USD_WO_ETH_MAINNET);
          await comptroller.mintAllowed(cWBTC_addr, avatar2, ONE_USD_WO_WBTC_MAINNET);

          await time.increase(ONE_MONTH);
          await score.updateIndex(cTokens);

          const now = await nowTime();
          const user1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          expect(user1ETHCollScore).to.be.bignumber.not.equal(ZERO);
          console.log("user1ETHCollScore: " + user1ETHCollScore.toString());

          const user1WBTCCollScore = await score.getCollScore(a.user2, cWBTC_addr, now);
          expect(user1WBTCCollScore).to.be.bignumber.not.equal(ZERO);
          console.log("user1WBTCCollScore: " + user1WBTCCollScore.toString());

          // mint cTokens on Compound so that index is not affected at B
          await mintSomeCTokensOnCompoundAndSendToJar();

          // increase time 6 months, so that users can withdraw
          await time.increase(SIX_MONTHS);

          // validate balance at Jar
          expect(await cZRX.balanceOf(jar.address)).to.be.bignumber.not.equal(ZERO);
          expect(await cETH.balanceOf(jar.address)).to.be.bignumber.not.equal(ZERO);
          expect(await cUSDT.balanceOf(jar.address)).to.be.bignumber.not.equal(ZERO);
          expect(await cWBTC.balanceOf(jar.address)).to.be.bignumber.not.equal(ZERO);

          // user1 withdraw cZRX
          const prevUser1cZRXBal = await cZRX.balanceOf(a.user1);
          expect(prevUser1cZRXBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user1, cZRX_addr, { from: a.user1 });
          const newUser1cZRXBal = await cZRX.balanceOf(a.user1);
          console.log("newUser1cZRXBal: " + newUser1cZRXBal.toString());
          expect(newUser1cZRXBal).to.be.bignumber.not.equal(ZERO);

          // user1 withdraw cETH
          const prevUser1cETHBal = await cETH.balanceOf(a.user1);
          expect(prevUser1cETHBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user1, cETH_addr, { from: a.user1 });
          const newUser1cETHBal = await cETH.balanceOf(a.user1);
          console.log("user1cETHBal: " + newUser1cETHBal.toString());
          expect(newUser1cETHBal).to.be.bignumber.not.equal(ZERO);

          // user1 withdraw cUSDT
          const prevUser1cUSDTBal = await cUSDT.balanceOf(a.user1);
          expect(prevUser1cUSDTBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user1, cUSDT_addr, { from: a.user1 });
          const newUser1cUSDTBal = await cUSDT.balanceOf(a.user1);
          console.log("newUser1cUSDTBal: " + newUser1cUSDTBal.toString());
          expect(newUser1cUSDTBal).to.be.bignumber.not.equal(ZERO);

          // user1 withdraw cWBTC
          const prevUser1cWBTCBal = await cWBTC.balanceOf(a.user1);
          expect(prevUser1cWBTCBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user1, cWBTC_addr, { from: a.user1 });
          const newUser1cWBTCBal = await cWBTC.balanceOf(a.user1);
          console.log("user1cWBTCBal: " + newUser1cWBTCBal.toString());
          expect(newUser1cWBTCBal).to.be.bignumber.not.equal(ZERO);

          // =====
          // user2 withdraw cZRX
          const prevUser2cZRXBal = await cZRX.balanceOf(a.user2);
          expect(prevUser2cZRXBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user2, cZRX_addr, { from: a.user2 });
          const newUser2cZRXBal = await cZRX.balanceOf(a.user2);
          console.log("newUser2cZRXBal: " + newUser2cZRXBal.toString());
          expect(newUser2cZRXBal).to.be.bignumber.not.equal(ZERO);

          // user2 withdraw cETH
          const prevUser2cETHBal = await cETH.balanceOf(a.user2);
          expect(prevUser2cETHBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user2, cETH_addr, { from: a.user2 });
          const newUser2cETHBal = await cETH.balanceOf(a.user2);
          console.log("newUser2cETHBal: " + newUser2cETHBal.toString());
          expect(newUser2cETHBal).to.be.bignumber.not.equal(ZERO);

          // user2 withdraw cUSDT
          const prevUser2cUSDTBal = await cUSDT.balanceOf(a.user2);
          expect(prevUser2cUSDTBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user2, cUSDT_addr, { from: a.user2 });
          const newUser2cUSDTBal = await cUSDT.balanceOf(a.user2);
          console.log("newUser2cUSDTBal: " + newUser2cUSDTBal.toString());
          expect(newUser2cUSDTBal).to.be.bignumber.not.equal(ZERO);

          // user2 withdraw cWBTC
          const prevUser2cWBTCBal = await cWBTC.balanceOf(a.user2);
          expect(prevUser2cWBTCBal).to.be.bignumber.equal(ZERO);
          await jar.withdraw(a.user2, cWBTC_addr, { from: a.user2 });
          const newUser2cWBTCBal = await cWBTC.balanceOf(a.user2);
          console.log("newUser2cWBTCBal: " + newUser2cWBTCBal.toString());
          expect(newUser2cWBTCBal).to.be.bignumber.not.equal(ZERO);

          // validate that the difference of balance is approx 1%
          expectInRange(newUser1cZRXBal, newUser2cZRXBal, 1);
          expectInRange(newUser1cETHBal, newUser2cETHBal, 1);
          expectInRange(newUser1cUSDTBal, newUser2cUSDTBal, 1);
          expectInRange(newUser1cWBTCBal, newUser2cWBTCBal, 1);
        });

        it("user cannot withdraw already withdrawn cToken again", async () => {
          // user1 mints ETH
          const _5000USD_ETH = ONE_USD_WO_ETH_MAINNET.mul(new BN(5000));
          await bETH.mint({ from: a.user1, value: _5000USD_ETH });

          // user2 mints WBTC
          const _5000USD_WBTC = ONE_USD_WO_WBTC_MAINNET.mul(new BN(5000));
          await WBTC.approve(bWBTC_addr, _5000USD_WBTC, { from: a.user2 });
          await bWBTC.mint(_5000USD_WBTC, { from: a.user2 });

          const avatar1 = await registry.avatarOf(a.user1);
          const avatar2 = await registry.avatarOf(a.user2);

          await advanceBlockInCompound(200);
          await setMainnetCompSpeeds();

          // just trigger supply index recalculation
          await comptroller.mintAllowed(cETH_addr, avatar1, ONE_USD_WO_ETH_MAINNET);
          await comptroller.mintAllowed(cWBTC_addr, avatar2, ONE_USD_WO_WBTC_MAINNET);

          await time.increase(ONE_MONTH);
          await score.updateIndex(cTokens);

          const now = await nowTime();
          const user1ETHCollScore = await score.getCollScore(a.user1, cETH_addr, now);
          expect(user1ETHCollScore).to.be.bignumber.not.equal(ZERO);
          console.log("user1ETHCollScore: " + user1ETHCollScore.toString());

          const user1WBTCCollScore = await score.getCollScore(a.user2, cWBTC_addr, now);
          expect(user1WBTCCollScore).to.be.bignumber.not.equal(ZERO);
          console.log("user1WBTCCollScore: " + user1WBTCCollScore.toString());

          // mint cTokens on Compound so that index is not affected at B
          await mintSomeCTokensOnCompoundAndSendToJar();

          // increase time 6 months, so that users can withdraw
          await time.increase(SIX_MONTHS);

          await jar.withdraw(a.user1, cZRX_addr, { from: a.user1 });
          await jar.withdraw(a.user1, cETH_addr, { from: a.user1 });
          await jar.withdraw(a.user1, cUSDT_addr, { from: a.user1 });
          await jar.withdraw(a.user1, cWBTC_addr, { from: a.user1 });

          await jar.withdraw(a.user2, cZRX_addr, { from: a.user2 });
          await jar.withdraw(a.user2, cETH_addr, { from: a.user2 });
          await jar.withdraw(a.user2, cUSDT_addr, { from: a.user2 });
          await jar.withdraw(a.user2, cWBTC_addr, { from: a.user2 });

          // user1 cannot withdraw again
          await expectRevert(
            jar.withdraw(a.user1, cZRX_addr, { from: a.user1 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user1, cETH_addr, { from: a.user1 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user1, cUSDT_addr, { from: a.user1 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user1, cWBTC_addr, { from: a.user1 }),
            "user-withdrew-rewards-before",
          );

          // user2 cannot withdraw again
          await expectRevert(
            jar.withdraw(a.user2, cZRX_addr, { from: a.user2 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user2, cETH_addr, { from: a.user2 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user2, cUSDT_addr, { from: a.user2 }),
            "user-withdrew-rewards-before",
          );
          await expectRevert(
            jar.withdraw(a.user2, cWBTC_addr, { from: a.user2 }),
            "user-withdrew-rewards-before",
          );
        });
      });
    });
  });
});
