const Comptroller = artifacts.require("Comptroller");
const Registry = artifacts.require("Registry");
const Pool = artifacts.require("Pool");
const BComptroller = artifacts.require("BComptroller");
const Avatar = artifacts.require("Avatar");
const BScore = artifacts.require("BScore");
const JarConnector = artifacts.require("JarConnector");
const BEther = artifacts.require("BEther");
const BErc20 = artifacts.require("BErc20");
const Import = artifacts.require("Import");
const FlashLoanImport = artifacts.require("FlashLoanImport");
const FlashLoanStub = artifacts.require("FlashLoanStub");
const Jar = artifacts.require("CompoundJar");
const UserInfo = artifacts.require("UserInfo");
const FakeBComptroller = artifacts.require("FakeBComptroller");

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";


async function main() {
  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  console.log({me});

  console.log("deploying user info");
  const userInfo = await UserInfo.new({from:me, gasLimit : 7000000, gasPrice:100e9})
  const fakeBComptroller = await FakeBComptroller.new({from:me, gasLimit : 7000000, gasPrice:100e9});

  // Compound finance Contracts
  // ===========================
  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const cETHAddress = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5";
  const cDAIAddress = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643";
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
  
  //const cTokens = [cETHAddress, cDAIAddress]
  const sMul = [1,1,1,1,1,1,1,1,1];
  const bMul = [3,3,3,3,3,3,3,3,3];

  const poolAddress = "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b"; // TODO put real address

  const bComptroller = await BComptroller.new(comptroller.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  const avatar = await Avatar.new({from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log(avatar.address, "av");

  const registry = await Registry.new(comptroller.address,
                                      compAddress,
                                      cETHAddress,
                                      poolAddress,
                                      bComptroller.address,
                                      poolAddress, // comp voter - dummy
                                      avatar.address, {from:me, gasLimit : 7000000});

  console.log("my avatar", await registry.getAvatar.call("0x35fFd6E268610E764fF6944d07760D0EFe5E40E5"));
                                      
  await bComptroller.setRegistry(registry.address, {from:me, gasLimit : 7000000});
  const start = Math.floor(new Date().getTime() / 1000);
  const end = start + 60 * 24 * 60 * 60;
  console.log("deploying score");
  const score = await BScore.new(registry.address, start, end, cTokens, sMul, bMul, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("deploying jarConnector");  
  const jarConnector = await JarConnector.new(cTokens, score.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("deploying jar");
  const jar = await Jar.new(end, {from:me, gasLimit : 7000000, gasPrice:100e9});
  await jar.setConnector(jarConnector.address, {from:me, gasLimit : 7000000, gasPrice:100e9});

  await registry.setScore(score.address, {from:me, gasLimit : 7000000, gasPrice:100e9});

  const bTokens = [];
  const symbols = [];
  for(ctoken of cTokens) {
    await bComptroller.newBToken(ctoken, {from:me, gasLimit : 5000000, gasPrice:100e9});
    const bToken = await bComptroller.c2b(ctoken);
    const token = await BErc20.at(bToken);
    const symbol = await token.symbol();
    bTokens.push(bToken);
    symbols.push(symbol);
    console.log(bToken, symbol);
  }

  const importContract = await Import.new(registry.address, bComptroller.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  const flashImport = await FlashLoanImport.new({from:me, gasLimit : 5000000, gasPrice:100e9});
  const keeperPool = "0x35fFd6E268610E764fF6944d07760D0EFe5E40E5";

  await score.updateIndex(cTokens, {from: me, gasLimit:5e6, gasPrice:100e9});

  console.log("deployment ended");

  console.log("user info", userInfo.address);
  console.log("comptroller", comptroller.address);
  console.log("bcomptroller", bComptroller.address);
  console.log("fComptroller", fakeBComptroller.address);
  console.log("registry", registry.address);
  console.log("jar", jar.address);
  console.log("jar connector", jarConnector.address);
  console.log("import contract", importContract.address);
  console.log("flash import", flashImport.address);
  console.log("sugar daddy", keeperPool);
  console.log("ctokens", cTokens);
  console.log("symbols", symbols);
  console.log("btokens", bTokens);

  /*
  const xxx = await userInfo.getTokenInfo.call(comptroller.address, bComptroller.address);
  console.log({xxx});
  return;
/*
  await registry.getAvatar(me);
  const result1 = await userInfo.getImportInfo.call(me, cTokens, registry.address, keeperPool,{from:me, gasLimit : 9000000, gasPrice:100e9});
  console.log({result1});
  return;
*/
  const result = await userInfo.getUserInfo.call("0xc783df8a850f42e7f7e57013759c285caa701eb6", comptroller.address, bComptroller.address, registry.address, keeperPool, jarConnector.address, jar.address,
    {from:me, gasLimit : 5000000, gasPrice:100e9});
  console.log({result});
/*
  function getUserInfo(address user,
    address comptroller,
    address bComptroller,
    address registry,
    address sugarDaddy,
    address jarConnector,
    address jar)  
*/
  return;

  console.log("minting ETH on compound");
  const cETH = await BEther.at(cETHAddress);
  await cETH.mint({value: 1000000000000000000, from : me, gasLimit:1000000, gasPrice:100e9});
  const cETHBalnace = await cETH.balanceOf.call(me);

  console.log("entering market");
  await comptroller.enterMarkets([cETH.address], {from : me, gasLimit:1000000, gasPrice:100e9});

  console.log("borrowing DAI on compound");
  const cDAI = await BErc20.at(cDAIAddress);
  console.log(cDAI.address);
  await cDAI.borrow(web3.utils.toWei("10"), {from : me, gasLimit:1000000, gasPrice:100e9});

  console.log("getting avatar address");
  const myAvatar = await registry.getAvatar.call(me);
  console.log({myAvatar});

  console.log("give cETH allowance to avatar");
  await cETH.approve(myAvatar, cETHBalnace, {from : me, gasLimit:1000000, gasPrice:100e9});

  /*
  console.log("setting up flash loan stub");
  const stub = await FlashLoanStub.new({from : me, gasLimit:1000000});
  await stub.deposit({from : me, gasLimit:1000000, value:web3.utils.toWei("1")})*/

  const daiDebtBefore = await cDAI.borrowBalanceCurrent.call(me);

  console.log("encoding flash loan data")
  const flashImportData = flashImport.contract.methods.flashImport([cETH.address],
                                                                   [ETH],
                                                                   [cDAI.address],
                                                                   [DAI],
                                                                   importContract.address,
                                                                   web3.utils.toWei("10000"),
                                                                   keeperPool).encodeABI();

  console.log("doing import")                                                                   
  await registry.delegateAndExecuteOnce(importContract.address, flashImport.address, flashImportData, {from : me, gasLimit: 10e6, gasPrice:100e9})
  
  const bETHAddress = await bComptroller.c2b(cETH.address);
  const bETH = await BEther.at(bETHAddress);
  const bETHBalance = await bETH.balanceOf.call(me);
  console.log(bETHBalance, cETHBalnace);
  assert(bETHBalance.toString() === cETHBalnace.toString(), "import collateral failed");

  const bDAIAddress = await bComptroller.c2b(cDAI.address);
  const bDAI = await BErc20.at(bDAIAddress);
  const daiDebtAfter = await bDAI.borrowBalanceCurrent.call(me); 

  console.log(daiDebtBefore, daiDebtAfter, web3.utils.fromWei(daiDebtAfter.sub(daiDebtBefore)));
  assert(daiDebtBefore.add(new web3.utils.BN(1e11)).gt(daiDebtAfter.toString()), "debt collateral failed");  

  /*
  console.log("minting ETH");
  const bETHAddress = await bComptroller.c2b(cETHAddress);
  const bETH = await BEther.at(bETHAddress);
  await bETH.mint({value: 1000000000000000000});

  console.log("borrowing DAI");
  const bUSDC = await BErc20.at(await bComptroller.c2b("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"));
  console.log(bUSDC.address);
  await bUSDC.borrow(10000);*/
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
