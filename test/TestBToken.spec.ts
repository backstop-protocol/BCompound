import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CEther: b.CEtherContract = artifacts.require("CEther");
const CErc20: b.CErc20Contract = artifacts.require("CErc20");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");
const BEther: b.BEtherContract = artifacts.require("BEther");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

contract("BToken", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;

  before(async () => {
    // await engine.deployCompound();
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
    const ONE_ZRX = new BN(10).pow(new BN(18));
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);

    let ZRX_addr: string;
    let ZRX: b.Erc20DetailedInstance;

    let cZRX_addr: string;
    let cZRX: b.CErc20Instance;

    let bZRX_addr: string;
    let bZRX: b.BErc20Instance;

    beforeEach(async () => {
      ZRX_addr = compoundUtil.getTokens("ZRX");
      ZRX = await Erc20Detailed.at(ZRX_addr);

      cZRX_addr = compoundUtil.getContracts("cZRX");
      cZRX = await CErc20.at(cZRX_addr);

      bZRX = await engine.deployNewBErc20("cZRX");
      bZRX_addr = bZRX.address;

      expect((await ZRX.balanceOf(a.deployer)).gt(ZERO)).to.be.equal(true);

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
    });

    describe("BErc20: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bZRX.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bZRX.cToken()).to.be.equal(cZRX_addr);
        expect(await bZRX.underlying()).to.be.equal(ZRX_addr);
      });
    });

    describe("BErc20.mint()", async () => {
      it("user can mint cTokens", async () => {
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        const err = await bZRX.mint.call(ONE_THOUSAND_ZRX, { from: a.user1 });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await ZRX.balanceOf(avatar1)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(cZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });
    });

    describe("BErc20.mintOnAvatar()", async () => {
      it("delegatee can mint on behalf of user", async () => {
        const delegator = a.user1;
        const delegatee = a.user2;

        await bProtocol.registry.newAvatar({ from: delegator });
        const avtOfDelegator = await bProtocol.registry.avatarOf(a.user1);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        expect(await ZRX.balanceOf(delegatee)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: delegatee });
        const err = await bZRX.mintOnAvatar.call(avtOfDelegator, ONE_THOUSAND_ZRX, {
          from: delegatee,
        });
        expect(err).to.be.bignumber.equal(ZERO);

        await bZRX.mintOnAvatar(avtOfDelegator, ONE_THOUSAND_ZRX, { from: delegatee });

        expect(await cZRX.balanceOfUnderlying.call(avtOfDelegator)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
      });
    });

    describe("BErc20.repayBorrow()", async () => {
      it("");
    });

    describe("BErc20.liquidateBorrow()", async () => {
      it("");
    });

    // BToken

    describe("BErc20.borrowBalanceCurrent()", async () => {
      it("");
    });

    describe("BErc20.redeem()", async () => {
      it("user can redeem all cTokens", async () => {
        /*
        await ZRX.approve(bZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await bZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        const avatar1 = await bProtocol.registry.avatarOf(a.user1);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );

        let err = await cZRX.exchangeRateStored();
        expect(err).to.be.bignumber.equal(ZERO);

        const cTokensAmount = await cZRX.balanceOf(avatar1);
        console.log(cTokensAmount.toString());
        err = await cZRX.redeem.call(cTokensAmount);
        expect(err).to.be.bignumber.equal(ZERO);
        await cZRX.redeem(cTokensAmount);

        expect(await cZRX.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
        */
      });
    });

    describe("BErc20.redeemOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.redeemUnderlying()", async () => {
      it("");
    });

    describe("BErc20.redeemUnderlyingOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.borrow()", async () => {
      it("");
    });

    describe("BErc20.borrowOnAvatar()", async () => {
      it("");
    });

    // ERC20
    describe("BErc20.transfer()", async () => {
      it("");
    });

    describe("BErc20.transferOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.transferFrom()", async () => {
      it("");
    });

    describe("BErc20.transferFromOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.approve()", async () => {
      it("");
    });

    describe("BErc20.approveOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.allowance()", async () => {
      it("");
    });

    describe("BErc20.balanceOf()", async () => {
      it("");
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
      it("");
    });
  });

  describe("BEther", async () => {
    const ONE_ETH = new BN(10).pow(new BN(18));

    let cETH_addr: string;
    let cETH: b.CEtherInstance;

    let bETH_addr: string;
    let bETH: b.BEtherInstance;

    beforeEach(async () => {
      cETH_addr = compoundUtil.getContracts("cETH");
      cETH = await CEther.at(cETH_addr);

      bETH = await engine.deployNewBEther("cETH");
      bETH_addr = bETH.address;
    });

    describe("BEther: Constructor", async () => {
      it("should set addresses", async () => {
        expect(await bETH.registry()).to.be.equal(bProtocol.registry.address);
        expect(await bETH.cToken()).to.be.equal(cETH_addr);
      });
    });

    describe("BEther.mint()", async () => {
      it("user can mint cTokens", async () => {
        await bETH.mint.call({ from: a.user1, value: ONE_ETH.toString() });
        await bETH.mint({ from: a.user1, value: ONE_ETH });
        const avatar1 = await bProtocol.registry.avatarOf(a.user1);
        expect(await cETH.balanceOfUnderlying.call(avatar1)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.mintOnAvatar()", async () => {
      it("delegatee can mint on behalf of user", async () => {
        const delegator = a.user1;
        const delegatee = a.user2;

        await bProtocol.registry.newAvatar({ from: delegator });
        const avtOfDelegator = await bProtocol.registry.avatarOf(a.user1);

        await bProtocol.registry.delegateAvatar(delegatee, { from: delegator });

        await bETH.mintOnAvatar.call(avtOfDelegator, { from: delegatee, value: ONE_ETH });

        await bETH.mintOnAvatar(avtOfDelegator, { from: delegatee, value: ONE_ETH });

        expect(await cETH.balanceOfUnderlying.call(avtOfDelegator)).to.be.bignumber.equal(ONE_ETH);
      });
    });

    describe("BEther.repayBorrow()", async () => {
      it("");
    });

    describe("BEther.liquidateBorrow()", async () => {
      it("");
    });

    // BToken
    describe("BEther.myAvatar()", async () => {
      it("");
    });

    describe("BEther.borrowBalanceCurrent()", async () => {
      it("");
    });

    describe("BEther.redeem()", async () => {
      it("");
    });

    describe("BEther.redeemOnAvatar()", async () => {
      it("");
    });

    describe("BEther.redeemUnderlying()", async () => {
      it("");
    });

    describe("BEther.redeemUnderlyingOnAvatar()", async () => {
      it("");
    });

    describe("BEther.borrow()", async () => {
      it("");
    });

    describe("BEther.borrowOnAvatar()", async () => {
      it("");
    });

    // ERC20
    describe("BEther.transfer()", async () => {
      it("");
    });

    describe("BEther.transferOnAvatar()", async () => {
      it("");
    });

    describe("BEther.transferFrom()", async () => {
      it("");
    });

    describe("BEther.transferFromOnAvatar()", async () => {
      it("");
    });

    describe("BEther.approve()", async () => {
      it("");
    });

    describe("BEther.approveOnAvatar()", async () => {
      it("");
    });

    describe("BEther.allowance()", async () => {
      it("");
    });

    describe("BEther.balanceOf()", async () => {
      it("");
    });

    describe("BEther.name()", async () => {
      it("");
    });

    describe("BEther.symbol()", async () => {
      it("");
    });

    describe("BEther.decimals()", async () => {
      it("");
    });

    describe("BEther.totalSupply()", async () => {
      it("");
    });
  });
});
