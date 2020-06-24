const COMP = artifacts.require("COMP");
const CErc20 = artifacts.require("CErc20");
const ERC20 = artifacts.require("ERC20");
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
    const instance = await COMP.at(COMP_addr);
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

    console.log("ACCOUNT\t\t\t\t\t\t\tcBAT\t\t\tcZRX");
    await Promise.all(
      accounts.map(async (account) => {
        const batBal = await BAT.balanceOf(account);
        const cBATbal = await cBAT.balanceOf(account);
        const cZRXbal = await cZRX.balanceOf(account);
        console.log(
          account +
            "\t" +
            batBal.toString() +
            "\t\t" +
            cBATbal.toString() +
            "\t\t\t" +
            cZRXbal.toString()
        );
      })
    );
  });

  it("should mint cBAT", async () => {
    const TEN_TOKENS_18 = new BN(10).mul(ONE_TOKEN_18);
    const BAT_addr = compoundJSON.Contracts.BAT;
    const BAT = await ERC20.at(BAT_addr);
    const cBAT_addr = compoundJSON.Contracts.cBAT;
    const cBAT = await CErc20.at(cBAT_addr);
    await BAT.approve(cBAT_addr, TEN_TOKENS_18, { from: accounts[3] });
    await cBAT.mint(TEN_TOKENS_18, { from: accounts[3] });
  });
});
