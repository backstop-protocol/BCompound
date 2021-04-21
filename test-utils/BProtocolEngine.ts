import * as b from "../types/index";

import { CompoundUtils } from "./CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import BN from "bn.js";

const shell = require("shelljs");

// Constants
export const ONE_MINUTE = new BN(60);
export const ONE_HOUR = new BN(60).mul(ONE_MINUTE);
export const ONE_DAY = new BN(24).mul(ONE_HOUR);
export const ONE_WEEK = new BN(7).mul(ONE_DAY);
export const ONE_MONTH = new BN(4).mul(ONE_WEEK); // 1 month = 4 weeks

// Compound contracts
const Comp: b.CompContract = artifacts.require("Comp");
const Comptroller: b.ComptrollerContract = artifacts.require("Comptroller");
const FakePriceOracle: b.FakePriceOracleContract = artifacts.require("FakePriceOracle");

// BProtocol contracts
const Migrate: b.MigrateContract = artifacts.require("Migrate");
const GovernanceExecutor: b.GovernanceExecutorContract = artifacts.require("GovernanceExecutor");
const Pool: b.PoolContract = artifacts.require("Pool");
const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
const Registry: b.RegistryContract = artifacts.require("Registry");
const BEther: b.BEtherContract = artifacts.require("BEther");
const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const Avatar: b.AvatarContract = artifacts.require("Avatar");
const BScore: b.BScoreContract = artifacts.require("BScore");
const CompoundJar: b.CompoundJarContract = artifacts.require("CompoundJar");
const JarConnector: b.JarConnectorContract = artifacts.require("JarConnector");

// Compound class to store all Compound deployed contracts
export class Compound {
  public comptroller!: b.ComptrollerInstance;
  public comp!: b.CompInstance;
  public priceOracle!: b.FakePriceOracleInstance;
  public compoundUtil!: CompoundUtils;
}

// BProtocol Class to store all BProtocol deployed contracts
export class BProtocol {
  public pool!: b.PoolInstance;
  public members: Array<string> = new Array();
  public bComptroller!: b.BComptrollerInstance;
  public registry!: b.RegistryInstance;
  public bTokens: Map<string, b.AbsBTokenInstance> = new Map();
  public jar!: b.CompoundJarInstance;
  public jarConnector!: b.JarConnectorInstance;
  public score!: b.BScoreInstance;
  public migrate!: b.MigrateInstance;
  public governanceExecutor!: b.GovernanceExecutorInstance;

  // variable to hold all Compound contracts
  public compound!: Compound;
}

// BProtocol System Engine to manage and deploy BProtocol contracts
export class BProtocolEngine {
  public bProtocol!: BProtocol;

  private compoundUtil = new CompoundUtils();
  private accounts!: Truffle.Accounts;

  constructor(_accounts: Truffle.Accounts) {
    this.accounts = _accounts;
  }

  // Deploy Compound contracts
  public async deployCompound() {
    let jsonFileExists = true;

    try {
      this.compoundUtil.getComptroller();
    } catch (err) {
      jsonFileExists = false;
    }

    if (jsonFileExists) {
      const code = await web3.eth.getCode(this.compoundUtil.getComptroller());
      const isDeployed = code !== "0x";

      if (isDeployed) {
        await revertToSnapShot(process.env.SNAPSHOT_ID || "");
        console.log("Reverted to snapshotId: " + process.env.SNAPSHOT_ID);
        process.env.SNAPSHOT_ID = await takeSnapshot();
        console.log("Snapshot Taken: snapshotId: " + process.env.SNAPSHOT_ID);
        return; // no need to deploy compound
      }
    }

    const deployCommand = "npm run deploy-compound";
    console.log("Executing command:" + deployCommand);
    const log = shell.exec(deployCommand, { async: false });
    process.env.SNAPSHOT_ID = await takeSnapshot();
    console.log("Snapshot Taken: snapshotId: " + process.env.SNAPSHOT_ID);
  }

  // Deploy BProtocol contracts
  public async deployBProtocol(): Promise<BProtocol> {
    this.bProtocol = new BProtocol();
    const _bProtocol = this.bProtocol;

    _bProtocol.jar = await this.deployCompoundJar();
    _bProtocol.pool = await this.deployPool();
    _bProtocol.bComptroller = await this.deployBComptroller();
    _bProtocol.registry = await this.deployRegistry();
    _bProtocol.score = await this.deployScore();
    _bProtocol.jarConnector = await this.deployJarConnector();
    _bProtocol.jar.setConnector(_bProtocol.jarConnector.address);

    await _bProtocol.pool.setRegistry(_bProtocol.registry.address);
    await _bProtocol.bComptroller.setRegistry(_bProtocol.registry.address);
    await _bProtocol.registry.setScore(_bProtocol.score.address);

    _bProtocol.governanceExecutor = await this.deployGovernanceExecutor();
    _bProtocol.migrate = await this.deployMigrate();
    await _bProtocol.governanceExecutor.setGovernance(_bProtocol.migrate.address);
    await _bProtocol.score.transferOwnership(_bProtocol.jarConnector.address);

    _bProtocol.compound = new Compound();
    _bProtocol.compound.comptroller = await Comptroller.at(this.compoundUtil.getComptroller());
    _bProtocol.compound.comp = await Comp.at(this.compoundUtil.getComp());
    _bProtocol.compound.priceOracle = await this.deployFakePriceOracle();
    _bProtocol.compound.compoundUtil = this.compoundUtil;

    // console.log("Pool: " + _bProtocol.pool.address);
    // console.log("BComptroller: " + _bProtocol.bComptroller.address);
    // console.log("Registry: " + _bProtocol.registry.address);

    return this.bProtocol;
  }

  private async deployGovernanceExecutor(): Promise<b.GovernanceExecutorInstance> {
    return await GovernanceExecutor.new(this.bProtocol.registry.address);
  }

  private async deployMigrate(): Promise<b.MigrateInstance> {
    return await Migrate.new(
      this.bProtocol.jarConnector.address,
      this.bProtocol.registry.address,
      this.bProtocol.governanceExecutor.address,
    );
  }

  private async deployCompoundJar(): Promise<b.CompoundJarInstance> {
    const now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const SIX_MONTHS = ONE_MONTH.mul(new BN(6));
    return await CompoundJar.new(now.add(SIX_MONTHS));
  }

  private async deployJarConnector(): Promise<b.JarConnectorInstance> {
    const cTokens: string[] = [
      this.compoundUtil.getContracts("cETH"),
      this.compoundUtil.getContracts("cZRX"),
      this.compoundUtil.getContracts("cBAT"),
      this.compoundUtil.getContracts("cUSDT"),
      this.compoundUtil.getContracts("cWBTC"),
    ];
    return await JarConnector.new(cTokens, this.bProtocol.score.address);
  }

  // Deploy Pool contract
  private async deployPool(): Promise<b.PoolInstance> {
    this.bProtocol.members.push(this.accounts[6]);
    this.bProtocol.members.push(this.accounts[7]);
    this.bProtocol.members.push(this.accounts[8]);
    this.bProtocol.members.push(this.accounts[9]);
    const comptroller = this.compoundUtil.getContracts("Comptroller");
    const cETH = this.compoundUtil.getContracts("cETH");
    const pool = await Pool.new(this.bProtocol.jar.address);
    await pool.setMembers(this.bProtocol.members);
    await pool.setProfitParams(105, 110);
    return pool;
  }

  private async deployScore() {
    const now = new BN((await web3.eth.getBlock("latest")).timestamp);
    const SIX_MONTHS = new BN(6).mul(ONE_MONTH); // 1 month = 4 weeks

    const endDate = now.add(SIX_MONTHS);
    const cTokens: string[] = new Array(5);
    const supplyMultipliers: BN[] = new Array(5);
    const borrowMultipliers: BN[] = new Array(5);

    // cETH
    cTokens[0] = this.compoundUtil.getContracts("cETH");
    supplyMultipliers[0] = new BN(5); // 5x at supply ETH
    borrowMultipliers[0] = new BN(10); // 10x at borrow ETH

    // cBAT
    cTokens[1] = this.compoundUtil.getContracts("cBAT");
    supplyMultipliers[1] = new BN(2); // 2x
    borrowMultipliers[1] = new BN(3); // 3x

    // cZRX
    cTokens[2] = this.compoundUtil.getContracts("cZRX");
    supplyMultipliers[2] = new BN(2); // 2x
    borrowMultipliers[2] = new BN(3); // 3x

    // cUSDT
    cTokens[3] = this.compoundUtil.getContracts("cUSDT");
    supplyMultipliers[3] = new BN(3); // 3x
    borrowMultipliers[3] = new BN(4); // 4x

    // cWBTC
    cTokens[4] = this.compoundUtil.getContracts("cWBTC");
    supplyMultipliers[4] = new BN(5); // 5x
    borrowMultipliers[4] = new BN(10); // 10x

    const score = await BScore.new(
      this.bProtocol.registry.address,
      now,
      endDate,
      cTokens,
      supplyMultipliers,
      borrowMultipliers,
    );
    await score.spin();
    await score.updateIndex(cTokens);
    return score;
  }

  // Deploy BComptroller contract
  private async deployBComptroller(): Promise<b.BComptrollerInstance> {
    return await BComptroller.new(this.compoundUtil.getComptroller());
  }

  // Deploy Registry contract
  private async deployRegistry(): Promise<b.RegistryInstance> {
    const comptroller = this.compoundUtil.getComptroller();
    const comp = this.compoundUtil.getComp();
    const cETH = this.compoundUtil.getContracts("cETH");
    const pool = this.bProtocol.pool;
    const bComptroller = this.bProtocol.bComptroller.address;
    const compVoter = this.getCompVoterAddress();

    const avatar = await Avatar.new();
    return await Registry.new(
      comptroller,
      comp,
      cETH,
      pool.address,
      bComptroller,
      compVoter,
      avatar.address,
    );
  }

  public getBProtocol(): BProtocol {
    return this.bProtocol;
  }

  public getCompVoterAddress(): string {
    return "0x0011223344556677889900112233445566778899"; // TODO - assign a value of a multisig
  }

  // Child Contract Creation
  // ========================

  // Deploy BErc20
  public async deployNewBErc20(symbol: string): Promise<b.BErc20Instance> {
    const bToken_addr = await this._newBToken(symbol);
    const bToken: b.BErc20Instance = await BErc20.at(bToken_addr);
    this.bProtocol.bTokens.set(symbol, bToken);
    return bToken;
  }

  // Deploy BEther
  public async deployNewBEther(): Promise<b.BEtherInstance> {
    const bToken_addr = await this._newBToken("cETH");
    const bToken: b.BEtherInstance = await BEther.at(bToken_addr);
    this.bProtocol.bTokens.set("cETH", bToken);
    return bToken;
  }

  // Deploy BToken
  private async _newBToken(symbol: string): Promise<string> {
    const cToken: string = this.compoundUtil.getContracts(symbol);
    const bToken_addr = await this.bProtocol.bComptroller.newBToken.call(cToken);
    await this.bProtocol.bComptroller.newBToken(cToken);
    return bToken_addr;
  }

  // Deploy Avatar
  public async deployNewAvatar(_from: string = this.accounts[0]): Promise<b.AvatarInstance> {
    const avatar_addr = await this.bProtocol.registry.newAvatar.call({ from: _from });
    await this.bProtocol.registry.newAvatar({ from: _from });
    const avatar: b.AvatarInstance = await Avatar.at(avatar_addr);
    return avatar;
  }

  // Other Contracts
  public async deployFakePriceOracle(): Promise<b.FakePriceOracleInstance> {
    const FAKE_PRICE = new BN(10).pow(new BN(18));
    // Create new FakePriceOracle
    const priceOracle = await FakePriceOracle.new();
    // Sets fake price for each cTokens supported
    await priceOracle.setPrice(this.compoundUtil.getContracts("cETH"), FAKE_PRICE);
    await priceOracle.setPrice(this.compoundUtil.getContracts("cZRX"), FAKE_PRICE);
    await priceOracle.setPrice(this.compoundUtil.getContracts("cBAT"), FAKE_PRICE);
    await priceOracle.setPrice(this.compoundUtil.getContracts("cUSDT"), FAKE_PRICE);
    // Set the FakePriceOracle in Comptroller
    await this.bProtocol.compound.comptroller._setPriceOracle(priceOracle.address);
    return priceOracle;
  }
}
