import * as b from "../../types/index";
import { BProtocolEngine, BProtocol, ONE_MONTH } from "../../test-utils/BProtocolEngine";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
import BN from "bn.js";
import { CompoundUtils } from "@utils/CompoundUtils";

const chai = require("chai");
const expect = chai.expect;
let snapshotId: string;
const ZERO = new BN(0);

const BScore: b.BScoreContract = artifacts.require("BScore");
const Avatar: b.AvatarContract = artifacts.require("Avatar");
const CToken: b.CTokenContract = artifacts.require("CToken");
const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const ComptrollerHarness: b.ComptrollerHarnessContract = artifacts.require("ComptrollerHarness");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

contract("BScore", async (accounts) => {
  const SIX_MONTHS = new BN(6).mul(ONE_MONTH);
  let bProtocol: BProtocol;
  let registry: b.RegistryInstance;
  let comptroller: b.ComptrollerInstance;
  let score: b.BScoreInstance;
  let compoundUtil: CompoundUtils;
  let priceOracle: b.FakePriceOracleInstance;
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
    registry = bProtocol.registry;
    score = bProtocol.score;
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

  async function advanceBlockAndRefresh(num: number) {
    const comptrollerHarness = await ComptrollerHarness.at(comptroller.address);
    const currBlockNumber = await comptroller.getBlockNumber();
    await comptrollerHarness.setBlockNumber(currBlockNumber.add(new BN(num)));
    await comptroller.refreshCompSpeeds();
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

  async function getNowDebtScore(avatar: string, cToken: string) {
    const user = await score.user(avatar);
    const collAsset = await score.debtAsset(cToken);
    return await score.getScore(user, collAsset, await nowTime(), 0, 0);
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

      // SET TOKEN PRICE
      const ethRate = ONE_USD_IN_SCALE.mul(new BN(100)); // $100
      await priceOracle.setPrice(cETH_addr, ethRate);
      await priceOracle.setPrice(cZRX_addr, ONE_USD_IN_SCALE); // $1
      await priceOracle.setPrice(cBAT_addr, ONE_USD_IN_SCALE); // $1
      await priceOracle.setPrice(cUSDT_addr, ONE_USD_IN_SCALE); // $1
      const wbtcRate = ONE_USD_IN_SCALE.mul(new BN(10000)); // $1000
      await priceOracle.setPrice(cWBTC_addr, wbtcRate);

      await comptroller.refreshCompSpeeds();
    });

    describe("BScore.init()", async () => {
      it("should init", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);
        await newScore.init(endDate, cTokens, supplyMultipliers, borrowMultipliers);

        expect(await newScore.registry()).to.be.equal(registry.address);
        expect(await newScore.endDate()).to.be.bignumber.equal(endDate);

        for (let i = 0; i < cTokens.length; i++) {
          const cTokenAddr = cTokens[i];
          expect(await newScore.supplyMultiplier(cTokenAddr)).to.be.bignumber.equal(new BN(1));
          expect(await newScore.borrowMultiplier(cTokenAddr)).to.be.bignumber.equal(new BN(1));

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

      it("should fail when registry not set", async () => {
        const newScore = await BScore.new();
        await expectRevert(
          newScore.init(endDate, cTokens, supplyMultipliers, borrowMultipliers),
          "Score: registry-not-set",
        );
      });

      it("cannot call init again", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);
        await newScore.init(endDate, cTokens, supplyMultipliers, borrowMultipliers);

        await expectRevert(
          newScore.init(endDate, cTokens, supplyMultipliers, borrowMultipliers),
          "Score: already-init",
        );
      });

      it("should fail when endDate is not in the future", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);
        const now = new BN((await web3.eth.getBlock("latest")).timestamp);
        await expectRevert(
          newScore.init(now, cTokens, supplyMultipliers, borrowMultipliers),
          "Score: end-date-not-in-future",
        );
      });

      it("should fail when cToken address is zero", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);

        await expectRevert(
          newScore.init(endDate, [ZERO_ADDRESS], [new BN(1)], [new BN(1)]),
          "Score: cToken-address-is-zero",
        );
      });

      it("should fail when supplyMultiplier is zero", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);

        await expectRevert(
          newScore.init(endDate, [compoundUtil.getContracts("cETH")], [new BN(0)], [new BN(1)]),
          "Score: supply-multiplier-is-zero",
        );
      });

      it("should fail when borrowMultiplier is zero", async () => {
        const newScore = await BScore.new();
        await newScore.setRegistry(registry.address);

        await expectRevert(
          newScore.init(endDate, [compoundUtil.getContracts("cETH")], [new BN(1)], [new BN(0)]),
          "Score: borrow-multiplier-is-zero",
        );
      });
    });

    describe("BScore.setRegistry()", async () => {
      it("should set registry", async () => {
        const newScore = await BScore.new();
        expect(await newScore.registry()).to.be.equal(ZERO_ADDRESS);
        expect(await newScore.comptroller()).to.be.equal(ZERO_ADDRESS);

        await newScore.setRegistry(registry.address, { from: a.deployer });

        expect(await newScore.registry()).to.be.equal(registry.address);
        expect(await newScore.comptroller()).to.be.equal(comptroller.address);
      });

      it("should fail when non-owner try to set registry", async () => {
        const newScore = await BScore.new();
        expect(await newScore.registry()).to.be.equal(ZERO_ADDRESS);
        expect(await newScore.comptroller()).to.be.equal(ZERO_ADDRESS);

        await expectRevert(
          newScore.setRegistry(registry.address, { from: a.other }),
          "Ownable: caller is not the owner",
        );

        expect(await newScore.registry()).to.be.equal(ZERO_ADDRESS);
        expect(await newScore.comptroller()).to.be.equal(ZERO_ADDRESS);
      });

      it("should fail when registry already set", async () => {
        const newScore = await BScore.new();
        expect(await newScore.registry()).to.be.equal(ZERO_ADDRESS);
        expect(await newScore.comptroller()).to.be.equal(ZERO_ADDRESS);

        await newScore.setRegistry(registry.address, { from: a.deployer });

        expect(await newScore.registry()).to.be.equal(registry.address);
        expect(await newScore.comptroller()).to.be.equal(comptroller.address);

        await expectRevert(
          newScore.setRegistry(registry.address, { from: a.deployer }),
          "Score: registry-already-set",
        );

        expect(await newScore.registry()).to.be.equal(registry.address);
        expect(await newScore.comptroller()).to.be.equal(comptroller.address);
      });
    });

    describe("BScore.user()", async () => {
      it("");
    });

    describe("BScore.debtAsset()", async () => {
      it("");
    });

    describe("BScore.collAsset()", async () => {
      it("");
    });

    describe("BScore.updateDebtScore()", async () => {
      it("");
    });

    describe("BScore.updateCollScore()", async () => {
      it("");
    });

    describe("BScore.updateIndex()", async () => {
      it("");
    });

    describe("BScore.slashScore()", async () => {
      it("");
    });

    describe("BScore.getDebtScore()", async () => {
      it("");
    });

    describe("BScore.getDebtGlobalScore()", async () => {
      it("");
    });

    describe("BScore.getCollScore()", async () => {
      it("");
    });

    describe("BScore.getCollGlobalScore()", async () => {
      it("");
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

          await comptroller.refreshCompSpeeds();

          //   let compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          //   const prevCompSupplyIndex = compSupplyState["index"];
          //   console.log("compSupplyState[cZRX].block: " + compSupplyState["block"]);
          //   console.log("compSupplyState[cZRX].index: " + compSupplyState["index"]);
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());

          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow ZRX so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user2 });

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // mint againt
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.not.equal(ZERO);

          compSupplyState = await comptroller.compSupplyState(cZRX_addr);
          const currCompSupplyIndex = compSupplyState["index"];
          //   console.log("compSupplyState[cZRX].block: " + supplyState["block"]);
          //   console.log("compSupplyState[cZRX].index: " + compSupplyState["index"]);
          //   console.log("cZRX totalSupply: " + (await cZRX.totalSupply()).toString());

          const now = await nowTime();
          const userCollScore = await score.getCollScore.call(a.user1, cZRX_addr, now, 0);

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
          //   console.log("deltaSupplyIndex: " + deltaSupplyIndex.toString());
          const expectedCollScore = userScore.mul(supplyMultiplier).mul(deltaSupplyIndex);
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);

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
        });

        it("mint ETH", async () => {
          let compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const prevCompSupplyIndex = compSupplyState["index"];
          //   console.log(prevCompSupplyIndex.toString());

          await comptroller.refreshCompSpeeds();

          // user1 mint
          await bETH.mint({ from: a.user1, value: FIVE_ETH });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow ETH so that index changes
          await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user2 });
          await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user2 });
          await bETH.borrow(ONE_ETH, { from: a.user2 });

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // user1 mint againt
          await bETH.mint({ from: a.user1, value: FIVE_ETH });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.not.equal(ZERO);

          compSupplyState = await comptroller.compSupplyState(cETH_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          await comptroller.refreshCompSpeeds();

          const now = await nowTime();
          const userCollScore = await score.getCollScore.call(a.user1, cETH_addr, now, 0);

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
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cETH.exchangeRateCurrent.call());

          //   console.log("deltaSupplyIndex: " + deltaSupplyIndex.toString());
          const expectedCollScore = userScore.mul(supplyMultiplier).mul(deltaSupplyIndex);
          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);
        });

        it("mint USDT", async () => {
          let compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          await comptroller.refreshCompSpeeds();

          await USDT.approve(bUSDT_addr, FIVE_HUNDRED_USDT, { from: a.user1 });
          await bUSDT.mint(FIVE_HUNDRED_USDT, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow USDT so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bUSDT.borrow(ONE_HUNDRED_USDT, { from: a.user2 });

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // mint againt
          await USDT.approve(bUSDT_addr, FIVE_HUNDRED_USDT, { from: a.user1 });
          await bUSDT.mint(FIVE_HUNDRED_USDT, { from: a.user1 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.not.equal(ZERO);

          compSupplyState = await comptroller.compSupplyState(cUSDT_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          const now = await nowTime();
          const userCollScore = await score.getCollScore.call(a.user1, cUSDT_addr, now, 0);

          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cUSDT_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cUSDT_addr);
          // USDT supplyMultiplier is 3
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(3));

          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cUSDT.exchangeRateCurrent.call());

          const expectedCollScore = userScore.mul(supplyMultiplier).mul(deltaSupplyIndex);
          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);
        });

        it("mint WBTC", async () => {
          let compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const prevCompSupplyIndex = compSupplyState["index"];

          await comptroller.refreshCompSpeeds();

          const POINT_ZERO_FIVE = HALF_WBTC.div(new BN(10)); // $500
          await WBTC.approve(bWBTC_addr, POINT_ZERO_FIVE, { from: a.user1 });
          await bWBTC.mint(POINT_ZERO_FIVE, { from: a.user1 });
          const avatar1 = await registry.avatarOf(a.user1);

          // user2 borrow WBTC so that index changes
          const POINT_ZERO_ONE = POINT_ZERO_FIVE.div(new BN(5)); // $100
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bWBTC.borrow(POINT_ZERO_ONE, { from: a.user2 });

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // mint againt
          await WBTC.approve(bWBTC_addr, POINT_ZERO_FIVE, { from: a.user1 });
          await bWBTC.mint(POINT_ZERO_FIVE, { from: a.user1 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cWBTC_addr)).to.be.bignumber.not.equal(ZERO);

          compSupplyState = await comptroller.compSupplyState(cWBTC_addr);
          const currCompSupplyIndex = compSupplyState["index"];

          const now = await nowTime();
          const userCollScore = await score.getCollScore.call(a.user1, cWBTC_addr, now, 0);

          const user = await score.user(avatar1);
          const collAsset = await score.collAsset(cWBTC_addr);
          const userScore = await score.getScore(user, collAsset, now, 0, 0);
          expect(userScore).to.be.bignumber.not.equal(ZERO);

          const supplyMultiplier = await score.supplyMultiplier(cWBTC_addr);
          // WBTC supplyMultiplier is 5
          expect(supplyMultiplier).to.be.bignumber.equal(new BN(5));

          console.log(prevCompSupplyIndex.toString());
          console.log(currCompSupplyIndex.toString());
          expect(currCompSupplyIndex.gt(prevCompSupplyIndex)).to.be.equal(true);
          const deltaSupplyIndex = currCompSupplyIndex
            .sub(prevCompSupplyIndex)
            .mul(ONE_ETH)
            .div(await cWBTC.exchangeRateCurrent.call());

          const expectedCollScore = userScore.mul(supplyMultiplier).mul(deltaSupplyIndex);
          console.log("expectedCollScore: " + expectedCollScore.toString());
          expect(expectedCollScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedCollScore).to.be.bignumber.equal(userCollScore);
        });
      });

      describe("should have score when user borrow", async () => {
        it("borrow ZRX", async () => {
          let compBorrowState = await comptroller.compBorrowState(cZRX_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          await comptroller.refreshCompSpeeds();

          // user2 mints ZRX
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user2 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user2 });

          // user1 borrow ZRX
          await bETH.mint({ from: a.user1, value: TEN_ETH });
          await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // user2 mint againt
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user2 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user2 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cZRX_addr)).to.be.bignumber.not.equal(ZERO);

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cZRX_addr);
          expect(userDebtScoreBalance).to.be.bignumber.equal(ONE_HUNDRED_ZRX);

          const debtScore = await getNowDebtScore(avatar1.address, cZRX_addr);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          compBorrowState = await comptroller.compBorrowState(cZRX_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cZRX_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(3));

          const expectedDebtScore = debtScore.mul(borrowMultiplier).mul(deltaBorrowIndex);

          const now = await nowTime();
          const userDebtScore = await score.getDebtScore.call(a.user1, cZRX_addr, now, 0);
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cZRX_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(ONE_HUNDRED_ZRX);
        });

        it("borrow ETH", async () => {
          let compBorrowState = await comptroller.compBorrowState(cETH_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          await comptroller.refreshCompSpeeds();

          // user2 mints ETH
          await bETH.mint({ from: a.user2, value: FIVE_ETH });

          // user1 borrow ETH
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bETH.borrow(ONE_ETH, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // user2 mint againt
          await bETH.mint({ from: a.user2, value: FIVE_ETH });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cETH_addr)).to.be.bignumber.not.equal(ZERO);

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(avatar1.address, cETH_addr);
          expect(userDebtScoreBalance).to.be.bignumber.equal(ONE_ETH);

          const debtScore = await getNowDebtScore(avatar1.address, cETH_addr);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          compBorrowState = await comptroller.compBorrowState(cETH_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cETH_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(10));

          const expectedDebtScore = debtScore.mul(borrowMultiplier).mul(deltaBorrowIndex);

          const now = await nowTime();
          const userDebtScore = await score.getDebtScore.call(a.user1, cETH_addr, now, 0);
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cETH_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(ONE_ETH);
        });

        it("borrow USDT", async () => {
          let compBorrowState = await comptroller.compBorrowState(cUSDT_addr);
          const prevCompBorrowIndex = compBorrowState["index"];
          expect(prevCompBorrowIndex).to.be.bignumber.not.equal(ZERO);

          await comptroller.refreshCompSpeeds();

          // user2 mints USDT
          await USDT.approve(bUSDT_addr, FIVE_HUNDRED_USDT, { from: a.user2 });
          await bUSDT.mint(FIVE_HUNDRED_USDT, { from: a.user2 });

          // user1 borrow USDT
          await bETH.mint({ from: a.user1, value: TEN_ETH });
          await bUSDT.borrow(ONE_HUNDRED_USDT, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // user2 mint againt
          await USDT.approve(bUSDT_addr, FIVE_HUNDRED_USDT, { from: a.user2 });
          await bUSDT.mint(FIVE_HUNDRED_USDT, { from: a.user2 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          expect(await comptroller.compSpeeds(cUSDT_addr)).to.be.bignumber.not.equal(ZERO);

          const userDebtScoreBalance = await getCurrentDebtScoreBalance(
            avatar1.address,
            cUSDT_addr,
          );
          expect(userDebtScoreBalance).to.be.bignumber.equal(ONE_HUNDRED_USDT);

          const debtScore = await getNowDebtScore(avatar1.address, cUSDT_addr);
          expect(debtScore).to.be.bignumber.not.equal(ZERO);

          compBorrowState = await comptroller.compBorrowState(cUSDT_addr);
          const currCompBorrowIndex = compBorrowState["index"];
          expect(currCompBorrowIndex).to.be.bignumber.not.equal(ZERO);
          const deltaBorrowIndex = currCompBorrowIndex.sub(prevCompBorrowIndex);
          expect(deltaBorrowIndex).to.be.bignumber.not.equal(ZERO);

          const borrowMultiplier = await score.borrowMultiplier(cUSDT_addr);
          expect(borrowMultiplier).to.be.bignumber.equal(new BN(4));

          const expectedDebtScore = debtScore.mul(borrowMultiplier).mul(deltaBorrowIndex);

          const now = await nowTime();
          const userDebtScore = await score.getDebtScore.call(a.user1, cUSDT_addr, now, 0);
          expect(userDebtScore).to.be.bignumber.not.equal(ZERO);
          expect(expectedDebtScore).to.be.bignumber.equal(userDebtScore);

          const globalDebtScoreBalance = await getGlobalDebtScoreBalance(cUSDT_addr);
          expect(globalDebtScoreBalance).to.be.bignumber.equal(ONE_HUNDRED_USDT);
        });

        it("borrow WBTC");
      });

      it("should have score when repay");

      it("should have score when withdraw");

      it("should have score when liquidate");

      it("should have score when transfer");

      it("should have score when transferFrom");

      describe("=> should not update the score when user quit <=", async () => {
        it("when mint", async () => {
          await comptroller.refreshCompSpeeds();

          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });
          const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

          // user2 borrow ZRX so that index changes
          await bETH.mint({ from: a.user2, value: TEN_ETH });
          await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user2 });

          await advanceBlockAndRefresh(100);
          await advanceBlockAndRefresh(100);

          // mint againt
          await ZRX.approve(bZRX_addr, FIVE_HUNDRED_ZRX, { from: a.user1 });
          await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user1 });

          await time.increase(50000);

          await comptroller.refreshCompSpeeds();

          let now = await nowTime();
          const collBalance = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
          expect(collBalance).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
          const userCollScore = await score.getCollScore.call(a.user1, cZRX_addr, now, 0);
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
          expect(updatedCollBalance).to.be.bignumber.equal(collBalance);
          expect(updatedCollBalance).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
        });

        it("when borrow");

        it("when repay");

        it("when withdraw");

        it("when liquidate");

        it("when transfer");

        it("when transferFrom");
      });

      describe("Integration Tests with Jar", async () => {
        it("two users, member liquidate one user, Jar balance shared with users");
      });
    });
  });
});
