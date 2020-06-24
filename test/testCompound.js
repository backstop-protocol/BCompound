var compoundJSON = require("../compound-protocol/networks/development.json");

const COMP = artifacts.require("COMP");
const CErc20 = artifacts.require("CErc20");

contract("Validate Compound Deployment", (accounts) => {
  it("should get COMP token balance", async () => {
    // get COMP token balance
    const COMP_addr = compoundJSON.Contracts.COMP;
    const instance = await COMP.at(COMP_addr);
    const totalSupply = await instance.totalSupply();
    console.log(totalSupply.toString());
  });

  it("should mint cBAT", async () => {
    // const THOUSAND_TOKENS = new BN();
    // const cBAT_addr = compoundJSON.Contracts.cBAT;
    // const instance = await CErc20.at(cBAT_addr);
    // await instance.mint();
  });
});
