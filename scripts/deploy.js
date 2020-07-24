const bre = require("@nomiclabs/buidler");

const Comptroller = artifacts.require("ComptrollerScenarioG1");
const Registry = artifacts.require("Registry");
const Pool = artifacts.require("Pool");
const BComptroller = artifacts.require("BComptroller");
const BToken = artifacts.require("BToken");

const fs = require("fs");
const rawdata = fs.readFileSync(
  "./compound-protocol/networks/development.json"
);
const dev_json = JSON.parse(rawdata);

async function main() {
  // Compound finance Contracts
  // ===========================
  const comptroller_addr = dev_json.Contracts.Comptroller;
  const comptroller = await Comptroller.at(comptroller_addr);

  const comp_addr = dev_json.Contracts.COMP;
  const cETH_addr = dev_json.Contracts.cETH;
  const priceOracle_addr = dev_json.Contracts.PriceOracle;

  // BProtocol contracts
  // ====================

  const pool = await Pool.new();
  const bComptroller = await BComptroller.new();

  const registry = await Registry.new(
    comptroller_addr,
    comp_addr,
    cETH_addr,
    priceOracle_addr,
    pool.address,
    bComptroller.address
  );

  await bComptroller.setRegistry(registry.address);

  console.log("Compound finance Contracts:::::");
  console.log("===============================");
  console.log("Comptroller:" + comptroller.address);
  console.log("");
  console.log("BProtocol Contracts:::::");
  console.log("========================");
  console.log("Pool deployed to:", pool.address);
  console.log("BComptroller deployed to:", bComptroller.address);
  console.log("Registry:", registry.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
