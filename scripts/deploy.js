const Comptroller = artifacts.require("Comptroller");
const Registry = artifacts.require("Registry");
const Pool = artifacts.require("Pool");
const BComptroller = artifacts.require("BComptroller");
const Avatar = artifacts.require("Avatar");
const BTokenScore = artifacts.require("BTokenScore");
const BEther = artifacts.require("BEther");
const BErc20 = artifacts.require("BErc20");
const Import = artifacts.require("Import");
const FlashLoanImport = artifacts.require("FlashLoanImport");

async function main() {
  const accounts = await ethers.getSigners();

  // Compound finance Contracts
  // ===========================
  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const cETHAddress = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5";
  const compAddress = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
  const cTokens = ["0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e",
                   "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4",
                   "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
                   "0x35a18000230da775cac24873d00ff85bccded550",
                   "0x39aa39c021dfbae8fac545936693ac917d5e7563",
                   "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
                   "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
                   "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407",
                   "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5"];

  const poolAddress = "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b"; // TODO put real address

  const bComptroller = await BComptroller.new(comptroller.address);
  const avatar = await Avatar.new();
  const score = await BTokenScore.new();
  const registry = await Registry.new(comptroller.address,
                                      compAddress,
                                      cETHAddress,
                                      poolAddress,
                                      bComptroller.address,
                                      score.address,
                                      poolAddress, // comp voter - dummy
                                      avatar.address);
  await bComptroller.setRegistry(registry.address);
  await score.setRegistry(registry.address);

  const importContract = await Import.new(registry.address, bComptroller.address);
  const flashImport = await FlashLoanImport.new();

  for(ctoken of cTokens) {
    await bComptroller.newBToken(ctoken);
    console.log(await bComptroller.c2b(ctoken));
  }

  console.log("minting ETH");
  const bETHAddress = await bComptroller.c2b(cETHAddress);
  const bETH = await BEther.at(bETHAddress);
  await bETH.mint({value: 1000000000000000000});

  console.log("borrowing DAI");
  const bUSDC = await BErc20.at(await bComptroller.c2b("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"));
  console.log(bUSDC.address);
  await bUSDC.borrow(10000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
