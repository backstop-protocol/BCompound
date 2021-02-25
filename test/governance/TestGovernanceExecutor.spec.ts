import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");
import BN from "bn.js";
import { CompoundUtils } from "@utils/CompoundUtils";
import { toWei } from "web3-utils";

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

contract("GovernanceExecutor", async (accounts) => {
  let snapshotId: string;

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
    it("");
  });

  describe("GovernanceExecutor.doTransferAdmin()", async () => {
    it("");
  });

  describe("GovernanceExecutor.reqUpgradePool()", async () => {
    it("");
  });

  describe("GovernanceExecutor.dropUpgradePool()", async () => {
    it("");
  });

  describe("GovernanceExecutor.execUpgradePool()", async () => {
    it("");
  });

  describe("GovernanceExecutor.reqUpgradeWhitelist()", async () => {
    it("");
  });

  describe("GovernanceExecutor.dropUpgradeWhitelist()", async () => {
    it("");
  });

  describe("GovernanceExecutor.execUpgradeWhitelist()", async () => {
    it("");
  });
});
