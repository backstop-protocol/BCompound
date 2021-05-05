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
import { expandEvent } from "compound-protocol/scenario/src/Macro";

const GovernanceExecutor: b.GovernanceExecutorContract = artifacts.require("GovernanceExecutor");
const EmergencyMock: b.EmergencyMockContract = artifacts.require("EmergencyMock");
const Avatar: b.AvatarContract = artifacts.require("Avatar");

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
  let governanceExecutor: b.GovernanceExecutorInstance;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
    priceOracle = bProtocol.compound.priceOracle;
    registry = bProtocol.registry;
    governanceExecutor = bProtocol.governanceExecutor;
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
      newGovExecutor = await GovernanceExecutor.new(bProtocol.registry.address);
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

      newGovExecutor = await GovernanceExecutor.new(bProtocol.registry.address);
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

  describe("GovernanceExecutor.execUpgradePool()", async () => {
    beforeEach(async () => {
      // Registry owner must be GovernanceExecutor
      await bProtocol.registry.transferOwnership(governanceExecutor.address, { from: a.deployer });
    });

    it("should execute pool upgrade", async () => {
      expect(await registry.pool()).to.be.equal(pool.address);

      await governanceExecutor.setPool(a.dummy1, {from: a.deployer})
      expect(await registry.pool()).to.be.equal(a.dummy1);
    });
  });

  describe("GovernanceExecutor.execUpgradeScore()", async () => {
    beforeEach(async () => {
      // Registry owner must be GovernanceExecutor
      await bProtocol.registry.transferOwnership(governanceExecutor.address, { from: a.deployer });
    });

    it("should execute score upgrade", async () => {
      await governanceExecutor.setScore(a.dummy1, {from: a.deployer})
      expect(await registry.score()).to.be.equal(a.dummy1);
    });
  });  

  describe("GovernanceExecutor.execUpgradeWhitelist()", async () => {
    let mock: b.EmergencyMockInstance;
    let data: string;
    let fnSig: string;
    let avatar1: b.AvatarInstance;

    beforeEach(async () => {
      await registry.newAvatar({ from: a.user1 });
      avatar1 = await Avatar.at(await registry.avatarOf(a.user1));
      mock = await EmergencyMock.new();

      data = await mock.setX.call(777);
      fnSig = data.substring(0, 10);

      // Registry owner must be GovernanceExecutor
      await bProtocol.registry.transferOwnership(governanceExecutor.address, { from: a.deployer });
    });

    it("should execute whitelist request", async () => {
      await expectRevert(
        avatar1.emergencyCall(mock.address, data, { from: a.user1 }),
        "not-listed",
      );

      const tx = await governanceExecutor.setWhitelistCall(mock.address, fnSig, true, {from: a.deployer});
      expectEvent(tx, "WhitelistCallUpdated", {
        target: mock.address,
        functionSig: fnSig,
        list: true,
      });

      expect(await mock.x()).to.be.bignumber.equal(new BN(5));
      await avatar1.emergencyCall(mock.address, data, { from: a.user1 });
      expect(await mock.x()).to.be.bignumber.equal(new BN(777));
    });
  });
});
