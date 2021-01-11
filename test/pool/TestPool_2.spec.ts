import * as b from "../../types/index";
import { BProtocolEngine, BProtocol } from "../../test-utils/BProtocolEngine";
import { CompoundUtils } from "../../test-utils/CompoundUtils";
import { BAccounts } from "../../test-utils/BAccounts";
import { takeSnapshot, revertToSnapShot } from "../../test-utils/SnapshotUtils";
import { toWei } from "web3-utils";
import BN from "bn.js";
import { boolean } from "hardhat/internal/core/params/argumentTypes";
import { ONE } from "user-rating/test-utils/constants";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");
const CEther: b.CEtherContract = artifacts.require("CEther");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const chai = require("chai");
const expect = chai.expect;

const ONE_ETH = new BN(10).pow(new BN(18));
const HALF_ETH = ONE_ETH.div(new BN(2));
const ZERO = new BN(0);

const ETH_ADDR = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// SCALE
const SCALE = new BN(10).pow(new BN(18));

// Collateral Factor
const HUNDRED_PERCENT = SCALE;
const FIFTY_PERCENT = HUNDRED_PERCENT.div(new BN(2));

// USD
const USD_PER_ETH = new BN(100); // $100
const ONE_ETH_RATE_IN_SCALE = SCALE;
const ONE_USD_IN_SCALE = ONE_ETH_RATE_IN_SCALE.div(USD_PER_ETH);

// Time Units
const ONE_MINUTE = new BN(60);
const ONE_HOUR = new BN(60).mul(ONE_MINUTE);

contract("Pool", async (accounts) => {
  let snapshotId: string;

  const engine = new BProtocolEngine(accounts);
  const a: BAccounts = new BAccounts(accounts);

  let bProtocol: BProtocol;
  let bComptroller: b.BComptrollerInstance;
  let comptroller: b.ComptrollerInstance;
  let compoundUtil: CompoundUtils;
  let pool: b.PoolInstance;
  let priceOracle: b.FakePriceOracleInstance;

  before(async () => {
    await engine.deployCompound();
    bProtocol = await engine.deployBProtocol();

    bComptroller = bProtocol.bComptroller;
    comptroller = bProtocol.compound.comptroller;
    compoundUtil = bProtocol.compound.compoundUtil;
    pool = bProtocol.pool;
    priceOracle = bProtocol.compound.priceOracle;
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertToSnapShot(snapshotId);
  });

  describe("Pool", async () => {
    let avatar1: b.AvatarInstance;
    let avatar2: b.AvatarInstance;
    let avatar3: b.AvatarInstance;
    let avatar4: b.AvatarInstance;

    const ONE_cZRX = new BN(10).pow(new BN(8));
    const TEN_cZRX = new BN(10).mul(ONE_cZRX);

    const ONE_ZRX = new BN(10).pow(new BN(18));
    const TEN_ZRX = new BN(10).mul(ONE_ZRX);
    const FIFTY_ZRX = new BN(50).mul(ONE_ZRX);
    const ONE_HUNDRED_ZRX = new BN(100).mul(ONE_ZRX);
    const FIVE_HUNDRED_ZRX = new BN(500).mul(ONE_ZRX);
    const ONE_THOUSAND_ZRX = new BN(1000).mul(ONE_ZRX);

    const ONE_BAT = new BN(10).pow(new BN(18));
    const HUNDRED_BAT = new BN(100).mul(ONE_BAT);
    const FIVE_HUNDRED_BAT = new BN(500).mul(ONE_BAT);
    const ONE_THOUSAND_BAT = new BN(1000).mul(ONE_BAT);

    const ONE_USDT = new BN(10).pow(new BN(6));
    const ONE_THOUSAND_USDT = new BN(1000).mul(ONE_USDT);
    const FIVE_HUNDRED_USDT = new BN(500).mul(ONE_USDT);

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

      // CREATE AVATAR
      // ===============
      // Create Avatar for User1
      avatar1 = await engine.deployNewAvatar(a.user1);
      expect(avatar1.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User2
      avatar2 = await engine.deployNewAvatar(a.user2);
      expect(avatar2.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User3
      avatar3 = await engine.deployNewAvatar(a.user3);
      expect(avatar3.address).to.be.not.equal(ZERO_ADDRESS);

      // Create Avatar for User4
      avatar4 = await engine.deployNewAvatar(a.user4);
      expect(avatar4.address).to.be.not.equal(ZERO_ADDRESS);
    });

    describe("Pool.setMembers()", async () => {
      it("should have members set already by BEngine", async () => {
        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });

      it("should set members", async () => {
        const newMemebers = [a.dummy1, a.dummy2, a.dummy3, a.dummy4];
        const tx = await pool.setMembers(newMemebers, { from: a.deployer });
        expectEvent(tx, "MembersSet", { members: newMemebers });

        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.dummy1);
        expect(members[1]).to.be.equal(a.dummy2);
        expect(members[2]).to.be.equal(a.dummy3);
        expect(members[3]).to.be.equal(a.dummy4);
      });

      it("should fail when non-owner try to set members", async () => {
        const newMemebers = [a.dummy1, a.dummy2, a.dummy3, a.dummy4];
        await expectRevert(
          pool.setMembers(newMemebers, { from: a.other }),
          "Ownable: caller is not the owner",
        );

        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });
    });

    describe("Pool.deposit()", async () => {
      it("member should deposit ETH", async () => {
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);

        const tx = await pool.methods["deposit()"]({ from: a.member1, value: ONE_ETH });
        expectEvent(tx, "MemberDeposit", {
          member: a.member1,
          underlying: ETH_ADDR,
          amount: ONE_ETH,
        });

        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ONE_ETH);
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ONE_ETH);
      });

      it("each member can deposit ETH", async () => {
        const members = await pool.getMembers();
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

        let ethBalanceAtPool = new BN(0);
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ZERO);

          const tx = await pool.methods["deposit()"]({ from: member, value: ONE_ETH });
          expectEvent(tx, "MemberDeposit", {
            member: member,
            underlying: ETH_ADDR,
            amount: ONE_ETH,
          });

          expect(await pool.balance(member, ETH_ADDR)).to.be.bignumber.equal(ONE_ETH);
          ethBalanceAtPool = ethBalanceAtPool.add(ONE_ETH);
          expect(await balance.current(pool.address)).to.be.bignumber.equal(ethBalanceAtPool);
        }
      });

      it("should fail when non-member try to deposit ETH", async () => {
        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);

        await expectRevert(
          pool.methods["deposit()"]({ from: a.other, value: ONE_ETH }),
          "Pool: not-member",
        );

        expect(await pool.balance(a.member1, ETH_ADDR)).to.be.bignumber.equal(ZERO);
        expect(await balance.current(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.deposit(underlying, amount)", async () => {
      it("member should deposit ZRX", async () => {
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: a.member1 });
        const tx = await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
          from: a.member1,
        });
        expectEvent(tx, "MemberDeposit", {
          member: a.member1,
          underlying: ZRX_addr,
          amount: ONE_THOUSAND_ZRX,
        });

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
      });

      it("each member can deposit ZRX", async () => {
        const members = await pool.getMembers();
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        let zrxBalanceAtPool = new BN(0);
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          expect(await pool.balance(member, ZRX_addr)).to.be.bignumber.equal(ZERO);

          await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: member });
          const tx = await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: member,
          });
          expectEvent(tx, "MemberDeposit", {
            member: member,
            underlying: ZRX_addr,
            amount: ONE_THOUSAND_ZRX,
          });

          expect(await pool.balance(member, ZRX_addr)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);
          zrxBalanceAtPool = zrxBalanceAtPool.add(ONE_THOUSAND_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceAtPool);
        }
      });

      it("should fail when non-member try to deposit ZRX", async () => {
        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);

        await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: a.member1 });
        await expectRevert(
          pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: a.other,
          }),
          "Pool: not-member",
        );

        expect(await pool.balance(a.member1, ZRX_addr)).to.be.bignumber.equal(ZERO);
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.withdraw()", async () => {
      let members: string[];

      beforeEach(async () => {
        members = await pool.getMembers();

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          // deposit ETH
          await pool.methods["deposit()"]({ from: member, value: ONE_ETH });

          // deposit ZRX
          await ZRX.approve(pool.address, ONE_THOUSAND_ZRX, { from: member });
          await pool.methods["deposit(address,uint256)"](ZRX_addr, ONE_THOUSAND_ZRX, {
            from: member,
          });
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(
          ONE_ETH.mul(new BN(4)),
        );
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX.mul(new BN(4)),
        );
      });

      it("should withdraw ETH balance", async () => {
        let ethBalanceInPool = ONE_ETH.mul(new BN(4));
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const tx = await pool.withdraw(ETH_ADDR, ONE_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: ONE_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(ONE_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ETH balance partially", async () => {
        let ethBalanceInPool = ONE_ETH.mul(new BN(4));
        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          let tx = await pool.withdraw(ETH_ADDR, HALF_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: HALF_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(HALF_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);

          tx = await pool.withdraw(ETH_ADDR, HALF_ETH, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ETH_ADDR,
            amount: HALF_ETH,
          });
          ethBalanceInPool = ethBalanceInPool.sub(HALF_ETH);
          expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ethBalanceInPool);
        }

        expect(await web3.eth.getBalance(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ZRX balance", async () => {
        let zrxBalanceInPool = ONE_THOUSAND_ZRX.mul(new BN(4));
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const tx = await pool.withdraw(ZRX_addr, ONE_THOUSAND_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: ONE_THOUSAND_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(ONE_THOUSAND_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);
        }

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });

      it("should withdraw ZRX balance partially", async () => {
        let zrxBalanceInPool = ONE_THOUSAND_ZRX.mul(new BN(4));
        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          let tx = await pool.withdraw(ZRX_addr, FIVE_HUNDRED_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: FIVE_HUNDRED_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(FIVE_HUNDRED_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);

          tx = await pool.withdraw(ZRX_addr, FIVE_HUNDRED_ZRX, { from: member });
          expectEvent(tx, "MemberWithdraw", {
            member: member,
            underlying: ZRX_addr,
            amount: FIVE_HUNDRED_ZRX,
          });
          zrxBalanceInPool = zrxBalanceInPool.sub(FIVE_HUNDRED_ZRX);
          expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(zrxBalanceInPool);
        }

        expect(await ZRX.balanceOf(pool.address)).to.be.bignumber.equal(ZERO);
      });
    });

    describe("Pool.liquidateBorrow()", async () => {
      it("member should liquidation a user (borrowed ETH)");

      it("member should liquidation a user (borrowed ZRX)");

      it("should fail when a non-member calls function");

      it("should when a member didn't toppedUp");

      it("should fail when amount is too big");
    });

    describe("Pool.membersLength()", async () => {
      it("should get membersLength", async () => {
        expect(await pool.membersLength()).to.be.bignumber.equal(new BN(4));

        const newMembers = [a.dummy1, a.dummy2, a.dummy3];
        await pool.setMembers(newMembers);

        expect(await pool.membersLength()).to.be.bignumber.equal(new BN(3));
      });
    });

    describe("Pool.getMembers()", async () => {
      it("should get members list", async () => {
        const members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);
      });

      it("should change members list after setMembers", async () => {
        let members = await pool.getMembers();
        expect(members.length).to.be.equal(4);

        expect(members[0]).to.be.equal(a.member1);
        expect(members[1]).to.be.equal(a.member2);
        expect(members[2]).to.be.equal(a.member3);
        expect(members[3]).to.be.equal(a.member4);

        const newMembers = [a.dummy1, a.dummy2, a.dummy3];
        await pool.setMembers(newMembers);

        members = await pool.getMembers();
        expect(members.length).to.be.equal(3);

        expect(members[0]).to.be.equal(a.dummy1);
        expect(members[1]).to.be.equal(a.dummy2);
        expect(members[2]).to.be.equal(a.dummy3);
      });
    });

    describe("Pool.getMemberTopupInfo()", async () => {
      it("should get member topup info");

      it("delete on topupInfo should delete memberInfo");
    });
  });
});

export function expectedLiquidity(
  accountLiquidity: [BN, BN, BN],
  param: {
    expectedErr: BN;
    expectedLiquidityAmt: BN;
    expectedShortFallAmt: BN;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("Err: " + accountLiquidity[0].toString());
    console.log("Liquidity: " + accountLiquidity[1].toString());
    console.log("ShortFall: " + accountLiquidity[2].toString());
  }

  expect(param.expectedErr, "Unexpected Err").to.be.bignumber.equal(accountLiquidity[0]);
  expect(param.expectedLiquidityAmt, "Unexpected Liquidity Amount").to.be.bignumber.equal(
    accountLiquidity[1],
  );
  expect(param.expectedShortFallAmt, "Unexpected ShortFall Amount").to.be.bignumber.equal(
    accountLiquidity[2],
  );
}

export function expectMemberTopupInfo(
  memberInfo: [BN, BN, BN],
  param: {
    expectedExpire: BN;
    expectedAmountTopped: BN;
    expectedAmountLiquidated: BN;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("expire: " + memberInfo[0].toString());
    console.log("amountTopped: " + memberInfo[1].toString());
    console.log("amountLiquidated: " + memberInfo[2].toString());
  }

  expect(param.expectedExpire, "Unexpected expire").to.be.bignumber.equal(memberInfo[0]);
  expect(param.expectedAmountTopped, "Unexpected amountTopped").to.be.bignumber.equal(
    memberInfo[1],
  );
  expect(param.expectedAmountLiquidated, "Unexpected amountLiquidated").to.be.bignumber.equal(
    memberInfo[2],
  );
}

export function expectDebtTopupInfo(
  debtTopupInfo: [BN, boolean],
  param: {
    expectedMinDebt: BN;
    expectedIsSmall: boolean;
  },
  debug: boolean = false,
) {
  if (debug) {
    console.log("minDebt: " + debtTopupInfo[0].toString());
    console.log("isSmall: " + debtTopupInfo[1]);
  }

  expect(param.expectedMinDebt, "Unexpected minDebt").to.be.bignumber.equal(debtTopupInfo[0]);
  expect(param.expectedIsSmall, "Unexpected isSmall").to.be.equal(debtTopupInfo[1]);
}
