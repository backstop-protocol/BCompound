import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { BAccounts } from "../test-utils/BAccounts";
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const chai = require("chai");
const expect = chai.expect;

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

  describe("Registry: constructor", async () => {
    it("should have addresses set", async () => {
      // Registry variables
      expect(await registry.comptroller()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.comp()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.cEther()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.pool()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.bComptroller()).to.be.not.equal(ZERO_ADDRESS);
      expect(await registry.score()).to.be.not.equal(ZERO_ADDRESS);

      //Ownable variables
      expect(await registry.owner()).to.be.equal(a.deployer);
    });
  });

  describe("setPool()", async () => {
    it("should have pool already set", async () => {
      const pool = await registry.pool();
      expect(pool).to.be.not.equal(ZERO_ADDRESS);
      expect(bProtocol.pool.address).to.be.equal(pool);
    });

    it("should allow only owner to set newPool", async () => {
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
      const newPool = ZERO_ADDRESS;
      await expectRevert(
        registry.setPool(newPool, { from: a.other }),
        "Ownable: caller is not the owner",
      );

      const currPool = await registry.pool();
      expect(oldPool).to.be.equal(currPool);
    });
  });

  describe("setScore()", async () => {
    it("should have score already set", async () => {
      const score = await registry.score();
      expect(score).to.be.not.equal(ZERO_ADDRESS);
      expect(bProtocol.score.address).to.be.equal(score);
    });

    it("should allow only owner to set newScore", async () => {
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
      const newScore = ZERO_ADDRESS;
      await expectRevert(
        registry.setScore(newScore, { from: a.other }),
        "Ownable: caller is not the owner",
      );

      const currScore = await registry.score();
      expect(oldScore).to.be.equal(currScore);
    });
  });

  describe("newAvatar()", async () => {
    it("should create new avatar", async () => {
      let avatar1 = await registry.avatarOf(a.user1);
      expect(ZERO_ADDRESS).to.be.equal(avatar1);

      const tx = await registry.newAvatar({ from: a.user1 });
      avatar1 = await registry.avatarOf(a.user1);
      expectEvent(tx, "NewAvatar", { avatar: avatar1, owner: a.user1 });

      expect(a.user1).to.be.equal(await registry.ownerOf(avatar1));
      expect(avatar1).to.be.equal(await registry.avatarOf(a.user1));
    });

    it("should fail when avatar already exists", async () => {
      await expectRevert(registry.newAvatar({ from: a.user1 }), "Registry: avatar-exits-for-owner");

      const avatar = await registry.avatarOf(a.user1);
      expect(a.user1).to.be.equal(await registry.ownerOf(avatar));
      expect(avatar).to.be.equal(await registry.avatarOf(a.user1));
    });

    it("should create different avatar for each users", async () => {
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

  describe("getAvatar()", async () => {
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
      const avatar1 = await registry.getAvatar(a.user1);
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

      const avatar2 = await registry.getAvatar(a.user2);
      expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
    });

    it("should allow anyone to get avatar of others", async () => {
      const avatar1 = await registry.getAvatar(a.user1, { from: a.other });
      expect(avatar1).to.be.not.equal(ZERO_ADDRESS);
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

  describe("delegateAvatar()", async () => {
    it("should allow a delegator to delegate avatar to a delegatee");

    it("should fail when avatar does not exist for the delegator");

    it("should allow delegator to delegate to multiple delegatees");
  });

  describe("revokeDelegateAvatar()", async () => {
    it("should allow a delegator to revoke delegation rights from a delegatee");

    it("should fail when avatar does not exists for the delegator");

    it("should fail when delegator not delegated rights to a delegatee");
  });

  describe("doesAvatarExist()", async () => {
    it("should return true when an avatar exists", async () => {
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

  describe("doesAvatarExistFor()", async () => {
    it("should return true when an avatar exists for a given owner", async () => {
      const doesAvExist = await registry.doesAvatarExistFor(a.user1);
      expect(doesAvExist).to.be.equal(true);
    });

    it("should return false when an avatar does not exists for a given owner", async () => {
      const doesAvExist = await registry.doesAvatarExistFor(a.dummy1);
      expect(doesAvExist).to.be.equal(false);
    });
  });
});
