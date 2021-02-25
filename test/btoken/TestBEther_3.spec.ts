import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time, send } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");
const MortalContract: b.MortalContract = artifacts.require("Mortal");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const BEther: b.BEtherContract = artifacts.require("BEther");

const chai = require("chai");
const expect = chai.expect;
const ONE_ETH = new BN(10).pow(new BN(18));
const ZERO = new BN(0);

contract("BEther", async (accounts) => {
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

  describe("BEther", async () => {
    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_cETH = new BN(10).pow(new BN(8));
    const TEN_cETH = new BN(10).mul(ONE_cETH);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);

    const ONE_USDT = new BN(10).pow(new BN(6));
    const ONE_THOUSAND_USDT = new BN(1000).mul(ONE_USDT);
    const FIVE_HUNDRED_USDT = new BN(500).mul(ONE_USDT);

    const ONE_ETH = new BN(10).pow(new BN(18));
    const HALF_ETH = ONE_ETH.div(new BN(2));
    const TEN_ETH = new BN(10).mul(ONE_ETH);
    const HUNDRED_ETH = new BN(100).mul(ONE_ETH);

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

    // USDT
    let USDT_addr: string;
    let USDT: b.Erc20DetailedInstance;

    let bUSDT_addr: string;
    let bUSDT: b.BErc20Instance;

    let cUSDT_addr: string;
    let cUSDT: b.CErc20Instance;

    // ETH
    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    let cETH_addr: string;
    let cETH: b.CEtherInstance;

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

      // USDT
      bUSDT = await engine.deployNewBErc20("cUSDT");
      bUSDT_addr = bUSDT.address;

      USDT_addr = compoundUtil.getTokens("USDT");
      USDT = await Erc20Detailed.at(USDT_addr);

      cUSDT_addr = compoundUtil.getContracts("cUSDT");
      cUSDT = await CErc20.at(cUSDT_addr);

      // ETH:: deploy BEther
      bETH = await engine.deployNewBEther();
      bETH_addr = bETH.address;

      cETH_addr = compoundUtil.getContracts("cETH");
      cETH = await CEther.at(cETH_addr);

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);
      expect((await BAT.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

      await USDT.transfer(a.user1, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      await USDT.transfer(a.user2, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      await USDT.transfer(a.user4, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user4)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));
    });

    describe("BEther.transferFrom()", async () => {
      let owner = a.user1;
      let spender = a.user2;

      let ownerAvatar: string;
      let spenderAvatar: string;

      let owner_expected_cETH_Bal: BN;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: owner });
        ownerAvatar = await bProtocol.registry.avatarOf(owner);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        owner_expected_cETH_Bal = TEN_ETH.mul(ONE_ETH).div(await bETH.exchangeRateCurrent.call());

        await bETH.mint({ from: owner, value: TEN_ETH });
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);

        await bETH.approve(spender, TEN_cETH, { from: owner });
        expect(await bETH.allowance(owner, spender)).to.be.bignumber.equal(TEN_cETH);
      });

      it("spender should transfer cETH tokens from owner to user3", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        const result = await bETH.transferFrom.call(owner, a.user3, ONE_cETH, { from: spender });
        expect(result).to.be.equal(true);
        await bETH.transferFrom(owner, a.user3, ONE_cETH, { from: spender });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cETH_Bal.sub(ONE_cETH),
        );
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cETH);
      });

      it("spender should transfer cETH tokens from owner to himself", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        const result = await bETH.transferFrom.call(owner, spender, ONE_cETH, { from: spender });
        expect(result).to.be.equal(true);
        await bETH.transferFrom(owner, spender, ONE_cETH, { from: spender });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cETH_Bal.sub(ONE_cETH),
        );
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ONE_cETH);
      });

      it("should fail when spender try to transfer cETH tokens from owner to user3's avatar", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.transferFrom(owner, avatar3, ONE_cETH, { from: spender }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
      });

      it("should fail when spender try to transfer cETH tokens from owner to spender's avatar", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.transferFrom(owner, spenderAvatar, ONE_cETH, { from: spender }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("should fail transfer cETH tokens from owner to owner", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        // failed at Compound, as it doesn't allow sending tokens to self
        await expectRevert(
          bETH.transferFrom(owner, owner, ONE_cETH, { from: spender }),
          "transferFrom-fail",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.transferFromOnAvatar()", async () => {
      let owner = a.user1;
      let spender = a.user2;
      let spenderDelegatee = a.user4;

      let ownerAvatar: string;
      let spenderAvatar: string;

      let owner_expected_cETH_Bal: BN;

      beforeEach(async () => {
        await bProtocol.registry.newAvatar({ from: owner });
        ownerAvatar = await bProtocol.registry.avatarOf(owner);
        expect(ownerAvatar).to.be.not.equal(ZERO_ADDRESS);

        await bProtocol.registry.newAvatar({ from: spender });
        spenderAvatar = await bProtocol.registry.avatarOf(spender);
        expect(spenderAvatar).to.be.not.equal(ZERO_ADDRESS);

        owner_expected_cETH_Bal = TEN_ETH.mul(ONE_ETH).div(await bETH.exchangeRateCurrent.call());

        await bETH.mint({ from: owner, value: TEN_ETH });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        await bETH.approve(spender, TEN_cETH, { from: owner });
        expect(await bETH.allowance(owner, spender)).to.be.bignumber.equal(TEN_cETH);

        // spender delegate to spenderDelegatee
        await bProtocol.registry.delegateAvatar(spenderDelegatee, { from: spender });
        expect(await bProtocol.registry.delegate(spenderAvatar, spenderDelegatee)).to.be.equal(
          true,
        );
      });

      it("spenderDelegatee should transfer cETH tokens from owner to user3 on behalf of spender", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        const result = await bETH.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          a.user3,
          ONE_cETH,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);
        await bETH.transferFromOnAvatar(spenderAvatar, owner, a.user3, ONE_cETH, {
          from: spenderDelegatee,
        });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cETH_Bal.sub(ONE_cETH),
        );
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ONE_cETH);
      });

      it("spenderDelegatee should transfer cETH tokens from owner to spender on behalf of spender", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        const result = await bETH.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          spender,
          ONE_cETH,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);

        await bETH.transferFromOnAvatar(spenderAvatar, owner, spender, ONE_cETH, {
          from: spenderDelegatee,
        });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cETH_Bal.sub(ONE_cETH),
        );
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ONE_cETH);
      });

      it("spenderDelegatee should transfer cETH tokens from owner to himself on behalf of spender", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spenderDelegatee)).to.be.bignumber.equal(ZERO);

        const result = await bETH.transferFromOnAvatar.call(
          spenderAvatar,
          owner,
          spenderDelegatee,
          ONE_cETH,
          {
            from: spenderDelegatee,
          },
        );
        expect(result).to.be.equal(true);

        await bETH.transferFromOnAvatar(spenderAvatar, owner, spenderDelegatee, ONE_cETH, {
          from: spenderDelegatee,
        });

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(
          owner_expected_cETH_Bal.sub(ONE_cETH),
        );
        expect(await bETH.balanceOf(spenderDelegatee)).to.be.bignumber.equal(ONE_cETH);
      });

      it("spenderDelegatee tx should fail when he try to transfer cETH tokens from owner to user3's avatar on behalf of spender", async () => {
        await bProtocol.registry.newAvatar({ from: a.user3 });
        const avatar3 = await bProtocol.registry.avatarOf(a.user3);

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.transferFromOnAvatar(spenderAvatar, owner, avatar3, ONE_cETH, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
        expect(await bETH.balanceOf(a.user3)).to.be.bignumber.equal(ZERO);
      });

      it("spenderDelegatee tx should fail when he try to transfer cETH tokens from owner to spender's avatar on behalf of spender", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.transferFromOnAvatar(spenderAvatar, owner, spenderAvatar, ONE_cETH, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("spenderDelegatee tx should fail when he try to transfer cETH tokens from owner to spenderDelegatee's avatar on behalf of spender", async () => {
        await bProtocol.registry.newAvatar({ from: spenderDelegatee });
        const spenderDelegateeAvatar = await bProtocol.registry.avatarOf(spenderDelegatee);
        expect(spenderDelegateeAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.transferFromOnAvatar(spenderAvatar, owner, spenderDelegateeAvatar, ONE_cETH, {
            from: spenderDelegatee,
          }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });

      it("senderDelegatee tx should fail when he try to transfer cETH tokens from owner to owner on behalf of spender", async () => {
        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);

        // failed at Compound, as it doesn't allow sending tokens to self
        await expectRevert(
          bETH.transferFromOnAvatar(spenderAvatar, owner, owner, ONE_cETH, {
            from: spenderDelegatee,
          }),
          "transferFrom-fail",
        );

        expect(await bETH.balanceOf(owner)).to.be.bignumber.equal(owner_expected_cETH_Bal);
        expect(await bETH.balanceOf(spender)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.approve()", async () => {
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
        expect(await cETH.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
        expect(await bETH.allowance(owner, spender)).to.be.bignumber.equal(ZERO);

        const result = await bETH.approve.call(spender, TEN_cETH, { from: owner });
        expect(result).to.be.equal(true);
        await bETH.approve(spender, TEN_cETH, { from: owner });

        expect(await cETH.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(TEN_cETH);
        expect(await bETH.allowance(owner, spender)).to.be.bignumber.equal(TEN_cETH);
      });

      it("user should approve another user (does not have an avatar)", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bETH.approve.call(a.other, TEN_cETH, { from: owner });
        expect(result).to.be.equal(true);
        await bETH.approve(a.other, TEN_cETH, { from: owner });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cETH.allowance(ownerAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cETH);
      });

      it("should fail when user try to give approval to an avatar", async () => {
        expect(await cETH.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.approve(spenderAvatar, TEN_cETH, { from: owner }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cETH.allowance(ownerAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.approveOnAvatar()", async () => {
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
        expect(await cETH.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        const result = await bETH.approveOnAvatar.call(delegatorAvatar, spender, TEN_cETH, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bETH.approveOnAvatar(delegatorAvatar, spender, TEN_cETH, { from: delegatee });

        expect(await cETH.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(
          TEN_cETH,
        );
      });

      it("delegatee should approve another user (does not have an avatar) on behalf of delegator", async () => {
        let otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.equal(ZERO_ADDRESS);

        const result = await bETH.approveOnAvatar.call(delegatorAvatar, a.other, TEN_cETH, {
          from: delegatee,
        });
        expect(result).to.be.equal(true);
        await bETH.approveOnAvatar(delegatorAvatar, a.other, TEN_cETH, { from: delegatee });

        otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        expect(await cETH.allowance(delegatorAvatar, otherAvatar)).to.be.bignumber.equal(TEN_cETH);
      });

      it("delegatee tx should fail when user try to give approval to an avatar on behalf of delegator", async () => {
        expect(await cETH.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          bETH.approveOnAvatar(delegatorAvatar, spenderAvatar, TEN_cETH, { from: delegatee }),
          "Registry: cannot-create-an-avatar-of-avatar",
        );

        expect(await cETH.allowance(delegatorAvatar, spenderAvatar)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.allowance()", async () => {
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

        await bETH.approve(spender, TEN_cETH, { from: owner });
      });

      it("should get allowance", async () => {
        let allowance = await bETH.allowance(owner, spender);
        expect(allowance).to.be.bignumber.equal(TEN_cETH);

        allowance = await cETH.allowance(ownerAvatar, spenderAvatar);
        expect(allowance).to.be.bignumber.equal(TEN_cETH);
      });

      it("should get zero when no allowance", async () => {
        await bProtocol.registry.newAvatar({ from: a.other });
        const otherAvatar = await bProtocol.registry.avatarOf(a.other);
        expect(otherAvatar).to.be.not.equal(ZERO_ADDRESS);

        let allowance = await bETH.allowance(owner, a.other);
        expect(allowance).to.be.bignumber.equal(ZERO);

        allowance = await cETH.allowance(ownerAvatar, otherAvatar);
        expect(allowance).to.be.bignumber.equal(ZERO);
      });
    });

    describe("BEther.balanceOf()", async () => {
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
        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);

        await bETH.mint({ from: a.user1, value: TEN_ETH });

        const expected_cETH_Bal = TEN_ETH.mul(ONE_ETH).div(await bETH.exchangeRateCurrent.call());

        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(expected_cETH_Bal);
      });
    });

    describe("BEther.name()", async () => {
      it("should get token name", async () => {
        expect(await bETH.name()).to.be.equal("cETH");
      });
    });

    describe("BEther.symbol()", async () => {
      it("should get token symbol", async () => {
        expect(await bETH.symbol()).to.be.equal("cETH");
      });
    });

    describe("BEther.decimals()", async () => {
      it("should get token decimals", async () => {
        expect(await bETH.decimals()).to.be.bignumber.equal(new BN(8));
      });
    });

    describe("BEther.totalSupply()", async () => {
      it("should get zero totalSupply", async () => {
        expect(await bETH.totalSupply()).to.be.bignumber.equal(ZERO);
      });

      it("should get non-zero totalSupply", async () => {
        expect(await bETH.totalSupply()).to.be.bignumber.equal(ZERO);

        await bETH.mint({ from: a.user1, value: toWei("1", "ether") });

        const exchangeRateCurrent = await cETH.exchangeRateCurrent.call();

        const expectedTotalSupply = ONE_ETH.mul(ONE_ETH).div(exchangeRateCurrent);
        expect(await bETH.totalSupply()).to.be.bignumber.equal(expectedTotalSupply);
      });
    });
  });
});
