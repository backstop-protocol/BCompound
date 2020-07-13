const bre = require("@nomiclabs/buidler");

var Comptroller = artifacts.require("ComptrollerScenarioG1");

const fs = require("fs");
const rawdata = fs.readFileSync(
  "./compound-protocol/networks/development.json"
);
const dev_json = JSON.parse(rawdata);

async function main() {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  //   await bre.run("compile");

  // Compound finance Contracts
  // ===========================
  const comptroller_addr = dev_json.Contracts.Comptroller;
  const comptroller = await Comptroller.at(comptroller_addr);

  // BProtocol contracts
  // ====================
  const Pool = await ethers.getContractFactory("Pool");
  const BComptroller = await ethers.getContractFactory("BComptroller");
  const BToken = await ethers.getContractFactory("BToken");
  const AvatarFactory = await ethers.getContractFactory("AvatarFactory");

  const pool = await Pool.deploy();
  const bComptroller = await BComptroller.deploy();
  const bToken = await BToken.deploy();
  const avatarFactory = await AvatarFactory.deploy(
    pool.address,
    bToken.address,
    bComptroller.address,
    comptroller.address
  );

  await pool.deployed();
  await bComptroller.deployed();
  await bToken.deployed();
  await avatarFactory.deployed();

  console.log("Compound finance Contracts:::::");
  console.log("===============================");
  console.log("Comptroller:" + comptroller.address);

  console.log("BProtocol Contracts:::::");
  console.log("========================");
  console.log("Pool deployed to:", pool.address);
  console.log("BComptroller deployed to:", bComptroller.address);
  console.log("BToken deployed to:", bToken.address);
  console.log("AvatarFactory deployed to:", avatarFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
