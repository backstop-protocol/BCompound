import * as b from "../../types/index";
import * as json from "../../playground/bcompound.json";
import BN from "bn.js";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

const chai = require("chai");
const expect = chai.expect;

const ZERO = new BN(0);

// Compound
const Comptroller: b.ComptrollerContract = artifacts.require("Comptroller");

// BCompound
const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
const GovernanceExecutor: b.GovernanceExecutorContract = artifacts.require("GovernanceExecutor");
const CompoundJar: b.CompoundJarContract = artifacts.require("CompoundJar");
const JarConnector: b.JarConnectorContract = artifacts.require("JarConnector");
const Migrate: b.MigrateContract = artifacts.require("Migrate");
const Pool: b.PoolContract = artifacts.require("Pool");
const Registry: b.RegistryContract = artifacts.require("Registry");
const BScore: b.BScoreContract = artifacts.require("BScore");

let engine: BProtocolEngine;

contract("PlayGround", async (accounts) => {
  engine = new BProtocolEngine(accounts);

  before(async () => {
    // ensure that Compound contracts are already deployed
    await validateCompoundDeployed();

    await validateBCompoundDeployed();

    // NOTICE: Use only when creating new snapshot
    // await deployBCompoundAndPrint();
  });

  describe("Validation", async () => {
    it("validate deployment setup", async () => {
      //
    });
  });
});

// This function is only used at the snapshot creation time.
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
}
*/

async function validateCompoundDeployed() {
  const comptroller = await Comptroller.at(json.compound.Comptroller);
  expect(comptroller.address).to.be.not.equal(ZERO_ADDRESS);
}

async function validateBCompoundDeployed() {
  const bComptroller = await BComptroller.at(json.bcompound.BComptroller);
  expect(bComptroller.address).to.be.not.equal(ZERO_ADDRESS);

  const ge = await GovernanceExecutor.at(json.bcompound.GovernanceExecutor);
  expect(ge.address).to.be.not.equal(ZERO_ADDRESS);

  const compoundJar = await CompoundJar.at(json.bcompound.CompoundJar);
  expect(compoundJar.address).to.be.not.equal(ZERO_ADDRESS);

  const jarConnector = await JarConnector.at(json.bcompound.JarConnector);
  expect(jarConnector.address).to.be.not.equal(ZERO_ADDRESS);

  const migrate = await Migrate.at(json.bcompound.Migrate);
  expect(migrate.address).to.be.not.equal(ZERO_ADDRESS);

  const pool = await Pool.at(json.bcompound.Pool);
  expect(pool.address).to.be.not.equal(ZERO_ADDRESS);

  const registry = await Registry.at(json.bcompound.Registry);
  expect(registry.address).to.be.not.equal(ZERO_ADDRESS);

  const bScore = await BScore.at(json.bcompound.BScore);
  expect(bScore.address).to.be.not.equal(ZERO_ADDRESS);
}
