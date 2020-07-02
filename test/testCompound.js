const Comp = artifacts.require("Comp");
const CErc20 = artifacts.require("CErc20");
const CEther = artifacts.require("CEther");
const ERC20 = artifacts.require("ERC20");
const Comptroller = artifacts.require("ComptrollerScenarioG1");

var chai = require("chai");
var assert = require("chai").assert;
var expect = require("chai").expect;
const BN = require("bn.js");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

var compoundJSON = require("../compound-protocol/networks/development.json");

contract("Validate Compound Deployment", (accounts) => {
  const ONE_TOKEN_18 = new BN(10).pow(new BN(18));
  const ONE_MILLION_TOKENS_18 = new BN(10).pow(new BN(6)).mul(ONE_TOKEN_18);

  it("should get COMP token balance", async () => {
    const FIVE_MILLION_TOKENS_18 = ONE_MILLION_TOKENS_18.mul(new BN(5));
    const COMP_addr = compoundJSON.Contracts.COMP;
    const instance = await Comp.at(COMP_addr);
    const totalSupply = await instance.totalSupply();

    expect(FIVE_MILLION_TOKENS_18).to.bignumber.equal(totalSupply);
  });

  it("should print token balances:", async () => {
    // BAT
    const cBAT_addr = compoundJSON.Contracts.cBAT;
    const cBAT = await CErc20.at(cBAT_addr);
    const BAT_addr = compoundJSON.Contracts.BAT;
    const BAT = await ERC20.at(BAT_addr);

    // ZRX
    const cZRX_addr = compoundJSON.Contracts.cZRX;
    const cZRX = await CErc20.at(cZRX_addr);
    const ZRX_addr = compoundJSON.Contracts.ZRX;
    const ZRX = await ERC20.at(ZRX_addr);

    console.log("ACCOUNT\tBAT\tcBAT\tZRX\tcZRX");
    await Promise.all(
      accounts.map(async (account) => {
        const batBal = await BAT.balanceOf(account);
        const cBATbal = await cBAT.balanceOf(account);
        const zrxBal = await ZRX.balanceOf(account);
        const cZRXbal = await cZRX.balanceOf(account);
        console.log(
          account +
            "\t" +
            batBal.toString() +
            "\t" +
            cBATbal.toString() +
            "\t" +
            zrxBal.toString() +
            "\t" +
            cZRXbal.toString()
        );
      })
    );
  });

  it("should mint cBAT", async () => {
    const minter = accounts[3];
    const TEN_TOKENS_18 = new BN(10).mul(ONE_TOKEN_18);
    const BAT_addr = compoundJSON.Contracts.BAT;
    const BAT = await ERC20.at(BAT_addr);
    const cBAT_addr = compoundJSON.Contracts.cBAT;
    const cBAT = await CErc20.at(cBAT_addr);
    await BAT.approve(cBAT_addr, TEN_TOKENS_18, { from: minter });
    const beforeBalance = await cBAT.balanceOf(minter);
    await cBAT.mint(TEN_TOKENS_18, { from: minter });
    const afterBalance = await cBAT.balanceOf(minter);
    expect(afterBalance).to.bignumber.gt(beforeBalance);
  });

  it("should mint cZRX", async () => {
    const minter = accounts[2];
    const TEN_TOKENS_18 = new BN(10).mul(ONE_TOKEN_18);
    const ZRX_addr = compoundJSON.Contracts.ZRX;
    const ZRX = await ERC20.at(ZRX_addr);
    const cZRX_addr = compoundJSON.Contracts.cZRX;
    const cZRX = await CErc20.at(cZRX_addr);
    await ZRX.approve(cZRX_addr, TEN_TOKENS_18, { from: minter });
    const beforeBalance = await cZRX.balanceOf(minter);
    await cZRX.mint(TEN_TOKENS_18, { from: minter });
    const afterBalance = await cZRX.balanceOf(minter);
    expect(afterBalance).to.bignumber.gt(beforeBalance);
  });

  it("should mint cETH", async () => {
    const minter = accounts[9];
    const cETH_addr = compoundJSON.Contracts.cETH;
    const cETH = await CEther.at(cETH_addr);

    const beforeBalance = await cETH.balanceOf(minter);
    await cETH.mint({ from: minter, value: web3.utils.toWei("1", "ether") });
    const afterBalance = await cETH.balanceOf(minter);
    expect(afterBalance).to.bignumber.gt(beforeBalance);
  });

  it("should borrow ZRX", async () => {
    const borrower = accounts[3];
    const ZRX_addr = compoundJSON.Contracts.ZRX;
    const ZRX = await ERC20.at(ZRX_addr);
    const cZRX_addr = compoundJSON.Contracts.cZRX;
    const cZRX = await CErc20.at(cZRX_addr);

    const beforeBalance = await ZRX.balanceOf(borrower);
    await cZRX.borrow(ONE_TOKEN_18, { from: borrower });
    const afterBalance = await ZRX.balanceOf(borrower);
    expect(afterBalance).to.bignumber.gt(beforeBalance);
  });

  it("should borrow BAT", async () => {
    const borrower = accounts[3];
    const BAT_addr = compoundJSON.Contracts.BAT;
    const BAT = await ERC20.at(BAT_addr);
    const cBAT_addr = compoundJSON.Contracts.cBAT;
    const cBAT = await CErc20.at(cBAT_addr);

    const beforeBalance = await BAT.balanceOf(borrower);
    await cBAT.borrow(ONE_TOKEN_18, { from: borrower });
    const afterBalance = await BAT.balanceOf(borrower);
    expect(afterBalance).to.bignumber.gt(beforeBalance);
  });

  it("should borrow ETH", async () => {
    // depositing ZRX
    const minter = accounts[0];
    const THOUSAND_TOKENS_18 = new BN(1000).mul(ONE_TOKEN_18);
    const ZRX_addr = compoundJSON.Contracts.ZRX;
    const ZRX = await ERC20.at(ZRX_addr);
    const cZRX_addr = compoundJSON.Contracts.cZRX;
    const cZRX = await CErc20.at(cZRX_addr);
    await ZRX.approve(cZRX_addr, THOUSAND_TOKENS_18, { from: minter });
    let beforeBalance = await cZRX.balanceOf(minter);
    await cZRX.mint(THOUSAND_TOKENS_18, { from: minter });
    let afterBalance = await cZRX.balanceOf(minter);
    expect(afterBalance).to.bignumber.gt(beforeBalance);

    const beforeBalOfUnderlaying = await cZRX.balanceOfUnderlying.call(minter);
    // console.log("cZRX balanceOfUnderlaying" + beforeBalOfUnderlaying);

    // enter market
    const comptrollerAddr = await cZRX.comptroller();
    const comptroller = await Comptroller.at(comptrollerAddr);
    await comptroller.enterMarkets([cZRX_addr], { from: minter });

    // Borrowing ETH
    const borrower = accounts[0];
    const cETH_addr = compoundJSON.Contracts.cETH;
    const cETH = await CEther.at(cETH_addr);
    // console.log(await cETH.comptroller());

    await comptroller.enterMarkets([cETH.address], { from: borrower });

    console.log("factor", await comptroller.markets(cETH.address));

    const cethBal = await cETH.balanceOf(borrower);
    console.log(cethBal.toString());

    beforeBalance = await web3.eth.getBalance(borrower);
    await cETH.accrueInterest();
    console.log("cETH balance", await web3.eth.getBalance(cETH.address));
    await cETH.mint({
      from: borrower,
      value: web3.utils.toWei("10000000", "ether"),
    });
    console.log("cETH balance", await web3.eth.getBalance(cETH.address));
    const borVal = web3.utils.toWei("1000000", "ether");
    console.log(
      "borrow ret val",
      await cETH.borrow.call(borVal, { from: borrower })
    );
    await cETH.borrow(borVal, { from: borrower });
    afterBalance = await web3.eth.getBalance(borrower);
    const totalBorrow = await cETH.totalBorrowsCurrent.call();
    expect(totalBorrow).to.bignumber.gte(borVal);

    console.log(await cETH.totalReserves());
    console.log(await cETH.reserveFactorMantissa());
    console.log(await cZRX.reserveFactorMantissa());

    let retVal = await cETH.accrueInterest.call();
    console.log(retVal);
    await cETH.accrueInterest();
    console.log("borrow rate", await cETH.borrowRatePerBlock());
    console.log(
      await web3.eth.getBlockNumber(),
      await cETH.totalReserves(),
      await cETH.exchangeRateCurrent.call(),
      await cETH.totalBorrowsCurrent.call()
    );

    const beforeTotalBorrowCurrent = await cETH.totalBorrowsCurrent.call();

    await comptroller.fastForward(1000);

    //await mineBlock()
    retVal = await cETH.accrueInterest.call();
    console.log(retVal);
    await cETH.accrueInterest();
    console.log("borrow rate", await cETH.borrowRatePerBlock());
    console.log(
      await web3.eth.getBlockNumber(),
      await cETH.totalReserves(),
      await cETH.exchangeRateCurrent.call(),
      await cETH.totalBorrowsCurrent.call()
    );

    const afterTotalBorrowCurrent = await cETH.totalBorrowsCurrent.call();

    expect(afterTotalBorrowCurrent).to.bignumber.gt(beforeTotalBorrowCurrent);

    const afterBalOfUnderlaying = await cZRX.balanceOfUnderlying.call(minter);
    expect(afterBalOfUnderlaying).to.bignumber.gt(beforeBalOfUnderlaying);
    // console.log("cZRX balanceOfUnderlaying" + afterBalOfUnderlaying);
  });
});
