import * as b from "../../types/index";
import * as json from "../../playground/bcompound.json";
import BN from "bn.js";

import { BAccounts } from "../../test-utils/BAccounts";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

const chai = require("chai");
const expect = chai.expect;

const ZERO = new BN(0);

// Compound
const Comptroller: b.ComptrollerContract = artifacts.require("Comptroller");
const Comp: b.CompContract = artifacts.require("Comp");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");
const ERC20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const FakePriceOracle: b.FakePriceOracleContract = artifacts.require("FakePriceOracle");

// BCompound
const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
const GovernanceExecutor: b.GovernanceExecutorContract = artifacts.require("GovernanceExecutor");
const CompoundJar: b.CompoundJarContract = artifacts.require("CompoundJar");
const JarConnector: b.JarConnectorContract = artifacts.require("JarConnector");
const Migrate: b.MigrateContract = artifacts.require("Migrate");
const Pool: b.PoolContract = artifacts.require("Pool");
const Registry: b.RegistryContract = artifacts.require("Registry");
const BScore: b.BScoreContract = artifacts.require("BScore");
const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const BEther: b.BEtherContract = artifacts.require("BEther");
const Avatar: b.AvatarContract = artifacts.require("Avatar");

let engine: BProtocolEngine;
let a: BAccounts;

// Compound
let comptroller: b.ComptrollerInstance;
let comp: b.CompInstance;
let oracle: b.FakePriceOracleInstance;

// BProtocol
let registry: b.RegistryInstance;
let bComptroller: b.BComptrollerInstance;
let governanceExecutor: b.GovernanceExecutorInstance;
let compoundJar: b.CompoundJarInstance;
let jarConnector: b.JarConnectorInstance;
let migrate: b.MigrateInstance;
let pool: b.PoolInstance;
let bScore: b.BScoreInstance;

// ETH
let cETH: b.CEtherInstance;
let bETH: b.BEtherInstance;

// ZRX
let ZRX: b.Erc20DetailedInstance;
let cZRX: b.CErc20Instance;
let bZRX: b.BErc20Instance;

// BAT
let BAT: b.Erc20DetailedInstance;
let cBAT: b.CErc20Instance;
let bBAT: b.BErc20Instance;

// USDT
let USDT: b.Erc20DetailedInstance;
let cUSDT: b.CErc20Instance;
let bUSDT: b.BErc20Instance;

// WBTC
let WBTC: b.Erc20DetailedInstance;
let cWBTC: b.CErc20Instance;
let bWBTC: b.BErc20Instance;

// VALUES
const SCALE = new BN(10).pow(new BN(18));
const ONE_ETH = new BN(10).pow(new BN(18));
const ONE_ZRX = new BN(10).pow(new BN(18));
const ONE_BAT = new BN(10).pow(new BN(18));
const ONE_USDT = new BN(10).pow(new BN(6));
const ONE_WBTC = new BN(10).pow(new BN(8));

// MAINNET DATA
// =============
// TOKEN PRICES
const ONE_ETH_IN_USD_MAINNET = new BN("1617455000000000000000"); // 18 decimals, ($1617.45)
const ONE_ZRX_IN_USD_MAINNET = new BN("1605584000000000000"); // 18 decimal, ($1.6)
const ONE_USDT_IN_USD_MAINNET = new BN("1000000000000000000000000000000"); //30 decimals, ($1)
const ONE_BAT_IN_USD_MAINNET = new BN("409988000000000000"); // 18 decimals, ($0.4)
const ONE_WBTC_IN_USD_MAINNET = new BN("392028400000000000000000000000000"); // 28 decimals, ($39202.8)

contract("PlayGround", async (accounts) => {
  engine = new BProtocolEngine(accounts);
  a = new BAccounts(accounts);

  let snapshotId: string;

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  before(async () => {
    // ensure that Compound contracts are already deployed
    await validateCompoundDeployed();

    await validateBCompoundDeployed();

    // NOTICE: USE ONLY WHEN CREATING A NEW SNAPSHOT
    // ==================================
    // await deployBCompoundAndPrint();
    // await deployBTokens();
    // ==================================

    await validateBTokens();

    await setMainnetTokenPrice();

    await printDetails();
  });

  describe("PlayGround", async () => {
    it("Test mint", async () => {
      const ONE_THOUSAND_ZRX = ONE_ZRX.mul(new BN(1000));
      // Deployer give some ZRX to user1
      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      // user1 creates his avatar
      await registry.newAvatar({ from: a.user1 });
      const avatar1_addr = await registry.avatarOf(a.user1);
      expect(avatar1_addr).to.be.not.equal(ZERO_ADDRESS);
      const avatar1 = await Avatar.at(avatar1_addr);

      // user1 mints ZRX
      await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user1 });
      await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });
      expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.greaterThan(ZERO);
    });

    it("Test borrow", async () => {
      const FIVE_HUNDRED_ZRX = ONE_ZRX.mul(new BN(500));
      // deployer sends ZRX to user2
      await ZRX.transfer(a.user2, FIVE_HUNDRED_ZRX, { from: a.deployer });

      // user2 mints ZRX to provide liquidity to market
      await ZRX.approve(bZRX.address, FIVE_HUNDRED_ZRX, { from: a.user2 });
      await bZRX.mint(FIVE_HUNDRED_ZRX, { from: a.user2 });
      expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.greaterThan(ZERO);

      // user1 borrow ZRX
      await bETH.mint({ from: a.user1, value: ONE_ETH }); // $1617.45 collateral
      expect(await bETH.balanceOf(a.user1)).to.be.bignumber.greaterThan(ZERO);
      const ONE_HUNDRED_ZRX = ONE_ZRX.mul(new BN(100)); // $1.6 * 100 = $160 borrow
      await bZRX.borrow(ONE_HUNDRED_ZRX, { from: a.user1 });
      expect(await bZRX.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.greaterThan(ZERO);
    });

    it("Test liquidateBorrow by member", async () => {
      const ONE_USD = SCALE;
      const _50Percent = SCALE.div(new BN(2)); // 50%
      // validate values
      const closeFactor = await comptroller.closeFactorMantissa();
      expect(closeFactor).to.be.bignumber.equal(_50Percent);
      const market = await comptroller.markets(cETH.address);
      expect(market["collateralFactorMantissa"]).to.be.bignumber.equal(_50Percent);

      // deployer sends ZRX to user2
      const ONE_THOUSAND_ZRX = ONE_ZRX.mul(new BN(1000));
      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });

      // user2 mints ZRX to provide liquidity to market
      await ZRX.approve(bZRX.address, ONE_THOUSAND_ZRX, { from: a.user2 });
      await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user2 });
      expect(await bZRX.balanceOf(a.user2)).to.be.bignumber.greaterThan(ZERO);

      // user1 mint ETH
      await bETH.mint({ from: a.user1, value: ONE_ETH }); // $1617.45 collateral
      expect(await bETH.balanceOf(a.user1)).to.be.bignumber.greaterThan(ZERO);

      // $1617.45 * 50% = $808.725
      // Borrow $808 worth of ZRX
      // user1 borrow ZRX
      const ONE_USD_WORTH_OF_ZRX = ONE_ZRX.mul(SCALE).div(ONE_ZRX_IN_USD_MAINNET);
      const _808USD_WO_ZRX = ONE_USD_WORTH_OF_ZRX.mul(new BN(808));
      await bZRX.borrow(_808USD_WO_ZRX, { from: a.user1 });
      expect(await bZRX.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.greaterThan(ZERO);

      const avatar1 = await Avatar.at(await registry.avatarOf(a.user1));

      // validate account liquidity
      let accLiquidity = await bComptroller.getAccountLiquidity(a.user1);
      expect(accLiquidity["err"]).to.be.bignumber.equal(ZERO);
      expect(accLiquidity["liquidity"]).to.be.bignumber.lessThan(ONE_USD);
      expect(accLiquidity["shortFall"]).to.be.bignumber.equal(ZERO);

      // increase ZRX price by 5%
      const new_ONE_ZRX_IN_USD_MAINNET = ONE_ZRX_IN_USD_MAINNET.mul(new BN(105)).div(new BN(100));
      await oracle.setPrice(cZRX.address, new_ONE_ZRX_IN_USD_MAINNET);

      // validate account liquidity
      accLiquidity = await bComptroller.getAccountLiquidity(a.user1);
      expect(accLiquidity["err"]).to.be.bignumber.equal(ZERO);
      expect(accLiquidity["liquidity"]).to.be.bignumber.equal(ZERO);
      expect(accLiquidity["shortFall"]).to.be.bignumber.greaterThan(ZERO); // shortFall increased

      // member deposit
      const debtInfo = await pool.getDebtTopupInfo.call(a.user1, bZRX.address);
      const minTopup = debtInfo["minTopup"];
      await ZRX.approve(pool.address, minTopup, { from: a.member1 });
      await pool.methods["deposit(address,uint256)"](ZRX.address, minTopup, {
        from: a.member1,
      });

      // member topup
      await pool.topup(a.user1, bZRX.address, minTopup, false, { from: a.member1 });

      // deposit & Liquidate
      const maxLiquidationAmt = await avatar1.getMaxLiquidationAmount.call(cZRX.address);
      const remainingBalToDeposit = maxLiquidationAmt.sub(minTopup);
      await ZRX.approve(pool.address, remainingBalToDeposit, { from: a.member1 });
      await pool.methods["deposit(address,uint256)"](ZRX.address, remainingBalToDeposit, {
        from: a.member1,
      });

      await pool.liquidateBorrow(a.user1, bETH.address, bZRX.address, maxLiquidationAmt, {
        from: a.member1,
      });
    });

    it("PLAYGROUND", async () => {
      // ========================
      // README
      // ========================
      // WRITE YOUR TESTS HERE
      // ========================
      // To write tests quickly with TypeChain, install VSCode and install following plugins:
      // https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
      // https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin
      // TypeChain will help you in listing all functions of a contract in code editor only.
      // ========================
    });
  });
});

async function printDetails() {
  // Compound
  // ==========
  console.log("===============");
  console.log("Compound");
  console.log("===============");

  console.log("------------------------");
  console.log("Deployer Token Balances:");
  console.log("------------------------");
  await printAllTokenBalanceOf(a.deployer);

  console.log("------------------------");
  console.log("Member-1 Token Balances:");
  console.log("------------------------");
  await printAllTokenBalanceOf(a.member1);

  console.log("------------------------");
  console.log("Member-2 Token Balances:");
  console.log("------------------------");
  await printAllTokenBalanceOf(a.member2);

  console.log("------------------------");
  console.log("Member-3 Token Balances:");
  console.log("------------------------");
  await printAllTokenBalanceOf(a.member3);

  console.log("------------------------");
  console.log("Member-4 Token Balances:");
  console.log("------------------------");
  await printAllTokenBalanceOf(a.member4);

  // BProtocol
  // ==========
  console.log("===============");
  console.log("BProtocol");
  console.log("===============");
  console.log("Members: " + (await pool.getMembers()));
  console.log("Members length: " + (await pool.membersLength()));
}

async function printAllTokenBalanceOf(user: string) {
  await printTokenBalanceOf(ZRX, user);
  await printTokenBalanceOf(BAT, user);
  await printTokenBalanceOf(USDT, user);
  await printTokenBalanceOf(WBTC, user);
}

async function printTokenBalanceOf(token: b.Erc20DetailedInstance, user: string) {
  const symbol = await token.symbol();
  const userBalance = await token.balanceOf(user);
  const decimals = await token.decimals();
  const ONE_TOKEN = new BN(10).pow(new BN(decimals));
  console.log(symbol + " Balance: " + userBalance + "(" + userBalance.div(ONE_TOKEN) + ")");
}

async function validateBTokens() {
  bETH = await BEther.at(await bComptroller.c2b(cETH.address));
  expect(bETH.address).to.be.not.equal(ZERO_ADDRESS);
  bZRX = await BErc20.at(await bComptroller.c2b(cZRX.address));
  expect(bZRX.address).to.be.not.equal(ZERO_ADDRESS);
  bBAT = await BErc20.at(await bComptroller.c2b(cBAT.address));
  expect(bBAT.address).to.be.not.equal(ZERO_ADDRESS);
  bUSDT = await BErc20.at(await bComptroller.c2b(cUSDT.address));
  expect(bUSDT.address).to.be.not.equal(ZERO_ADDRESS);
  bWBTC = await BErc20.at(await bComptroller.c2b(cWBTC.address));
  expect(bWBTC.address).to.be.not.equal(ZERO_ADDRESS);
}

async function validateCompoundDeployed() {
  console.log("Validating Compound Contracts ...");
  comptroller = await Comptroller.at(json.compound.Comptroller);
  expect(comptroller.address).to.be.not.equal(ZERO_ADDRESS);

  comp = await Comp.at(json.compound.Comp);
  expect(comp.address).to.be.not.equal(ZERO_ADDRESS);

  oracle = await FakePriceOracle.at(json.compound.PriceOracle);
  expect(oracle.address).to.be.not.equal(ZERO_ADDRESS);

  // cTokens and Underlying
  cETH = await CEther.at(json.compound.cETH);
  expect(cETH.address).to.be.not.equal(ZERO_ADDRESS);

  ZRX = await ERC20Detailed.at(json.compound.ZRX);
  expect(ZRX.address).to.be.not.equal(ZERO_ADDRESS);
  cZRX = await CErc20.at(json.compound.cZRX);
  expect(cZRX.address).to.be.not.equal(ZERO_ADDRESS);

  BAT = await ERC20Detailed.at(json.compound.BAT);
  expect(BAT.address).to.be.not.equal(ZERO_ADDRESS);
  cBAT = await CErc20.at(json.compound.cBAT);
  expect(cBAT.address).to.be.not.equal(ZERO_ADDRESS);

  USDT = await ERC20Detailed.at(json.compound.USDT);
  expect(USDT.address).to.be.not.equal(ZERO_ADDRESS);
  cUSDT = await CErc20.at(json.compound.cUSDT);
  expect(cUSDT.address).to.be.not.equal(ZERO_ADDRESS);

  WBTC = await ERC20Detailed.at(json.compound.WBTC);
  expect(WBTC.address).to.be.not.equal(ZERO_ADDRESS);
  cWBTC = await CErc20.at(json.compound.cWBTC);
  expect(cWBTC.address).to.be.not.equal(ZERO_ADDRESS);
}

async function validateBCompoundDeployed() {
  console.log("Validating BCompound Contracts ...");
  bComptroller = await BComptroller.at(json.bcompound.BComptroller);
  expect(bComptroller.address).to.be.not.equal(ZERO_ADDRESS);

  governanceExecutor = await GovernanceExecutor.at(json.bcompound.GovernanceExecutor);
  expect(governanceExecutor.address).to.be.not.equal(ZERO_ADDRESS);

  compoundJar = await CompoundJar.at(json.bcompound.CompoundJar);
  expect(compoundJar.address).to.be.not.equal(ZERO_ADDRESS);

  jarConnector = await JarConnector.at(json.bcompound.JarConnector);
  expect(jarConnector.address).to.be.not.equal(ZERO_ADDRESS);

  migrate = await Migrate.at(json.bcompound.Migrate);
  expect(migrate.address).to.be.not.equal(ZERO_ADDRESS);

  pool = await Pool.at(json.bcompound.Pool);
  expect(pool.address).to.be.not.equal(ZERO_ADDRESS);

  registry = await Registry.at(json.bcompound.Registry);
  expect(registry.address).to.be.not.equal(ZERO_ADDRESS);

  bScore = await BScore.at(json.bcompound.BScore);
  expect(bScore.address).to.be.not.equal(ZERO_ADDRESS);
}

async function setMainnetTokenPrice() {
  // mainnet snapshot prices
  await oracle.setPrice(cETH.address, ONE_ETH_IN_USD_MAINNET);
  await oracle.setPrice(cZRX.address, ONE_ZRX_IN_USD_MAINNET);
  await oracle.setPrice(cUSDT.address, ONE_USDT_IN_USD_MAINNET);
  await oracle.setPrice(cBAT.address, ONE_BAT_IN_USD_MAINNET);
  await oracle.setPrice(cWBTC.address, ONE_WBTC_IN_USD_MAINNET);
}

// NOTICE: BELOW FUNCTIONS ARE ONLY USED TO CREATE SNAPSHOT.
// ===========================================================
/*
async function deployBCompoundAndPrint() {
  const bProtocol = await engine.deployBProtocol();

  // deploy BTokens for ETH, ZRX, BAT, USDT, WBTC

  console.log("BComptroller: " + bProtocol.bComptroller.address);
  console.log("GovernanceExecutor: " + bProtocol.governanceExecutor.address);
  console.log("CompoundJar: " + bProtocol.jar.address);
  console.log("JarConnector: " + bProtocol.jarConnector.address);
  console.log("Migrate: " + bProtocol.migrate.address);
  console.log("Pool: " + bProtocol.pool.address);
  console.log("Registry: " + bProtocol.registry.address);
  console.log("BScore: " + bProtocol.score.address);

  console.log("Oracle: " + bProtocol.compound.priceOracle.address);

  await validateCompoundDeployed();
  await validateBCompoundDeployed();
}

async function deployBTokens() {
  console.log("Deploying BTokens...");
  // ETH
  await bComptroller.newBToken(cETH.address);
  bETH = await BEther.at(await bComptroller.c2b(cETH.address));
  expect(bETH.address).to.be.not.equal(ZERO);

  // ZRX
  await bComptroller.newBToken(cZRX.address);
  bZRX = await BErc20.at(await bComptroller.c2b(cZRX.address));
  expect(bZRX.address).to.be.not.equal(ZERO);

  // BAT
  await bComptroller.newBToken(cBAT.address);
  bBAT = await BErc20.at(await bComptroller.c2b(cBAT.address));
  expect(bBAT.address).to.be.not.equal(ZERO);

  // USDT
  await bComptroller.newBToken(cUSDT.address);
  bUSDT = await BErc20.at(await bComptroller.c2b(cUSDT.address));
  expect(bUSDT.address).to.be.not.equal(ZERO);

  // WBTC
  await bComptroller.newBToken(cWBTC.address);
  bWBTC = await BErc20.at(await bComptroller.c2b(cWBTC.address));
  expect(bWBTC.address).to.be.not.equal(ZERO);
  console.log("BTokens deployed.");
}
*/
