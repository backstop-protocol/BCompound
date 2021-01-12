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

contract("Registry", async (accounts) => {
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

  describe("Registry: constructor", async () => {
    it("should have addresses set", async () => {
      // Registry variables
      expect(await registry.comptroller()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.comp()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.cEther()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.pool()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.bComptroller()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.score()).to.be.not.equal(ZERO_ADDRESS);

      expect(await registry.comptroller()).to.be.equal(bProtocol.compound.comptroller.address);
      expect(await registry.comp()).to.be.equal(bProtocol.compound.comp.address);
      expect(await registry.cEther()).to.be.equal(
        bProtocol.compound.compoundUtil.getContracts("cETH"),
      );
      expect(await registry.pool()).to.be.equal(bProtocol.pool.address);
      expect(await registry.bComptroller()).to.be.equal(bProtocol.bComptroller.address);
      expect(await registry.score()).to.be.equal(bProtocol.score.address);

      //Ownable variables
      expect(await registry.owner()).to.be.equal(a.deployer);
    });
  });

  describe("Registry.setPool()", async () => {
    it("should have pool already set", async () => {
      const pool = await registry.pool();
      expect(pool).to.be.not.equal(ZERO_ADDRESS);
      expect(bProtocol.pool.address).to.be.equal(pool);
    });

    it("only owner can call newPool", async () => {
      const oldPool = await registry.pool();
      const newPool = a.dummy1;
      const tx = await registry.setPool(newPool, { from: a.deployer });
      expectEvent(tx, "NewPool", { oldPool: oldPool, newPool: newPool });

      const currPool = await registry.pool();
      expect(newPool).to.be.equal(currPool);
    });

    it("should fail when newPool address is zero", async () => {
      const oldPool = await registry.pool();
      const newPool = ZERO_ADDRESS;
      await expectRevert(
        registry.setPool(newPool, { from: a.deployer }),
        "Registry: pool-address-is-zero",
      );

      const currPool = await registry.pool();
      expect(oldPool).to.be.equal(currPool);
    });

    it("should fail when a non-owner try to set newPool", async () => {
      const oldPool = await registry.pool();
      const newPool = a.dummy1;
      await expectRevert(
        registry.setPool(newPool, { from: a.other }),
        "Ownable: caller is not the owner",
      );

      const currPool = await registry.pool();
      expect(oldPool).to.be.equal(currPool);
    });
  });

  describe("Registry.setScore()", async () => {
    it("should have score already set", async () => {
      const score = await registry.score();
      expect(score).to.be.not.equal(ZERO_ADDRESS);
      expect(bProtocol.score.address).to.be.equal(score);
    });

    it("only owner can call newScore", async () => {
      const oldScore = await registry.score();
      const newScore = a.dummy1;
      const tx = await registry.setScore(newScore, { from: a.deployer });
      expectEvent(tx, "NewScore", { oldScore: oldScore, newScore: newScore });

      const currScore = await registry.score();
      expect(newScore).to.be.equal(currScore);
    });

    it("should fail when newScore address is zero", async () => {
      const oldScore = await registry.score();
      const newScore = ZERO_ADDRESS;
      await expectRevert(
        registry.setScore(newScore, { from: a.deployer }),
        "Registry: score-address-is-zero",
      );

      const currScore = await registry.score();
      expect(oldScore).to.be.equal(currScore);
    });

    it("should fail when a non-owner try to set newScore", async () => {
      const oldScore = await registry.score();
      const newScore = a.dummy1;
      await expectRevert(
        registry.setScore(newScore, { from: a.other }),
        "Ownable: caller is not the owner",
      );

      const currScore = await registry.score();
      expect(oldScore).to.be.equal(currScore);
    });
  });

  describe("Registry.newAvatar()", async () => {
    it("should always have different avatar address based on msg.sender", async () => {
      const avatar1 = await registry.newAvatar.call({ from: a.user1 });
      const avatar2 = await registry.newAvatar.call({ from: a.user2 });
      const avatar3 = await registry.newAvatar.call({ from: a.user3 });

      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

      expect(avatar1).to.be.not.equal(avatar2);
      expect(avatar2).to.be.not.equal(avatar3);
      expect(avatar1).to.be.not.equal(avatar3);
    });

    it("should not change avatar address by deployment order", async () => {
      const avatar1 = await registry.newAvatar.call({ from: a.user1 });
      const avatar2 = await registry.newAvatar.call({ from: a.user2 });
      const avatar3 = await registry.newAvatar.call({ from: a.user3 });

      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

      await registry.newAvatar({ from: a.user3 });
      await registry.newAvatar({ from: a.user2 });
      await registry.newAvatar({ from: a.user1 });

      const avatar3_created = await registry.avatarOf(a.user3);
      const avatar2_created = await registry.avatarOf(a.user2);
      const avatar1_created = await registry.avatarOf(a.user1);

      expect(avatar1).to.be.equal(avatar1_created);
      expect(avatar2).to.be.equal(avatar2_created);
      expect(avatar3).to.be.equal(avatar3_created);
    });

    it("should create new avatar", async () => {
      let avatar1 = await registry.avatarOf(a.user1);
      expect(ZERO_ADDRESS).to.be.equal(avatar1);

      const tx = await registry.newAvatar({ from: a.user1 });
      avatar1 = await registry.avatarOf(a.user1);
      expectEvent(tx, "NewAvatar", { avatar: avatar1, owner: a.user1 });

      expect(a.user1).to.be.equal(await registry.ownerOf(avatar1));
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));
    });

    it("should delegate comp avatar to voter", async () => {
      let avatar1 = await registry.avatarOf(a.user1);
      expect(ZERO_ADDRESS).to.be.equal(avatar1);

      const tx = await registry.newAvatar({ from: a.user1 });
      avatar1 = await registry.avatarOf(a.user1);
      expectEvent(tx, "NewAvatar", { avatar: avatar1, owner: a.user1 });

      expect(a.user1).to.be.equal(await registry.ownerOf(avatar1));
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));

      const compToken = bProtocol.compound.comp;
      const delegatee = engine.getCompVoterAddress();
      expect(await compToken.delegates(avatar1)).to.be.equal(delegatee);
    });

    it("should fail when avatar already exists", async () => {
      await registry.newAvatar({ from: a.user1 });

      await expectRevert(registry.newAvatar({ from: a.user1 }), "Registry: avatar-exits-for-owner");

      const avatar = await registry.avatarOf(a.user1);
      expect(a.user1).to.be.equal(await registry.ownerOf(avatar));
      expect(avatar).to.be.equal(await registry.avatarOf(a.user1));
    });

    it("should create different avatar for each users", async () => {
      await registry.newAvatar({ from: a.user1 });

      const avatar1 = await registry.avatarOf(a.user1);
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(a.user1).to.be.equal(await registry.ownerOf(avatar1));
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));

      const tx = await registry.newAvatar({ from: a.user2 });
      const avatar2 = await registry.avatarOf(a.user2);
      expectEvent(tx, "NewAvatar", { avatar: avatar2, owner: a.user2 });
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(a.user2).to.be.equal(await registry.ownerOf(avatar2));
      expect(avatar2).to.be.equal(await registry.avatarOf(a.user2));

      expect(avatar1).to.be.not.equal(avatar2);
    });
  });

  describe("Registry.getAvatar(address)", async () => {
    it("should always have different avatar address for the given owner", async () => {
      const avatar1 = await registry.getAvatar.call(a.user1);
      const avatar2 = await registry.getAvatar.call(a.user2);
      const avatar3 = await registry.getAvatar.call(a.user3);

      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

      expect(avatar1).to.be.not.equal(avatar2);
      expect(avatar2).to.be.not.equal(avatar3);
      expect(avatar1).to.be.not.equal(avatar3);
    });

    it("should not change avatar address by deployment order", async () => {
      const avatar1 = await registry.getAvatar.call(a.user1);
      const avatar2 = await registry.getAvatar.call(a.user2);
      const avatar3 = await registry.getAvatar.call(a.user3);

      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar3).to.be.not.equal(ZERO_ADDRESS);

      await registry.getAvatar(a.user3);
      await registry.getAvatar(a.user2);
      await registry.getAvatar(a.user1);

      const avatar3_created = await registry.avatarOf(a.user3);
      const avatar2_created = await registry.avatarOf(a.user2);
      const avatar1_created = await registry.avatarOf(a.user1);

      expect(avatar1).to.be.equal(avatar1_created);
      expect(avatar2).to.be.equal(avatar2_created);
      expect(avatar3).to.be.equal(avatar3_created);
    });

    it("should create new if not exists for a user", async () => {
      let avatar3 = await registry.avatarOf(a.user3);
      expect(ZERO_ADDRESS).to.be.equal(avatar3);

      avatar3 = await registry.getAvatar.call(a.user3, { from: a.user3 });
      const tx = await registry.getAvatar(a.user3, { from: a.user3 });
      expectEvent(tx, "NewAvatar", { avatar: avatar3, owner: a.user3 });
      expect(avatar3).to.be.not.equal(ZERO_ADDRESS);
    });

    it("should allow anyone to create avatar for others", async () => {
      let avatar4 = await registry.avatarOf(a.user4);
      expect(ZERO_ADDRESS).to.be.equal(avatar4);

      avatar4 = await registry.getAvatar.call(a.user4, { from: a.other });
      const tx = await registry.getAvatar(a.user4, { from: a.other });
      expectEvent(tx, "NewAvatar", { avatar: avatar4, owner: a.user4 });
      expect(avatar4).to.be.not.equal(ZERO_ADDRESS);
    });

    it("should return avatar if exists for a user", async () => {
      await registry.newAvatar({ from: a.user1 });
      await registry.newAvatar({ from: a.user2 });

      const avatar1 = await registry.getAvatar.call(a.user1);
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));

      const avatar2 = await registry.getAvatar.call(a.user2);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar2).to.be.equal(await registry.avatarOf(a.user2));
    });

    it("should allow anyone to get avatar of others", async () => {
      await registry.newAvatar({ from: a.user1 });

      const avatar1 = await registry.getAvatar.call(a.user1, { from: a.other });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));
    });

    it("should fail when zero address is passed", async () => {
      let avatar = await registry.avatarOf(ZERO_ADDRESS);
      expect(avatar).to.be.equal(ZERO_ADDRESS);

      await expectRevert(
        registry.getAvatar(ZERO_ADDRESS, { from: a.other }),
        "Registry: owner-address-is-zero",
      );

      avatar = await registry.avatarOf(ZERO_ADDRESS);
      expect(avatar).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe("Registry.delegateAvatar()", async () => {
    it("should allow a delegator to delegate avatar to a delegatee", async () => {
      await registry.newAvatar({ from: a.user1 });

      const delegator = a.user1;
      const delegatee = a.dummy1;
      const avatar = await registry.avatarOf(delegator);
      let isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(false);

      const tx = await registry.delegateAvatar(delegatee, { from: delegator });
      expectEvent(tx, "Delegate", { delegator: delegator, avatar: avatar, delegatee: delegatee });

      isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(true);
    });

    it("should fail when avatar does not exist for the delegator", async () => {
      const delegator = a.user5;
      const delegatee = a.dummy1;
      const avatar = await registry.avatarOf(delegator);
      expect(avatar).to.be.equal(ZERO_ADDRESS);

      let isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(false);

      await expectRevert(
        registry.delegateAvatar(delegatee, { from: delegator }),
        "Registry: avatar-not-found",
      );

      isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(false);
    });

    it("should fail when delegatee address is zero", async () => {
      const delegator = a.user1;
      const delegatee = ZERO_ADDRESS;
      const avatar = await registry.avatarOf(delegator);
      let isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(false);

      await expectRevert(
        registry.delegateAvatar(delegatee, { from: delegator }),
        "Registry: delegatee-address-is-zero",
      );

      isDelegated = await registry.delegate(avatar, delegatee);
      expect(isDelegated).to.be.equal(false);
    });

    it("should allow delegator to delegate to multiple delegatees", async () => {
      await registry.newAvatar({ from: a.user1 });

      const delegator = a.user1;
      const delegatee1 = a.dummy1;
      const delegatee2 = a.dummy2;
      const delegatee3 = a.dummy3;

      const avatar = await registry.avatarOf(delegator);
      expect(await registry.delegate(avatar, delegatee1)).to.be.equal(false);
      expect(await registry.delegate(avatar, delegatee2)).to.be.equal(false);
      expect(await registry.delegate(avatar, delegatee3)).to.be.equal(false);

      let tx = await registry.delegateAvatar(delegatee1, { from: delegator });
      expectEvent(tx, "Delegate", { delegator: delegator, avatar: avatar, delegatee: delegatee1 });
      expect(await registry.delegate(avatar, delegatee1)).to.be.equal(true);

      tx = await registry.delegateAvatar(delegatee2, { from: delegator });
      expectEvent(tx, "Delegate", { delegator: delegator, avatar: avatar, delegatee: delegatee2 });
      expect(await registry.delegate(avatar, delegatee2)).to.be.equal(true);

      tx = await registry.delegateAvatar(delegatee3, { from: delegator });
      expectEvent(tx, "Delegate", { delegator: delegator, avatar: avatar, delegatee: delegatee3 });
      expect(await registry.delegate(avatar, delegatee3)).to.be.equal(true);

      expect(await registry.delegate(avatar, delegatee1)).to.be.equal(true);
      expect(await registry.delegate(avatar, delegatee2)).to.be.equal(true);
      expect(await registry.delegate(avatar, delegatee3)).to.be.equal(true);
    });

    it("should allow a denegatee to receive multiple avatar delegation rights", async () => {
      await registry.newAvatar({ from: a.user1 });
      await registry.newAvatar({ from: a.user2 });
      await registry.newAvatar({ from: a.user3 });

      const delegatee = a.dummy4;
      const delegator1 = a.user1;
      const delegator2 = a.user2;
      const delegator3 = a.user3;

      const avatar1 = await registry.avatarOf(delegator1);
      const avatar2 = await registry.avatarOf(delegator2);
      const avatar3 = await registry.avatarOf(delegator3);

      expect(await registry.delegate(avatar1, delegatee)).to.be.equal(false);
      expect(await registry.delegate(avatar2, delegatee)).to.be.equal(false);
      expect(await registry.delegate(avatar3, delegatee)).to.be.equal(false);

      let tx = await registry.delegateAvatar(delegatee, { from: delegator1 });
      expectEvent(tx, "Delegate", { delegator: delegator1, avatar: avatar1, delegatee: delegatee });
      expect(await registry.delegate(avatar1, delegatee)).to.be.equal(true);

      tx = await registry.delegateAvatar(delegatee, { from: delegator2 });
      expectEvent(tx, "Delegate", { delegator: delegator2, avatar: avatar2, delegatee: delegatee });
      expect(await registry.delegate(avatar2, delegatee)).to.be.equal(true);

      tx = await registry.delegateAvatar(delegatee, { from: delegator3 });
      expectEvent(tx, "Delegate", { delegator: delegator3, avatar: avatar3, delegatee: delegatee });
      expect(await registry.delegate(avatar3, delegatee)).to.be.equal(true);

      expect(await registry.delegate(avatar1, delegatee)).to.be.equal(true);
      expect(await registry.delegate(avatar2, delegatee)).to.be.equal(true);
      expect(await registry.delegate(avatar3, delegatee)).to.be.equal(true);
    });
  });

  describe("Registry.revokeDelegateAvatar()", async () => {
    it("should allow a delegator to revoke delegation rights from a delegatee", async () => {
      const delegator = a.user1;
      const delegatee = a.dummy1;

      await registry.newAvatar({ from: a.user1 });
      await registry.delegateAvatar(delegatee, { from: delegator });
      const avatar = await registry.avatarOf(delegator);

      expect(await registry.delegate(avatar, delegatee)).to.be.equal(true);

      const tx = await registry.revokeDelegateAvatar(delegatee, { from: delegator });
      expectEvent(tx, "RevokeDelegate", {
        delegator: delegator,
        avatar: avatar,
        delegatee: delegatee,
      });

      expect(await registry.delegate(avatar, delegatee)).to.be.equal(false);
    });

    it("should fail when avatar does not exists for the delegator", async () => {
      const delegator = a.user5;
      const delegatee = a.dummy1;
      const avatar = await registry.avatarOf(delegator);

      expect(avatar).to.be.equal(ZERO_ADDRESS);

      await expectRevert(
        registry.revokeDelegateAvatar(delegatee, { from: delegator }),
        "Registry: avatar-not-found",
      );

      expect(await registry.delegate(avatar, delegatee)).to.be.equal(false);
    });

    it("should fail when delegator not delegated rights to a delegatee", async () => {
      await registry.newAvatar({ from: a.user1 });

      const delegator = a.user1;
      const delegatee = a.other;
      const avatar = await registry.avatarOf(delegator);

      expect(await registry.delegate(avatar, delegatee)).to.be.equal(false);

      await expectRevert(
        registry.revokeDelegateAvatar(delegatee, { from: delegator }),
        "Registry: not-delegated",
      );

      expect(await registry.delegate(avatar, delegatee)).to.be.equal(false);
    });
  });

  describe("Registry.doesAvatarExist()", async () => {
    it("should return true when an avatar exists", async () => {
      await registry.newAvatar({ from: a.user1 });

      const avatar1 = await registry.avatarOf(a.user1);
      const doesExist = await registry.doesAvatarExist(avatar1);
      expect(doesExist).to.be.equal(true);
    });

    it("should return false when an avatar does not exists", async () => {
      const avatar = await registry.avatarOf(a.dummy1);
      const doesAvExist = await registry.doesAvatarExist(avatar);
      expect(doesAvExist).to.be.equal(false);
    });
  });

  describe("Registry.doesAvatarExistFor()", async () => {
    it("should return true when an avatar exists for a given owner", async () => {
      await registry.newAvatar({ from: a.user1 });

      const doesAvExist = await registry.doesAvatarExistFor(a.user1);
      expect(doesAvExist).to.be.equal(true);
    });

    it("should return false when an avatar does not exists for a given owner", async () => {
      const doesAvExist = await registry.doesAvatarExistFor(a.dummy1);
      expect(doesAvExist).to.be.equal(false);
    });
  });

  describe("Registry.avatarLength()", async () => {
    it("should have avatar size zero after deployment", async () => {
      expect(await registry.avatarLength()).to.be.bignumber.equal(ZERO);
    });

    it("should increase avatar count when new avatar created", async () => {
      expect(await registry.avatarLength()).to.be.bignumber.equal(ZERO);

      await registry.newAvatar({ from: a.user1 });

      expect(await registry.avatarLength()).to.be.bignumber.equal(new BN(1));

      await registry.newAvatar({ from: a.user2 });

      expect(await registry.avatarLength()).to.be.bignumber.equal(new BN(2));
    });

    it("should not increase avatar count when avatar already exists", async () => {
      expect(await registry.avatarLength()).to.be.bignumber.equal(ZERO);

      await registry.newAvatar({ from: a.user1 });

      expect(await registry.avatarLength()).to.be.bignumber.equal(new BN(1));

      await registry.getAvatar(a.user1, { from: a.user1 });

      expect(await registry.avatarLength()).to.be.bignumber.equal(new BN(1));
    });
  });

  describe("Registry.avatars(index)", async () => {
    it("should fail when no avatar present", async () => {
      await expectRevert.unspecified(registry.avatars(0));
    });

    it("should get avatar address with index", async () => {
      await registry.newAvatar({ from: a.user1 });
      const avatar1 = await registry.avatarOf(a.user1);

      expect(await registry.avatars(0)).to.be.equal(avatar1);

      await registry.newAvatar({ from: a.user2 });
      const avatar2 = await registry.avatarOf(a.user2);
      expect(await registry.avatars(1)).to.be.equal(avatar2);
    });

    it("should fail when avatar not present for given index", async () => {
      await registry.newAvatar({ from: a.user1 });
      await registry.newAvatar({ from: a.user2 });

      await expectRevert.unspecified(registry.avatars(2));
    });
  });

  describe("Registry.avatarList()", async () => {
    it("should get empty avatar list after deployment", async () => {
      const avatarList = await registry.avatarList();
      expect(avatarList).to.eql([]);
    });

    it("should get avatar list", async () => {
      await registry.newAvatar({ from: a.user1 });
      await registry.newAvatar({ from: a.user2 });

      const avatar1 = await registry.avatarOf(a.user1);
      const avatar2 = await registry.avatarOf(a.user2);

      const avatarList = await registry.avatarList();
      expect(avatarList).to.eql([avatar1, avatar2]);
    });
  });
});
