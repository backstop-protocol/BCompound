import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { BAccounts } from "../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
import BN from "bn.js";

const Avatar: b.AvatarContract = artifacts.require("Avatar");
const chai = require("chai");
const expect = chai.expect;
let snapshotId: string;
const ZERO = new BN(0);

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

  describe("Avatar", async () => {
    describe("Avatar.initialize()", async () => {
      it("should fail when explicitly called initialize on an avatar", async () => {
        await registry.newAvatar({ from: a.user1 });
        const avatar1_addr = await registry.avatarOf(a.user1);
        expect(avatar1_addr).to.be.not.equal(ZERO_ADDRESS);

        const avatar1 = await Avatar.at(avatar1_addr);
        expect(await avatar1.registry()).to.be.equal(registry.address);

        await expectRevert(
          avatar1.initialize(
            a.dummy1,
            bProtocol.compound.comp.address,
            engine.getCompVoterAddress(),
          ),
          "Contract instance has already been initialized",
        );

        expect(await avatar1.registry()).to.be.equal(registry.address);
      });
    });

    describe("Avatar.transferCOMP()", async () => {
      it("");
    });

    describe("Avatar.transferETH()", async () => {
      it("");
    });

    describe("Avatar.transferERC20()", async () => {
      it("");
    });

    describe("Avatar.quitB()", async () => {
      it("");
    });
  });
});
