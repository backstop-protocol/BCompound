import * as b from "../../types/index";
import { BProtocolEngine, BProtocol, ONE_DAY } from "../../test-utils/BProtocolEngine";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");
import BN from "bn.js";
import { CompoundUtils } from "@utils/CompoundUtils";
import { toWei } from "web3-utils";
import { governorAddress } from "compound-protocol/scenario/src/Value/GovernorValue";

const GovernanceExecutor: b.GovernanceExecutorContract = artifacts.require("GovernanceExecutor");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

contract("GovernanceExecutor", async (accounts) => {
  let snapshotId: string;

  const TWO_DAYS = ONE_DAY.mul(new BN(2));
  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;
  let pool: b.PoolInstance;
  let priceOracle: b.FakePriceOracleInstance;
  let registry: b.RegistryInstance;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
    priceOracle = bProtocol.compound.priceOracle;
    registry = bProtocol.registry;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("GovernanceExecutor.setGovernance()", async () => {
    let newGovExecutor: b.GovernanceExecutorInstance;

    beforeEach(async () => {
      newGovExecutor = await GovernanceExecutor.new(bProtocol.registry.address, TWO_DAYS);
      expect(await newGovExecutor.owner()).to.be.equal(a.deployer);
    });

    it("only owner can set governance address", async () => {
      expect(await newGovExecutor.governance()).to.be.equal(ZERO_ADDRESS);

      await newGovExecutor.setGovernance(a.dummy1, { from: a.deployer });

      expect(await newGovExecutor.governance()).to.be.equal(a.dummy1);
    });

    it("non-owner cannot set governance address", async () => {
      expect(await newGovExecutor.governance()).to.be.equal(ZERO_ADDRESS);

      await expectRevert(
        newGovExecutor.setGovernance(a.dummy1, { from: a.other }),
        "caller is not the owner",
      );

      expect(await newGovExecutor.governance()).to.be.equal(ZERO_ADDRESS);
    });

    it("should fail when governance address is already set", async () => {
      expect(await newGovExecutor.governance()).to.be.equal(ZERO_ADDRESS);

      await newGovExecutor.setGovernance(a.dummy1, { from: a.deployer });

      expect(await newGovExecutor.governance()).to.be.equal(a.dummy1);

      await expectRevert(
        newGovExecutor.setGovernance(a.dummy2, { from: a.deployer }),
        "governance-already-set",
      );

      expect(await newGovExecutor.governance()).to.be.equal(a.dummy1);
    });
  });

  describe("GovernanceExecutor.doTransferAdmin()", async () => {
    let newGovExecutor: b.GovernanceExecutorInstance;
    let governance: string;

    beforeEach(async () => {
      governance = a.dummy1;

      newGovExecutor = await GovernanceExecutor.new(bProtocol.registry.address, TWO_DAYS);
      expect(await newGovExecutor.owner()).to.be.equal(a.deployer);

      await newGovExecutor.setGovernance(governance, { from: a.deployer });

      // Registry owner must be GovernanceExecutor
      await bProtocol.registry.transferOwnership(newGovExecutor.address, { from: a.deployer });

      expect(await bProtocol.registry.owner()).to.be.equal(newGovExecutor.address);
    });

    it("only governance can transfer admin", async () => {
      expect(await bProtocol.registry.owner()).to.be.equal(newGovExecutor.address);

      await newGovExecutor.doTransferAdmin(a.dummy2, { from: governance });

      expect(await bProtocol.registry.owner()).to.be.equal(a.dummy2);
    });

    it("non-governance cannot transfer admin", async () => {
      expect(await bProtocol.registry.owner()).to.be.equal(newGovExecutor.address);

      await expectRevert(
        newGovExecutor.doTransferAdmin(a.dummy2, { from: a.other }),
        "unauthorized",
      );

      expect(await bProtocol.registry.owner()).to.be.equal(newGovExecutor.address);
    });
  });

  describe("GovernanceExecutor.reqUpgradePool()", async () => {
    it("only owner can request for upgrade pool");

    it("non-owner cannot request for upgrade pool");
  });

  describe("GovernanceExecutor.dropUpgradePool()", async () => {
    it("only owner can drop pool upgrade request");

    it("non-owner cannot drop pool upgrade request");
  });

  describe("GovernanceExecutor.execUpgradePool()", async () => {
    it("should execute pool upgrade after delay");

    it("should fail when delay not over yet");

    it("should fail when request is invalid");
  });

  describe("GovernanceExecutor.reqUpgradeWhitelist()", async () => {
    it("only owner can request to whitelist a function");

    it("non-owner cannot request to whitelist a function");
  });

  describe("GovernanceExecutor.dropUpgradeWhitelist()", async () => {
    it("only owner can drop whitelist request");

    it("non-owner cannot drop a whitelist request");
  });

  describe("GovernanceExecutor.execUpgradeWhitelist()", async () => {
    it("should execute whitelist request");

    it("should fail when delay not over yet");

    it("should fail when request is invalid");
  });
});
