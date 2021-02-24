import * as b from "../../types/index";
import { BProtocolEngine, BProtocol, ONE_DAY, ONE_MONTH } from "../../test-utils/BProtocolEngine";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");
import BN from "bn.js";
import { CompoundUtils } from "@utils/CompoundUtils";
import { toWei } from "web3-utils";

const ComptrollerScenario: b.ComptrollerScenarioContract = artifacts.require("ComptrollerScenario");
const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const Avatar: b.AvatarContract = artifacts.require("Avatar");
const CToken: b.CTokenContract = artifacts.require("CToken");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

const ONE_ZRX = new BN(10).pow(new BN(18));
const TEN_ZRX = new BN(10).mul(ONE_ZRX);
const FIFTY_ZRX = new BN(50).mul(ONE_ZRX);
const ONE_HUNDRED_ZRX = new BN(100).mul(ONE_ZRX);
const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);
const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);

contract("Migrate", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;
  let registry: b.RegistryInstance;
  let migrate: b.MigrateInstance;
  let jarConnector: b.JarConnectorInstance;
  let governanceExecutor: b.GovernanceExecutorInstance;
  let score: b.BScoreInstance;
  let priceOracle: b.FakePriceOracleInstance;

  let cTokens: string[];

  // COMP SPEEDS
  const cZRX_COMP_SPEEDS_MAINNET = new BN("1950000000000000");
  const cETH_COMP_SPEEDS_MAINNET = new BN("10750000000000000");
  const cUSDT_COMP_SPEEDS_MAINNET = new BN("9650000000000000");
  const cBAT_COMP_SPEEDS_MAINNET = new BN("1950000000000000");
  const cWBTC_COMP_SPEEDS_MAINNET = new BN("10750000000000000");

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    registry = bProtocol.registry;
    migrate = bProtocol.migrate;
    jarConnector = bProtocol.jarConnector;
    governanceExecutor = bProtocol.governanceExecutor;
    score = bProtocol.score;
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
    cTokens = [
      compoundUtil.getContracts("cETH"),
      compoundUtil.getContracts("cZRX"),
      compoundUtil.getContracts("cBAT"),
      compoundUtil.getContracts("cUSDT"),
      compoundUtil.getContracts("cWBTC"),
    ];
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

  describe("Migrate", async () => {
    let avatar1: b.AvatarInstance;
    let avatar2: b.AvatarInstance;

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
      await registry.newAvatar({ from: a.user1 });
      avatar1 = await Avatar.at(await registry.avatarOf(a.user1));
      await registry.newAvatar({ from: a.user2 });
      avatar2 = await Avatar.at(await registry.avatarOf(a.user2));

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

      // MAINNET
      await setMainnetTokenPrice();

      await comptroller.refreshCompSpeeds();
    });

    async function setupOneUserWithScore() {
      await score.updateIndex(cTokens);
      await comptroller.refreshCompSpeeds();
      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });

      // user1 should have score
      const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));
      await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
      await bZRX.mint(_500USD_ZRX, { from: a.user1 });
      const avatar1 = await registry.avatarOf(a.user1);

      await advanceBlockInCompound(200);
      await setMainnetCompSpeeds();

      // just trigger supply index recalculation
      await comptroller.mintAllowed(cZRX_addr, avatar1, ONE_ZRX);
      await time.increase(ONE_MONTH);
      await score.updateIndex(cTokens);

      const now = await nowTime();
      const userCollScore = await score.getCollScore(a.user1, cZRX_addr, now);
      expect(userCollScore).to.be.bignumber.not.equal(ZERO);
    }

    async function setupThreeUsersWithScore() {
      await score.updateIndex(cTokens);
      await comptroller.refreshCompSpeeds();

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      await ZRX.transfer(a.user3, ONE_THOUSAND_ZRX, { from: a.deployer });

      // user should have score
      const _500USD_ZRX = ONE_USD_WO_ZRX_MAINNET.mul(new BN(500));

      await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user1 });
      await bZRX.mint(_500USD_ZRX, { from: a.user1 });
      const avatar1 = await registry.avatarOf(a.user1);

      await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user2 });
      await bZRX.mint(_500USD_ZRX, { from: a.user2 });
      const avatar2 = await registry.avatarOf(a.user2);

      await ZRX.approve(bZRX_addr, _500USD_ZRX, { from: a.user3 });
      await bZRX.mint(_500USD_ZRX, { from: a.user3 });
      const avatar3 = await registry.avatarOf(a.user3);

      await advanceBlockInCompound(200);
      await setMainnetCompSpeeds();

      // just trigger supply index recalculation
      await comptroller.mintAllowed(cZRX_addr, avatar1, ONE_ZRX);
      await comptroller.mintAllowed(cZRX_addr, avatar2, ONE_ZRX);
      await comptroller.mintAllowed(cZRX_addr, avatar3, ONE_ZRX);

      await time.increase(ONE_MONTH);
      await score.updateIndex(cTokens);

      const now = await nowTime();
      const user1CollScore = await score.getCollScore(a.user1, cZRX_addr, now);
      expect(user1CollScore).to.be.bignumber.not.equal(ZERO);
      const user2CollScore = await score.getCollScore(a.user2, cZRX_addr, now);
      expect(user2CollScore).to.be.bignumber.not.equal(ZERO);
      const user3CollScore = await score.getCollScore(a.user3, cZRX_addr, now);
      expect(user3CollScore).to.be.bignumber.not.equal(ZERO);
    }

    describe("Constructor", async () => {
      beforeEach(async () => {
        await setupOneUserWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);
      });

      it("should have expected setup", async () => {
        expect(await migrate.DELAY()).to.be.bignumber.equal(ONE_DAY.mul(new BN(2)));
        expect(await migrate.jarConnector()).to.be.equal(jarConnector.address);
        expect(await migrate.registry()).to.be.equal(registry.address);
        expect(await migrate.executor()).to.be.equal(governanceExecutor.address);

        expect(await governanceExecutor.governance()).to.be.equal(migrate.address);
        expect(await registry.owner()).to.be.equal(governanceExecutor.address);
      });

      it("score of the user should not increase after spin", async () => {
        let now = await nowTime();
        let userCollScoreBal = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
        // console.log(userCollScoreBal.toString());
        const oldUserScore = await jarConnector.getUserScore(a.user1);
        // console.log(oldUserScore.toString());

        await jarConnector.spin();
        await time.increase(1);

        // user score should not increase
        now = await nowTime();
        userCollScoreBal = await getCurrentCollScoreBalance(avatar1.address, cZRX_addr);
        // console.log(userCollScoreBal.toString());
        const newUserScore = await jarConnector.getUserScore(a.user1);
        // console.log(newUserScore.toString());
        expect(oldUserScore).to.be.bignumber.equal(newUserScore);
      });
    });

    describe("Migrate.propose()", async () => {
      beforeEach(async () => {
        await setupOneUserWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);

        await jarConnector.spin();
      });

      it("should fail when newOwner address is zero", async () => {
        await expectRevert(migrate.propose(ZERO_ADDRESS), "newOwner-cannot-be-zero");
      });

      it("anyone can propose a new owner", async () => {
        const index = ZERO;
        const proposalId = await migrate.propose.call(a.dummy1, { from: a.other });
        expect(proposalId).to.be.bignumber.equal(index); // first one is zero

        await expectRevert.unspecified(migrate.proposals(index));

        const tx = await migrate.propose(a.dummy1, { from: a.other });
        expectEvent(tx, "NewProposal", { proposalId: index, newOwner: a.dummy1 });

        const proposal = await migrate.proposals(index);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("can propose multiple proposals", async () => {
        // propose 1: other proposing "dummy1"
        let proposalId = await migrate.propose.call(a.dummy1, { from: a.other });
        expect(proposalId).to.be.bignumber.equal(ZERO);
        let tx = await migrate.propose(a.dummy1, { from: a.other });
        expectEvent(tx, "NewProposal", { proposalId: ZERO, newOwner: a.dummy1 });

        // propose 2: dummy4 proposing "dummy2"
        const ONE = new BN(1);
        proposalId = await migrate.propose.call(a.dummy2, { from: a.dummy4 });
        expect(proposalId).to.be.bignumber.equal(ONE);
        tx = await migrate.propose(a.dummy2, { from: a.dummy4 });
        expectEvent(tx, "NewProposal", { proposalId: ONE, newOwner: a.dummy2 });
      });
    });

    describe("Migrate.vote()", async () => {
      beforeEach(async () => {
        await setupOneUserWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);

        await jarConnector.spin();

        // propose
        await migrate.propose(a.dummy1, { from: a.other });
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("cannot vote on non-existing proposal", async () => {
        const nonExistingProposalId = new BN(1);
        await expectRevert.unspecified(migrate.vote(nonExistingProposalId, { from: a.user1 }));
      });

      it("user should vote", async () => {
        let proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        const tx = await migrate.vote(ZERO, { from: a.user1 });
        expectEvent(tx, "Voted", { proposalId: ZERO, user: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);
      });

      it("user with zero score should not increase votes", async () => {
        let proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        await migrate.vote(ZERO, { from: a.user2 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);
      });

      it("should fail when user try to vote again", async () => {
        let proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        await migrate.vote(ZERO, { from: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);

        await expectRevert(migrate.vote(ZERO, { from: a.user1 }), "already-voted");
      });

      it("user without avatar cannot vote", async () => {
        await expectRevert(migrate.vote(ZERO, { from: a.user3 }), "avatar-does-not-exist");
      });
    });

    describe("Migrate.cancelVote()", async () => {
      beforeEach(async () => {
        await setupOneUserWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);

        await jarConnector.spin();

        // propose
        await migrate.propose(a.dummy1, { from: a.other });
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("user can cancel his vote", async () => {
        let proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        // console.log(await (await jarConnector.getUserScore(a.user1)).toString());
        await migrate.vote(ZERO, { from: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);

        // console.log(await (await jarConnector.getUserScore(a.user1)).toString());
        const score = await jarConnector.getUserScore(a.user1);
        const tx = await migrate.cancelVote(ZERO, { from: a.user1 });
        expectEvent(tx, "VoteCancelled", { proposalId: ZERO, user: a.user1, score: score });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);
      });

      it("user can re-vote after cancel vote", async () => {
        let proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        await migrate.vote(ZERO, { from: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);

        await migrate.cancelVote(ZERO, { from: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);

        await migrate.vote(ZERO, { from: a.user1 });

        proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);
      });
    });

    describe("Migrate.queueProposal()", async () => {
      beforeEach(async () => {
        await setupThreeUsersWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);

        await jarConnector.spin();

        // create proposal
        await migrate.propose(a.dummy1);
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("queue proposal when quorum passed", async () => {
        // user vote - 66%
        await migrate.vote(ZERO, { from: a.user1 });
        await migrate.vote(ZERO, { from: a.user2 });

        expect(await jarConnector.getGlobalScore()).to.be.bignumber.greaterThan(ZERO);

        const tx = await migrate.queueProposal(ZERO);
        expectEvent(tx, "Queued", { proposalId: ZERO });

        const now = await nowTime();
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(now.add(ONE_DAY.mul(new BN(2))));
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("should fail when quorum not passed", async () => {
        // user vote - 33%
        await migrate.vote(ZERO, { from: a.user1 });

        expect(await jarConnector.getGlobalScore()).to.be.bignumber.greaterThan(ZERO);

        await expectRevert(migrate.queueProposal(ZERO), "quorum-not-passed");

        const now = await nowTime();
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);
      });

      it("should fail when already queued", async () => {
        // user vote - 66%
        await migrate.vote(ZERO, { from: a.user1 });
        await migrate.vote(ZERO, { from: a.user2 });

        expect(await jarConnector.getGlobalScore()).to.be.bignumber.greaterThan(ZERO);

        const tx = await migrate.queueProposal(ZERO);

        expectEvent(tx, "Queued", { proposalId: ZERO });
        const now = await nowTime();
        const proposal = await migrate.proposals(ZERO);
        expect(proposal["forVotes"]).to.be.bignumber.greaterThan(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(now.add(ONE_DAY.mul(new BN(2))));
        expect(proposal["newOwner"]).to.be.equal(a.dummy1);

        await expectRevert(migrate.queueProposal(ZERO), "already-queued");
      });
    });

    describe("Migrate.executeProposal()", async () => {
      beforeEach(async () => {
        await setupThreeUsersWithScore();

        // increase time to 6 months
        await expectRevert(jarConnector.spin(), "too-early");
        const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
        await time.increase(SIX_MONTHS);

        await jarConnector.spin();
        await migrate.propose(a.dummy1);

        // user vote - 66%
        await migrate.vote(ZERO, { from: a.user1 });
        await migrate.vote(ZERO, { from: a.user2 });

        await migrate.queueProposal(ZERO);
      });

      it("execute proposal", async () => {
        expect(await registry.owner()).to.be.equal(governanceExecutor.address);

        await time.increase(await migrate.DELAY());

        const tx = await migrate.executeProposal(ZERO);
        expectEvent(tx, "Executed", { proposalId: ZERO });

        expect(await registry.owner()).to.be.equal(a.dummy1);
      });

      it("should fail when not queued before", async () => {
        const ONE = new BN(1);
        await migrate.propose(a.dummy2);

        const proposal = await migrate.proposals(ONE);
        expect(proposal["forVotes"]).to.be.bignumber.equal(ZERO);
        expect(proposal["eta"]).to.be.bignumber.equal(ZERO);
        expect(proposal["newOwner"]).to.be.equal(a.dummy2);

        await expectRevert(migrate.executeProposal(ONE), "proposal-not-queued");
      });

      it("should fail when delay is not over yet", async () => {
        await expectRevert(migrate.executeProposal(ZERO), "delay-not-over");
      });
    });
  });
});
