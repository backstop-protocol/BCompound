import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import BN from "bn.js";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const BComptroller: b.BComptrollerContract = artifacts.require("BComptroller");
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
    describe("BErc20: Constructor", async () => {
      it("");
    });

    describe("BErc20.mint()", async () => {
      it("");
    });

    describe("BErc20.mintOnAvatar()", async () => {
      it("");
    });

    describe("BErc20.repayBorrow()", async () => {
      it("");
    });

    describe("BErc20.liquidateBorrow()", async () => {
      it("");
    });

    // BToken
    describe("BErc20.myAvatar()", async () => {
      it("");
    });

    describe("BErc20.borrowBalanceCurrent()", async () => {
      it("");
    });

    describe("BErc20.redeem()", async () => {
      it("");
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
      it("");
    });

    describe("BErc20.symbol()", async () => {
      it("");
    });

    describe("BErc20.decimals()", async () => {
      it("");
    });

    describe("BErc20.totalSupply()", async () => {
      it("");
    });
  });

  describe("BEther", async () => {
    describe("BEther: Constructor", async () => {
      it("");
    });

    describe("BEther.mint()", async () => {
      it("");
    });

    describe("BEther.mintOnAvatar()", async () => {
      it("");
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
