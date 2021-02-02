import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { BAccounts } from "../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
import BN from "bn.js";

const chai = require("chai");
const expect = chai.expect;
let snapshotId: string;
const ZERO = new BN(0);

const Avatar: b.AvatarContract = artifacts.require("Avatar");
const EmergencyMock: b.EmergencyMockContract = artifacts.require("EmergencyMock");

contract("Avatar", async (accounts) => {
  let bProtocol: BProtocol;
  let registry: b.RegistryInstance;
  const a: BAccounts = new BAccounts(accounts);

  const engine = new BProtocolEngine(accounts);
  before(async () => {
    // Deploy Compound
    await engine.deployCompound();

    // Deploy BProtocol contracts
    bProtocol = await engine.deployBProtocol();
    registry = bProtocol.registry;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("Avatar.initialize()", async () => {
    it("should fail when explicitly called initialize on an avatar", async () => {
      await registry.newAvatar({ from: a.user1 });
      const avatar1_addr = await registry.avatarOf(a.user1);
      expect(avatar1_addr).to.be.not.equal(ZERO_ADDRESS);

      const avatar1 = await Avatar.at(avatar1_addr);
      expect(await avatar1.registry()).to.be.equal(registry.address);

      await expectRevert(
        avatar1.initialize(a.dummy1, bProtocol.compound.comp.address, engine.getCompVoterAddress()),
        "avatar-already-init",
      );

      expect(await avatar1.registry()).to.be.equal(registry.address);
    });
  });

  describe("Avatar.emergencyCall", async () => {
    let mockEmergency1: b.EmergencyMockInstance;
    let mockEmergency2: b.EmergencyMockInstance;
    let avatarInstance: b.AvatarInstance;

    before(async () => {
      // Deploy Compound
      await engine.deployCompound();

      // Deploy BProtocol contracts
      bProtocol = await engine.deployBProtocol();
      registry = bProtocol.registry;
      mockEmergency1 = await EmergencyMock.new();
      mockEmergency2 = await EmergencyMock.new();

      const avatar1 = await registry.newAvatar.call({ from: a.user1 });
      await registry.newAvatar({ from: a.user1 });
      const avatar1_created = await registry.avatarOf(a.user1);
      expect(avatar1).to.be.equal(avatar1_created);
      avatarInstance = await Avatar.at(avatar1_created);
    });
    it("whitelist emergency1 and set x", async () => {
      const setXCallData = await mockEmergency1.setX.call(777);
      const sig = setXCallData.substring(0, 10); // 2 chars per byte + "0x"
      await registry.setWhitelistAvatarCall(mockEmergency1.address, sig, true, {
        from: a.deployer,
      });
      await avatarInstance.emergencyCall(mockEmergency1.address, setXCallData, { from: a.user1 });
      expect(await mockEmergency1.x()).to.be.bignumber.equal(new BN(777));

      await expectRevert(
        avatarInstance.emergencyCall(mockEmergency2.address, setXCallData, { from: a.user1 }),
        "emergencyCall: not-listed",
      );

      // delist
      await registry.setWhitelistAvatarCall(mockEmergency1.address, sig, false, {
        from: a.deployer,
      });
      await expectRevert(
        avatarInstance.emergencyCall(mockEmergency1.address, setXCallData, { from: a.user1 }),
        "emergencyCall: not-listed",
      );
    });

    it("whitelist emergency1 and set y", async () => {
      const setYCallData = await mockEmergency1.setY.call(555, { value: "1" });
      const sig = setYCallData.substring(0, 10); // 2 chars per byte + "0x"

      // before list
      await registry.setWhitelistAvatarCall(mockEmergency1.address, sig, false, {
        from: a.deployer,
      });
      await expectRevert(
        avatarInstance.emergencyCall(mockEmergency1.address, setYCallData, {
          from: a.user1,
          value: "1",
        }),
        "emergencyCall: not-listed",
      );

      await registry.setWhitelistAvatarCall(mockEmergency1.address, sig, true, {
        from: a.deployer,
      });
      await avatarInstance.emergencyCall(mockEmergency1.address, setYCallData, {
        from: a.user1,
        value: "1",
      });
      expect(await mockEmergency1.y()).to.be.bignumber.equal(new BN(555));

      await expectRevert(
        avatarInstance.emergencyCall(mockEmergency2.address, setYCallData, {
          from: a.user1,
          value: "1",
        }),
        "emergencyCall: not-listed",
      );
    });

    it("quit and set x", async () => {
      const setXCallData = await mockEmergency1.setX.call(777);
      const sig = setXCallData.substring(0, 10); // 2 chars per byte + "0x"

      await avatarInstance.quitB({ from: a.user1 });

      await avatarInstance.emergencyCall(mockEmergency1.address, setXCallData, { from: a.user1 });
      expect(await mockEmergency1.x()).to.be.bignumber.equal(new BN(777));
    });

    describe("Avatar.quitB()", async () => {
      it("");
    });
  });
});
