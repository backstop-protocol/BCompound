import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const chai = require("chai");
const expect = chai.expect;
const ONE_ETH = new BN(10).pow(new BN(18));
const HALF_ETH = ONE_ETH.div(new BN(2));
const TEN_ETH = new BN(10).mul(ONE_ETH);
const ZERO = new BN(0);

contract("BErc20", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("BErc20", async () => {
    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);

    // ZRX
    let ZRX_addr: string;
    let ZRX: b.Erc20DetailedInstance;

    let bZRX_addr: string;
    let bZRX: b.BErc20Instance;

    let cZRX_addr: string;
    let cZRX: b.CErc20Instance;

    // BAT
    let BAT_addr: string;
    let BAT: b.Erc20DetailedInstance;

    let bBAT_addr: string;
    let bBAT: b.BErc20Instance;

    let cBAT_addr: string;
    let cBAT: b.CErc20Instance;

    // ETH
    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    let cETH_addr: string;
    let cETH: b.CErc20Instance;

    beforeEach(async () => {
      // ZRX
      bZRX = await engine.deployNewBErc20("cZRX");
      bZRX_addr = bZRX.address;

      ZRX_addr = compoundUtil.getTokens("ZRX");
      ZRX = await Erc20Detailed.at(ZRX_addr);

      cZRX_addr = compoundUtil.getContracts("cZRX");
      cZRX = await CErc20.at(cZRX_addr);

      // BAT
      bBAT = await engine.deployNewBErc20("cBAT");
      bBAT_addr = bBAT.address;

      BAT_addr = compoundUtil.getTokens("BAT");
      BAT = await Erc20Detailed.at(BAT_addr);

      cBAT_addr = compoundUtil.getContracts("cBAT");
      cBAT = await CErc20.at(cBAT_addr);

      // ETH:: deploy BEther
      bETH = await engine.deployNewBEther();
      bETH_addr = bETH.address;

      cETH_addr = compoundUtil.getContracts("cETH");
      cETH = await CErc20.at(cETH_addr);

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);
      expect((await BAT.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);
    });

    describe("BErc20.transferFrom()", async () => {
      let owner = a.user1;
      let spender = a.user2;

      let ownerAvatar: string;
      let spenderAvatar: string;

      let owner_expected_cZRX_Bal: BN;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: owner });
        ownerAvatar = await bProtocol.registry.avatarOf(owner);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        owner_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: owner });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: owner });
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);

        await bZRX.approve(spender, TEN_cZRX, { from: owner });
        expect(await bZRX.allowance(owner, spender)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("spender should transfer tokens from owner to user3", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.transferFrom.call(owner, a.user3, ONE_cZRX, { from: spender });
        expect(result).to.be.equal(true);
        await bZRX.transferFrom(owner, a.user3, ONE_cZRX, { from: spender });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("spender should transfer tokens from owner to himself", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.transferFrom.call(owner, spender, ONE_cZRX, { from: spender });
        expect(result).to.be.equal(true);
        await bZRX.transferFrom(owner, spender, ONE_cZRX, { from: spender });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("should fail when spender try to transfer tokens from owner to user3's avatar", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferFrom(owner, avatar3, ONE_cZRX, { from: spender }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when spender try to transfer tokens from owner to spender's avatar", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferFrom(owner, spenderAvatar, ONE_cZRX, { from: spender }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("should fail transfer tokens from owner to owner", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        // failed at Compound, as it doesn't allow sending tokens to self
        await expectRevert(
          bZRX.transferFrom(owner, owner, ONE_cZRX, { from: spender }),
          "AbsCToken: transferFrom-failed",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.transferFromOnAvatar()", async () => {
      let owner = a.user1;
      let spender = a.user2;
      let spenderDelegatee = a.user4;

      let ownerAvatar: string;
      let spenderAvatar: string;

      let owner_expected_cZRX_Bal: BN;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: owner });
        ownerAvatar = await bProtocol.registry.avatarOf(owner);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        owner_expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: owner });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: owner });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        await bZRX.approve(spender, TEN_cZRX, { from: owner });
        expect(await bZRX.allowance(owner, spender)).to.be.bignumber.equal(TEN_cZRX);

        // spender delegate to spenderDelegatee
        await bProtocol.registry.delegateAvatar(spenderDelegatee, { from: spender });
        expect(await bProtocol.registry.delegate(spenderAvatar, spenderDelegatee)).to.be.equal(
          true,
        );
      });

      it("spenderDelegatee should transfer tokens from owner to user3 on behalf of spender", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          a.user3,
          ONE_cZRX,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);
        await bZRX.transferFromOnAvatar(spenderAvatar, owner, a.user3, ONE_cZRX, {
          from: spenderDelegatee,
        });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("spenderDelegatee should transfer tokens from owner to spender on behalf of spender", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          spender,
          ONE_cZRX,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);

        await bZRX.transferFromOnAvatar(spenderAvatar, owner, spender, ONE_cZRX, {
          from: spenderDelegatee,
        });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("spenderDelegatee should transfer tokens from owner to himself on behalf of spender", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spenderDelegatee)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          spenderDelegatee,
          ONE_cZRX,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);

        await bZRX.transferFromOnAvatar(spenderAvatar, owner, spenderDelegatee, ONE_cZRX, {
          from: spenderDelegatee,
        });

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cZRX_Bal.sub(ONE_cZRX),
        );
        expect(await bZRX.balanceOf(spenderDelegatee)).to.be.bignumber.equal(ONE_cZRX);
      });

      it("spenderDelegatee tx should fail when he try to transfer tokens from owner to user3's avatar on behalf of spender", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferFromOnAvatar(spenderAvatar, owner, avatar3, ONE_cZRX, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bZRX.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
      });

      it("spenderDelegatee tx should fail when he try to transfer tokens from owner to spender's avatar on behalf of spender", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferFromOnAvatar(spenderAvatar, owner, spenderAvatar, ONE_cZRX, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("spenderDelegatee tx should fail when he try to transfer tokens from owner to spenderDelegatee's avatar on behalf of spender", async () => {
        await bProtocol.registry.newAvatar({ from: spenderDelegatee });
        const spenderDelegateeAvatar = await bProtocol.registry.avatarOf(spenderDelegatee);
        expect(spenderDelegateeAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.transferFromOnAvatar(spenderAvatar, owner, spenderDelegateeAvatar, ONE_cZRX, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("senderDelegatee tx should fail when he try to transfer tokens from owner to owner on behalf of spender", async () => {
        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        // failed at Compound, as it doesn't allow sending tokens to self
        await expectRevert(
          bZRX.transferFromOnAvatar(spenderAvatar, owner, owner, ONE_cZRX, {
            from: spenderDelegatee,
          }),
          "AbsCToken: transferFrom-failed",
        );

        expect(await bZRX.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cZRX_Bal);
        expect(await bZRX.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.approve()", async () => {
      let owner = a.user1;
      let spender = a.user2;

      let ownerAvatar: string;
      let spenderAvatar: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: a.user1 });
        ownerAvatar = await bProtocol.registry.avatarOf(a.user1);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: a.user2 });
        spenderAvatar = await bProtocol.registry.avatarOf(a.user2);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);
      });

      it("user should approve another user (have an avatar)", async () => {
        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.approve.call(spender, TEN_cZRX, { from: owner });
        expect(result).to.be.equal(true);
        await bZRX.approve(spender, TEN_cZRX, { from: owner });

        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("user should approve another user (does not have an avatar)", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bZRX.approve.call(a.other, TEN_cZRX, { from: owner });
        expect(result).to.be.equal(true);
        await bZRX.approve(a.other, TEN_cZRX, { from: owner });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cZRX.allowance(ownerAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("should fail when user try to give approval to an avatar", async () => {
        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.approve(spenderAvatar, TEN_cZRX, { from: owner }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cZRX.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.approveOnAvatar()", async () => {
      let delegator = a.user1;
      let delegatee = a.user2;
      let spender = a.user3;

      let delegatorAvatar: string;
      let delegateeAvatar: string;
      let spenderAvatar: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: delegator });
        delegatorAvatar = await bProtocol.registry.avatarOf(delegator);
        expect(delegatorAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: delegatee });
        delegateeAvatar = await bProtocol.registry.avatarOf(delegatee);
        expect(delegateeAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });
        expect(await bProtocol.registry.delegate(delegatorAvatar, delegatee)).to.be.equal(true);
      });

      it("delegatee should approve another user (have an avatar) on behalf of delegator", async () => {
        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        const result = await bZRX.approveOnAvatar.call(delegatorAvatar, spender, TEN_cZRX, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bZRX.approveOnAvatar(delegatorAvatar, spender, TEN_cZRX, { from: delegatee });

        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(
          TEN_cZRX,
        );
      });

      it("delegatee should approve another user (does not have an avatar) on behalf of delegator", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bZRX.approveOnAvatar.call(delegatorAvatar, a.other, TEN_cZRX, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bZRX.approveOnAvatar(delegatorAvatar, a.other, TEN_cZRX, { from: delegatee });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cZRX.allowance(delegatorAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cZRX);
      });

      it("delegatee tx should fail when user try to give approval to an avatar on behalf of delegator", async () => {
        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bZRX.approveOnAvatar(delegatorAvatar, spenderAvatar, TEN_cZRX, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cZRX.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.allowance()", async () => {
      let owner = a.user1;
      let spender = a.user2;

      let ownerAvatar: string;
      let spenderAvatar: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: owner });
        ownerAvatar = await bProtocol.registry.avatarOf(owner);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bZRX.approve(spender, TEN_cZRX, { from: owner });
      });

      it("should get allowance", async () => {
        let allowance = await bZRX.allowance(owner, spender);
        expect(allowance).to.be.bignumber.equal(TEN_cZRX);

        allowance = await cZRX.allowance(ownerAvatar, spenderAvatar);
        expect(allowance).to.be.bignumber.equal(TEN_cZRX);
      });

      it("should get zero when no allowance", async () => {
        await bProtocol.registry.newAvatar({ from: a.other });
        const otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        let allowance = await bZRX.allowance(owner, a.other);
        expect(allowance).to.be.bignumber.equal(ZERO);

        allowance = await cZRX.allowance(ownerAvatar, otherAvatar);
        expect(allowance).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BErc20.balanceOf()", async () => {
      let avatar1: string;
      let avatar2: string;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: a.user1 });
        avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(avatar1).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: a.user2 });
        avatar2 = await bProtocol.registry.avatarOf(a.user2);
        expect(avatar2).to.be.not.equal(ZERO_ADDRESS);
      });

      it("should get balance of user", async () => {
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const expected_cZRX_Bal = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(
          await bZRX.exchangeRateCurrent.call(),
        );

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(expected_cZRX_Bal);
      });
    });

    describe("BErc20.name()", async () => {
      it("should get token name", async () => {
        expect(await bZRX.name()).to.be.equal("cZRX");
      });
    });

    describe("BErc20.symbol()", async () => {
      it("should get token symbol", async () => {
        expect(await bZRX.symbol()).to.be.equal("cZRX");
      });
    });

    describe("BErc20.decimals()", async () => {
      it("should get token decimals", async () => {
        expect(await bZRX.decimals()).to.be.bignumber.equal(new BN(8));
      });
    });

    describe("BErc20.totalSupply()", async () => {
      it("should get zero totalSupply", async () => {
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);
      });

      it("should get non-zero totalSupply", async () => {
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(ZERO);

        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const exchangeRateCurrent = await cZRX.exchangeRateCurrent.call();

        const expectedTotalSupply = ONE_THOUSAND_ZRX.mul(ONE_ETH).div(exchangeRateCurrent);
        expect(await bZRX.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);
      });
    });
  });
});
