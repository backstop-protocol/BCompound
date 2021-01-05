import * as b from "../types/index";
import { BProtocolEngine, BProtocol } from "../test-utils/BProtocolEngine";
import { CompoundUtils } from "../test-utils/CompoundUtils";
import { takeSnapshot, revertToSnapShot } from "../test-utils/SnapshotUtils";
import { BAccounts } from "../test-utils/BAccounts";
import BN from "bn.js";
import { toWei } from "web3-utils";

const CEther: b.CEtherContract = artifacts.require("CEther");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const Erc20Detailed: b.Erc20DetailedContract = artifacts.require("ERC20Detailed");

const CErc20: b.CErc20Contract = artifacts.require("CErc20");

const BErc20: b.BErc20Contract = artifacts.require("BErc20");

const Import: b.ImportContract = artifacts.require("Import");
const FlashLoanImport: b.FlashLoanImportContract = artifacts.require("FlashLoanImport");
const FlashLoanImportWithFees: b.FlashLoanImportWithFeesContract = artifacts.require(
  "FlashLoanImportWithFees",
);
const FlashLoanStub: b.FlashLoanStubContract = artifacts.require("FlashLoanStub");

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

      await ZRX.transfer(a.user1, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await ZRX.transfer(a.user2, ONE_THOUSAND_ZRX, { from: a.deployer });
      expect(await ZRX.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_ZRX);

      await BAT.transfer(a.user1, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

      await BAT.transfer(a.user2, ONE_THOUSAND_BAT, { from: a.deployer });
      expect(await BAT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_BAT);

      await USDT.transfer(a.user1, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user1)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      await USDT.transfer(a.user2, ONE_THOUSAND_USDT, { from: a.deployer });
      expect(await USDT.balanceOf(a.user2)).to.be.bignumber.equal(ONE_THOUSAND_USDT);

      // NOTICE: Fix the Price oracle issue on Compound deployment
      await comptroller._setPriceOracle(compoundUtil.getContracts("PriceOracle"));
    });

    describe("import", async () => {
      let bImport: b.ImportInstance;
      let bFlashLoanImport: b.FlashLoanImportInstance;
      let bFlashLoanImportWithFees: b.FlashLoanImportWithFeesInstance;
      let bFlashLoanStub: b.FlashLoanStubInstance;
      const flashloanVal = new BN(10).pow(new BN(18)).mul(new BN(1000));
      let cZRXBalance = new BN(0);
      let cETHBalance = new BN(0);
      let cBATBalance = new BN(0);
      let checkDebtAfter = true;

      beforeEach(async () => {
        // user1 deposit ZRX
        await ZRX.approve(cZRX_addr, ONE_THOUSAND_ZRX, { from: a.user1 });
        await cZRX.mint(ONE_THOUSAND_ZRX, { from: a.user1 });

        // user1 deposit BAT
        await BAT.approve(cBAT_addr, ONE_THOUSAND_BAT, { from: a.user1 });
        await cBAT.mint(ONE_THOUSAND_BAT, { from: a.user1 });

        // user1 deposit ETH
        await cETH.mint({ from: a.user1, value: ONE_ETH });

        // user2 deposit BAT
        await BAT.approve(cBAT_addr, ONE_THOUSAND_BAT, { from: a.user2 });
        await cBAT.mint(ONE_THOUSAND_BAT, { from: a.user2 });

        // user2 deposit USDT
        await USDT.approve(cUSDT_addr, ONE_THOUSAND_USDT, { from: a.user2 });
        await cUSDT.mint(ONE_THOUSAND_USDT, { from: a.user2 });

        // enter market
        await comptroller.enterMarkets([cZRX_addr, cETH_addr, cBAT.address], { from: a.user1 });

        expect(await cBAT.borrow.call(HUNDRED_BAT, { from: a.user1 })).to.be.bignumber.equal(ZERO);
        await cBAT.borrow(HUNDRED_BAT, { from: a.user1 });

        expect(await cUSDT.borrow.call(FIVE_HUNDRED_USDT, { from: a.user1 })).to.be.bignumber.equal(
          ZERO,
        );
        await cUSDT.borrow(FIVE_HUNDRED_USDT, { from: a.user1 });

        expect(await cZRX.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
          ONE_THOUSAND_ZRX,
        );
        expect(await cETH.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(ONE_ETH);
        expect(await cBAT.balanceOfUnderlying.call(a.user1)).to.be.bignumber.equal(
          ONE_THOUSAND_BAT,
        );

        expect(await cBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HUNDRED_BAT);
        expect(await cUSDT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
          FIVE_HUNDRED_USDT,
        );

        // import
        bImport = await Import.new(bProtocol.registry.address, bProtocol.bComptroller.address);
        bFlashLoanImport = await FlashLoanImport.new();
        bFlashLoanImportWithFees = await FlashLoanImportWithFees.new();
        bFlashLoanStub = await FlashLoanStub.new();

        await bFlashLoanStub.deposit({ from: a.user1, value: flashloanVal });

        // give allowance to import
        cZRXBalance = await cZRX.balanceOf(a.user1);
        await cZRX.approve(bImport.address, cZRXBalance, { from: a.user1 });

        cBATBalance = await cBAT.balanceOf(a.user1);
        await cBAT.approve(bImport.address, cBATBalance, { from: a.user1 });

        cETHBalance = await cETH.balanceOf(a.user1);
        await cETH.approve(bImport.address, cETHBalance, { from: a.user1 });

        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await bBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await cBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HUNDRED_BAT);

        checkDebtAfter = true;
      });

      afterEach(async () => {
        console.log("checking balance after import");
        // check balance
        expect(await bZRX.balanceOf(a.user1)).to.be.bignumber.equal(cZRXBalance);
        expect(await bETH.balanceOf(a.user1)).to.be.bignumber.equal(cETHBalance);
        expect(await bBAT.balanceOf(a.user1)).to.be.bignumber.equal(cBATBalance);

        if (checkDebtAfter) {
          console.log("checking debt after");
          expect(await bBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HUNDRED_BAT);
          expect(await bUSDT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
            FIVE_HUNDRED_USDT,
          );
        } else console.log("skipping checking debt after");

        console.log("checking delegate was revoked");
        const avatar = await bProtocol.registry.getAvatar.call(a.user1);
        expect(await bProtocol.registry.delegate(avatar, bImport.address)).to.be.equal(false);
      });

      it("user should import without fees", async () => {
        const avatar1 = await bProtocol.registry.getAvatar.call(a.user1);
        await cZRX.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cETH.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cBAT.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });

        // call flash import
        const data = await bFlashLoanImport.contract.methods
          .flashImport(
            [cZRX.address, cETH.address, cBAT.address],
            [ZRX.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", BAT.address],
            [cBAT.address, cUSDT.address],
            [BAT.address, USDT.address],
            bImport.address,
            flashloanVal,
            bFlashLoanStub.address,
          )
          .encodeABI();

        await bProtocol.registry.delegateAndExecuteOnce(
          bImport.address,
          bFlashLoanImport.address,
          data,
          { from: a.user1 },
        );

        // check balance
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
      });

      it("user should import without fees and with ETH borrow", async () => {
        expect(await cETH.borrow.call(HALF_ETH, { from: a.user1 })).to.be.bignumber.equal(ZERO);
        await cETH.borrow(HALF_ETH, { from: a.user1 });
        expect(await cETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HALF_ETH);

        const avatar1 = await bProtocol.registry.getAvatar.call(a.user1);
        await cZRX.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cETH.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cBAT.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });

        // call flash import
        const data = await bFlashLoanImport.contract.methods
          .flashImport(
            [cZRX.address, cETH.address, cBAT.address],
            [ZRX.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", BAT.address],
            [cBAT.address, cUSDT.address, cETH.address],
            [BAT.address, USDT.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"],
            bImport.address,
            flashloanVal,
            bFlashLoanStub.address,
          )
          .encodeABI();

        await bProtocol.registry.delegateAndExecuteOnce(
          bImport.address,
          bFlashLoanImport.address,
          data,
          { from: a.user1 },
        );

        // check balance
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HALF_ETH);
      });

      it("user should import without fees and with no debt", async () => {
        // repay the bat and usdt debt
        await BAT.approve(cBAT.address, HUNDRED_BAT, { from: a.user1 });
        await cBAT.repayBorrow(HUNDRED_BAT, { from: a.user1 });
        await USDT.approve(cUSDT.address, HUNDRED_BAT, { from: a.user1 });
        await cUSDT.repayBorrow(FIVE_HUNDRED_USDT, { from: a.user1 });

        // make sure borrow balance was reset
        expect(await cBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await cUSDT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);

        const avatar1 = await bProtocol.registry.getAvatar.call(a.user1);
        await cZRX.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cETH.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cBAT.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });

        // call flash import
        const data = await bFlashLoanImport.contract.methods
          .flashImport(
            [cZRX.address, cETH.address, cBAT.address],
            [ZRX.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", BAT.address],
            [],
            [],
            bImport.address,
            flashloanVal,
            bFlashLoanStub.address,
          )
          .encodeABI();

        await bProtocol.registry.delegateAndExecuteOnce(
          bImport.address,
          bFlashLoanImport.address,
          data,
          { from: a.user1 },
        );

        // check balance
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await bBAT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);
        expect(await bUSDT.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(ZERO);

        checkDebtAfter = false;
      });

      it("user should import with fees", async () => {
        const avatar1 = await bProtocol.registry.getAvatar.call(a.user1);
        await cZRX.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cETH.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cBAT.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });

        // call flash import
        const data = await bFlashLoanImportWithFees.contract.methods
          .flashImport(
            [cZRX.address, cETH.address, cBAT.address],
            [ZRX.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", BAT.address],
            [cBAT.address, cUSDT.address],
            [BAT.address, USDT.address],
            bImport.address,
            flashloanVal,
            bFlashLoanStub.address,
          )
          .encodeABI();

        await bProtocol.registry.delegateAndExecuteOnce(
          bImport.address,
          bFlashLoanImportWithFees.address,
          data,
          { from: a.user1 },
        );

        // check balance
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(new BN(1000));
      });

      it("user should import with fees with ETH borrow", async () => {
        expect(await cETH.borrow.call(HALF_ETH, { from: a.user1 })).to.be.bignumber.equal(ZERO);
        await cETH.borrow(HALF_ETH, { from: a.user1 });
        expect(await cETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(HALF_ETH);

        const avatar1 = await bProtocol.registry.getAvatar.call(a.user1);
        await cZRX.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cETH.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });
        await cBAT.approve(avatar1, new BN(2).pow(new BN(255)), { from: a.user1 });

        // call flash import
        const data = await bFlashLoanImportWithFees.contract.methods
          .flashImport(
            [cZRX.address, cETH.address, cBAT.address],
            [ZRX.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", BAT.address],
            [cBAT.address, cUSDT.address, cETH.address],
            [BAT.address, USDT.address, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"],
            bImport.address,
            flashloanVal,
            bFlashLoanStub.address,
          )
          .encodeABI();

        const tx = await bProtocol.registry.delegateAndExecuteOnce(
          bImport.address,
          bFlashLoanImportWithFees.address,
          data,
          { from: a.user1 },
        );
        console.log(tx.receipt.gasUsed);

        // check balance
        expect(await bETH.borrowBalanceCurrent.call(a.user1)).to.be.bignumber.equal(
          HALF_ETH.add(new BN(1000)),
        );
      });
    });
  });
});
