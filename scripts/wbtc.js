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
const Migrate = artifacts.require("Migrate");
const Governance = artifacts.require("GovernanceExecutor");
const GovAlpha = artifacts.require("GovernorAlpha");
//const FakeBComptroller = artifacts.require("FakeBComptroller");

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

async function listWBTC2() {
  const govAlpha = await GovAlpha.at("0xc0dA01a04C3f3E0be433606045bB7017A7323E38");
  console.log(await govAlpha.proposals(0x29))
  let prop = await govAlpha.proposals(0x29)
  console.log(prop.eta)
  if(prop.eta.toString(10) === "0") {
    console.log("advancing blocks, and que")
    const currBlock = Number(await web3.eth.getBlockNumber())
    const endBlock = Number(prop.endBlock.toString(10))
    for(let i = 0 ; i < (10 + endBlock - currBlock) ; i++) {
      await ethers.provider.send("evm_mine")
      //console.log(await web3.eth.getBlockNumber())
    }
  
    console.log("queue")
    await govAlpha.queue(0x29)  
  }
  console.log(await govAlpha.proposals(0x29))

  if(! prop.executed) {
    await ethers.provider.send("evm_increaseTime", [48*60*60 + 100])

    console.log("execute")
    await govAlpha.execute(0x29)
    console.log(await govAlpha.proposals(0x29))
  }
  

  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  console.log(await comptroller.getAllMarkets())

  const wbtc2Address = "0xccF4429DB6322D5C611ee964527D42E5d685DD6a";

  const bComptroller = await BComptroller.at("0x9db10b9429989cc13408d7368644d4a1cb704ea3")
  if(await bComptroller.c2b(wbtc2Address) === "0x0000000000000000000000000000000000000000") {
    console.log("listing new btoken")
    // await bComptroller.newBToken(wbtc2Address)
  }
}


async function realMainnet() {
  const deployer1 = "0xD76997685d14121f410443f894D5dBe9Ce5f59eC";
  const deployer2 = "0x23cBF6d1b738423365c6930F075Ed6feEF7d14f3"; // registry owner
  const owner = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"; // registry owner

  await debugUserInfo();
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [deployer1]}
  );

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [deployer2]}
  );  

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [owner]}
  );  

  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  const me2 = accounts[2].address;

  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const bComptroller = await BComptroller.at("0x9db10b9429989cc13408d7368644d4a1cb704ea3");  
  const registry = await Registry.at("0xbf698df5591caf546a7e087f5806e216afed666a");
  const bScore = await BScore.at("0x42575dc0c55a476a966dd8358416e82853b67070");
  const jarConnector = await JarConnector.at("0xd24e557762589124d7cfef90d870df17c25bff8a");
  const userInfo = await UserInfo.at("0x907403da04eb05efd47eb0ba0c7a7d00d4f233ea");
  const jar = await Jar.at("0xb493d1b6048b801747d72f755b6efbfa1b4c6103");
  const sugarDaddy = "0x35fFd6E268610E764fF6944d07760D0EFe5E40E5";
  const importContract = await Import.at("0x035cccb015a826b754529b4d04587182b8210344");
  const flashImport = await FlashLoanImport.at("0xa5c48ef0301437bb2f5afdda8aedbe817f5e11d6");

  console.log("getting bETH address");
  const cETH =  await BEther.at("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5")
  const bETH =  await BEther.at(await bComptroller.c2b.call(cETH.address));
  const cBAT =  await BErc20.at("0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e");
  const bBAT =  await BErc20.at(await bComptroller.c2b.call(cBAT.address));
  const cComp = await BErc20.at("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4");
  const bComp = await BErc20.at(await bComptroller.c2b.call(cComp.address));
  const cDAI =  await BErc20.at("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643");
  const bDAI =  await BErc20.at(await bComptroller.c2b.call(cDAI.address));
  const cUNI =  await BErc20.at("0x35a18000230da775cac24873d00ff85bccded550");
  const bUNI =  await BErc20.at(await bComptroller.c2b.call(cUNI.address));
  const cUSDC = await BErc20.at("0x39aa39c021dfbae8fac545936693ac917d5e7563");
  const bUSDC = await BErc20.at(await bComptroller.c2b.call(cUSDC.address));
  const cUSDT = await BErc20.at("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9");
  const bUSDT = await BErc20.at(await bComptroller.c2b.call(cUSDT.address));
  const cWBTC = await BErc20.at("0xc11b1268c1a384e55c48c2391d8d480264a3a7f4");
  const bWBTC = await BErc20.at(await bComptroller.c2b.call(cWBTC.address));
  const cZRX =  await BErc20.at("0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407");
  const bZRX =  await BErc20.at(await bComptroller.c2b.call(cZRX.address));

  console.log("miniting bETH");
  await bETH.mint({from: me, value: web3.utils.toWei("1000"), gasLimit : 7000000, gasPrice:100e9});
  console.log(await bETH.balanceOf.call(me));
  console.log("miniting cETH");
  await cETH.mint({from: me2, value: web3.utils.toWei("1000"), gasLimit : 7000000, gasPrice:100e9});
  console.log("entering market");
  await comptroller.enterMarkets([cETH.address, cBAT.address, cDAI.address], {from: me2, gasLimit : 7000000, gasPrice:100e9})
  console.log(await cETH.balanceOf.call(me2));

  
  console.log("borrowing bBAT");
  await bBAT.borrow(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  const batUnderlying = await bBAT.underlying();
  const BAT = await BErc20.at(batUnderlying);
  console.log("giving BAT allowance");
  await BAT.approve(bBAT.address, web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bBAT");
  await bBAT.mint(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bBAT.balanceOf.call(me));

  console.log("borrowing cBAT");
  await cBAT.borrow(web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("giving BAT allowance");
  await BAT.approve(cBAT.address, web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting cBAT");
  await cBAT.mint(web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log(await cBAT.balanceOf.call(me2));  
  /*
  console.log("borrowing bCOMP");
  await bComp.borrow(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});  */

  console.log("borrowing bDAI");
  await bDAI.borrow(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  const daiUnderlying = await bDAI.underlying();
  const DAI = await BErc20.at(daiUnderlying);
  console.log("giving DAI allowance");
  await DAI.approve(bDAI.address, web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bDAI");
  await bDAI.mint(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bDAI.balanceOf.call(me));

  console.log("borrowing cDAI");
  await cDAI.borrow(web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("giving DAI allowance");
  await DAI.approve(cDAI.address, web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting cDAI");
  await cDAI.mint(web3.utils.toWei("1"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log(await cDAI.balanceOf.call(me2));  
  
  console.log("borrowing bUNI");
  await bUNI.borrow(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  const uniUnderlying = await bUNI.underlying();
  const UNI = await BErc20.at(uniUnderlying);
  console.log("giving UNI allowance");
  await UNI.approve(bUNI.address, web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bUNI");
  await bUNI.mint(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bUNI.balanceOf.call(me));  

  console.log("borrowing bUSDC");
  await bUSDC.borrow("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});  
  const usdcUnderlying = await bUSDC.underlying();
  const USDC = await BErc20.at(usdcUnderlying);
  console.log("giving USDC allowance");
  await USDC.approve(bUSDC.address, "10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bUSDC");
  await bUSDC.mint("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bUSDC.balanceOf.call(me));  

  console.log("borrowing bUSDT");
  await bUSDT.borrow("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  const usdtUnderlying = await bUSDT.underlying();
  const USDT = await BErc20.at(usdtUnderlying);
  console.log("giving USDT allowance");
  await USDT.approve(bUSDT.address, "10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bUSDT");
  await bUSDT.mint("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bUSDT.balanceOf.call(me));

  console.log("borrowing bWBTC");
  await bWBTC.borrow("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  const wbtcUnderlying = await bWBTC.underlying();
  const WBTC = await BErc20.at(wbtcUnderlying);
  console.log("giving WBTC allowance");
  await WBTC.approve(bWBTC.address, "10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bWBTC");
  await bWBTC.mint("10000000", {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bWBTC.balanceOf.call(me));

  console.log("borrowing bZRX");
  await bZRX.borrow(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  const zrxUnderlying = await bZRX.underlying();
  const ZRX = await BErc20.at(zrxUnderlying);
  console.log("giving ZRX allowance");
  await ZRX.approve(bZRX.address, web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log("minting bZRX");
  await bZRX.mint(web3.utils.toWei("1"), {from: me, gasLimit : 7000000, gasPrice:100e9});
  console.log(await bZRX.balanceOf.call(me));


  console.log("importing me2");
  const avatar2Address = await registry.getAvatar.call(me2);
  console.log("give cETH allowance");
  await cETH.approve(avatar2Address, web3.utils.toWei("1000"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("give cDAI allowance");
  await cDAI.approve(avatar2Address, web3.utils.toWei("1000"), {from: me2, gasLimit : 7000000, gasPrice:100e9});
  console.log("give cBAT allowance");
  await cBAT.approve(avatar2Address, web3.utils.toWei("1000"), {from: me2, gasLimit : 7000000, gasPrice:100e9});

  console.log("encoding flash loan data")
  const flashImportData = flashImport.contract.methods.flashImport([cETH.address, cBAT.address, cDAI.address],
                                                                   [ETH, BAT.address, DAI.address],
                                                                   [cBAT.address, cDAI.address],
                                                                   [BAT.address, DAI.address],
                                                                   importContract.address,
                                                                   web3.utils.toWei("10000"),
                                                                   sugarDaddy).encodeABI();

  //console.log({flashImportData});
  console.log("doing import")                                                                   
  await registry.delegateAndExecuteOnce(importContract.address, flashImport.address, flashImportData, {from : me2, gasLimit: 10e6, gasPrice:100e9})
  console.log("bETH balance", await bETH.balanceOf.call(me2));
  console.log("bBAT balance", await bBAT.balanceOf.call(me2));
  console.log("bDAI balance", await bDAI.balanceOf.call(me2));

  console.log("bETH debt", await bETH.borrowBalanceCurrent.call(me2));
  console.log("bBAT debt", await bBAT.borrowBalanceCurrent.call(me2));
  console.log("bDAI debt", await bDAI.borrowBalanceCurrent.call(me2));  

  console.log("updating score index");
  await bScore.updateIndex([cETH.address, cBAT.address, cUNI.address, cDAI.address, cUSDC.address, cUSDT.address, cWBTC.address,
                            cZRX.address, cComp.address], {from : me2, gasLimit: 10e6, gasPrice:100e9});
  
  console.log("prinitng user info");
  console.log(await userInfo.getUserInfo.call(me, comptroller.address, bComptroller.address, registry.address, sugarDaddy, jarConnector.address, jar.address, true));
}

async function debugUserInfo() {
  console.log("listing wbtc2")
  await listWBTC2()
  console.log("wbtc2 is listed")
  
  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  //const me2 = accounts[2].address;

  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const bComptroller = await BComptroller.at("0x9db10b9429989cc13408d7368644d4a1cb704ea3");  
  const registry = await Registry.at("0xbf698df5591caf546a7e087f5806e216afed666a");
  const bScore = await BScore.at("0x42575dc0c55a476a966dd8358416e82853b67070");
  const jarConnector = await JarConnector.at("0xd24e557762589124d7cfef90d870df17c25bff8a");
  const userInfo = await UserInfo.at("0x907403da04eb05efd47eb0ba0c7a7d00d4f233ea");
  const jar = await Jar.at("0xb493d1b6048b801747d72f755b6efbfa1b4c6103");
  const sugarDaddy = "0x35fFd6E268610E764fF6944d07760D0EFe5E40E5";
  const importContract = await Import.at("0x035cccb015a826b754529b4d04587182b8210344");
  const flashImport = await FlashLoanImport.at("0xa5c48ef0301437bb2f5afdda8aedbe817f5e11d6");

  const cTokens =
  [
    "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e", // bat
    "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", // comp
    "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", // dai
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", // eth
    "0x35a18000230da775cac24873d00ff85bccded550", // uni
    "0x39aa39c021dfbae8fac545936693ac917d5e7563", // usdc
    "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", // usdt
    "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4", // wbtc
    "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407", // zrx
    "0xccF4429DB6322D5C611ee964527D42E5d685DD6a" // wbtc2
  ]

  const bTokens = []
  const underlying = []
  
  for(const ct of cTokens) {

    const token = await BErc20.at(ct);
    console.log(await token.symbol());
    console.log(await token.decimals());
    if(ct !== "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5") {
      console.log(await token.underlying());
      underlying.push(await token.underlying());

      const under = await BErc20.at(await token.underlying());
      console.log(await under.balanceOf.call(me));
      console.log(await under.allowance.call(me, me));      
    }
    else underlying.push(ETH);
    console.log(await token.exchangeRateCurrent.call());
    console.log(await token.borrowRatePerBlock.call());
    console.log(await token.supplyRatePerBlock.call());
    console.log(await token.balanceOf.call(me));
    console.log(await token.borrowBalanceCurrent.call(me));
    console.log(await comptroller.markets(ct));        
    const bT =  await BErc20.at(await bComptroller.c2b.call(token.address));
    bTokens.push(bT.address);
    if(ct !== "0xccF4429DB6322D5C611ee964527D42E5d685DD6a"){
      console.log(await bT.totalSupply())
    }

    if(ct !== "0xccF4429DB6322D5C611ee964527D42E5d685DD6a") {
      console.log("getting score");
      console.log("debt");
      await bScore.getDebtScore(me, ct, 1614505062);
      console.log("coll");
      await bScore.getCollScore(me, ct, 1614505062);
      console.log("global debt");
      await bScore.getDebtGlobalScore(ct, 1614505062);
      console.log("global coll");   
      await bScore.getCollGlobalScore(ct, 1614505062);
    }
  }
  console.log("getting avatar");
  await registry.getAvatar(me, {from: me,gasLimit: 10e6, gasPrice:100e9 });
  const avatar = registry.getAvatar.call(me, {from: me,gasLimit: 10e6, gasPrice:100e9 });
  console.log("getting asset in");  
  const assetsIn = await comptroller.getAssetsIn.call(me);

  console.log("trying get token info");

  console.log(await userInfo.getTokenInfo.call(comptroller.address, bComptroller.address));
  console.log("trying per user ctoken info");
  console.log(await userInfo.getPerUserInfo.call(me,cTokens,cTokens,underlying));
  console.log("trying per user btoken info");
  console.log(await userInfo.getPerUserInfo.call(me,bTokens,cTokens,underlying));  
  console.log("trying import info");
  console.log(await userInfo.getImportInfo.call(me,cTokens,registry.address,sugarDaddy));
  console.log("trying getScoreInfo info");  
  console.log(await userInfo.getScoreInfo.call(me,jarConnector.address));  
  console.log("trying claim comp info");  
  console.log(await userInfo.getCompTokenInfo.call(me,comptroller.address, registry.address));
  console.log("trying jar info");  
  console.log(await userInfo.getJarInfo.call(jar.address,cTokens));
  console.log("trying tvl info");  
  //console.log(await userInfo.getTvlInfo.call(cTokens, registry.address));        
  console.log("trying all user info");
  console.log(await userInfo.getUserInfo.call(me, comptroller.address, bComptroller.address, registry.address, sugarDaddy, jarConnector.address, jar.address, false));  
  return;
  const newUserInfo = await UserInfo.new({from : me, gasLimit: 10e6, gasPrice:100e9});
  console.log("ttt", newUserInfo.address);
  console.log(await newUserInfo.getUserInfo.call(me, comptroller.address, bComptroller.address, registry.address, sugarDaddy, jarConnector.address, jar.address, false));
}
async function mainnetReadShort() {
  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  //const me2 = accounts[2].address;

  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const bComptroller = await BComptroller.at("0x9db10b9429989cc13408d7368644d4a1cb704ea3");  
  const registry = await Registry.at("0xbf698df5591caf546a7e087f5806e216afed666a");
  const bScore = await BScore.at("0x42575dc0c55a476a966dd8358416e82853b67070");
  const jarConnector = await JarConnector.at("0xd24e557762589124d7cfef90d870df17c25bff8a");
  const userInfo = await UserInfo.at("0x907403da04eb05efd47eb0ba0c7a7d00d4f233ea");
  const jar = await Jar.at("0xb493d1b6048b801747d72f755b6efbfa1b4c6103");
  const sugarDaddy = "0x35fFd6E268610E764fF6944d07760D0EFe5E40E5";
  const importContract = await Import.at("0x035cccb015a826b754529b4d04587182b8210344");
  const flashImport = await FlashLoanImport.at("0xa5c48ef0301437bb2f5afdda8aedbe817f5e11d6");

  const cTokens =
  [
    "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e", // bat
    "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", // comp
    "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", // dai
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", // eth
    "0x35a18000230da775cac24873d00ff85bccded550", // uni
    "0x39aa39c021dfbae8fac545936693ac917d5e7563", // usdc
    "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", // usdt
    "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4", // wbtc
    "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" // zrx
  ]

  const bTokens = []
  const underlying = []
  
  
  const newUserInfo = await UserInfo.new({from : me, gasLimit: 10e6, gasPrice:100e9});
  console.log("ttt");
  console.log(await newUserInfo.getUserInfo.call(me, comptroller.address, bComptroller.address, registry.address, sugarDaddy, jarConnector.address, jar.address, false));    
}
async function mainnetRead() {

  const deployer1 = "0xD76997685d14121f410443f894D5dBe9Ce5f59eC";
  const deployer2 = "0x23cBF6d1b738423365c6930F075Ed6feEF7d14f3";
  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  //const me2 = accounts[2].address;

  const comptroller = await Comptroller.at("0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b");
  const bComptroller = await BComptroller.at("0x9db10b9429989cc13408d7368644d4a1cb704ea3");  
  const registry = await Registry.at("0xbf698df5591caf546a7e087f5806e216afed666a");
  const bScore = await BScore.at("0x42575dc0c55a476a966dd8358416e82853b67070");
  const jarConnector = await JarConnector.at("0xd24e557762589124d7cfef90d870df17c25bff8a");
  const userInfo = await UserInfo.new(); //await UserInfo.at("0x907403da04eb05efd47eb0ba0c7a7d00d4f233ea");
  const jar = await Jar.at("0xb493d1b6048b801747d72f755b6efbfa1b4c6103");
  const sugarDaddy = "0x35fFd6E268610E764fF6944d07760D0EFe5E40E5";
  const importContract = await Import.at("0x035cccb015a826b754529b4d04587182b8210344");
  const flashImport = await FlashLoanImport.at("0xa5c48ef0301437bb2f5afdda8aedbe817f5e11d6");

  const cTokens =
  [
    "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e", // bat
    "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", // comp
    "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", // dai
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", // eth
    "0x35a18000230da775cac24873d00ff85bccded550", // uni
    "0x39aa39c021dfbae8fac545936693ac917d5e7563", // usdc
    "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", // usdt
    "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4", // wbtc
    "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" // zrx
  ]  

  //console.log(await userInfo.getTokenInfo.call(comptroller.address, bComptroller.address));
  //console.log(await userInfo.getImportInfo.call(jarConnector.address, ctokens, registry.address, sugarDaddy));
  console.log(await registry.avatarLength());
  console.log(await userInfo.getTvlInfo.call(cTokens, registry.address));
  console.log(await userInfo.getUserInfo.call(me, comptroller.address, bComptroller.address, registry.address, sugarDaddy, jarConnector.address, jar.address, true));
}

/*
getUserInfo(address user,
  address comptroller,
  address bComptroller,
  address registry,
  address sugarDaddy,
  address jarConnector,
  address jar,
  bool    getTvl)*/

async function main() {
  const accounts = await ethers.getSigners();
  const me = accounts[0].address;
  console.log({me});

  const registryAddress = "0xbf698df5591caf546a7e087f5806e216afed666a";
  const bcomptrollerAddress = "0x9db10b9429989cc13408d7368644d4a1cb704ea3";
  const startTime = 1614434699;
  const endTime = 1619288423;
  const endJarTime = 1619467200;
  const jarConnectorAddress = "0xd24e557762589124d7cfef90d870df17c25bff8a";
  const govAddress = "0x8f95c99d8f2d03729c1300e59fc38299d831a7f7";
  const jarAddress = "0xb493d1b6048b801747d72f755b6efbfa1b4c6103";

  const pool = await Pool.new(jarAddress,{from:me, gasLimit : 7000000, gasPrice:100e9});
  return;
  const mig = await Migrate.new(jarConnectorAddress, registryAddress,govAddress,{from:me, gasLimit : 7000000, gasPrice:100e9})
  //const gov = await Governance.new(registryAddress,2*24*60*60,{from:me, gasLimit : 7000000, gasPrice:100e9});
  return;
  const cTokens =
  [
    "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e", // bat
    "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", // comp
    "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", // dai
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", // eth
    "0x35a18000230da775cac24873d00ff85bccded550", // uni
    "0x39aa39c021dfbae8fac545936693ac917d5e7563", // usdc
    "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", // usdt
    "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4", // wbtc
    "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" // zrx
  ]

  const sMul = [1,1,1,1,1,1,1,1,1]
  const bMul = sMul;



  return;
/*
  //const comptroller = await Comptroller.at("0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B");  
  //const bComptroller = await BComptroller.new("0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B", {from:me, gasLimit : 7000000, gasPrice:100e9});

  const registry = await Registry.new("0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
    "0xc00e94cb662c3520282e6f5717214004a7f26888",
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    "0x0000000000000000000000000000000000000000",
    "0x9db10b9429989cc13408d7368644d4a1cb704ea3",
    "0x0000000000000000000000000000000000000000", // comp voter - dummy
    "0xf29d869ee7ebe30fde045d26a9146654c392eaca", {from:me, gasLimit : 7000000});  

  return;

  const userInfo = await UserInfo.new({from:me, gasLimit : 7000000, gasPrice:100e9})
  console.log("info",userInfo.address)

  return;

  const gov = await Governance.new(ETH,7,{from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("gov", gov.address)
  return

  const mig = await Migrate.new(ETH,ETH,ETH,{from:me, gasLimit : 7000000, gasPrice:100e9})
  console.log("migration", mig.address);

  return;
  */
/*
  console.log("deploying user info");
  //const userInfo = await UserInfo.new({from:me, gasLimit : 7000000, gasPrice:100e9})
  //const fakeBComptroller = await FakeBComptroller.new({from:me, gasLimit : 7000000, gasPrice:100e9});

  // Compound finance Contracts
  // ===========================

  const cETHAddress = "0x41b5844f4680a8c38fbb695b7f9cfd1f64474a72";
  const cDAIAddress = "0xf0d0eb522cfa50b716b3b1604c4f0fa6f04376ad";
  const compAddress = "0x61460874a7196d6a22d1ee4922473664b3e95270";
  
  const cTokens = ["0x4a77faee9650b09849ff459ea1476eab01606c7a"];
  
  //const cTokens = [cETHAddress, cDAIAddress]
  const sMul = [1];
  const bMul = [1];

  const poolAddress = "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b"; // TODO put real address

  const bComptroller = await BComptroller.new(comptroller.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("bComptroller", bComptroller.address)  
  const avatar = await Avatar.new({from:me, gasLimit : 7000000, gasPrice:100e9});

  console.log("avatar", avatar.address)

  const registry = await Registry.new(comptroller.address,
                                      compAddress,
                                      cETHAddress,
                                      poolAddress,
                                      bComptroller.address,
                                      poolAddress, // comp voter - dummy
                                      avatar.address, {from:me, gasLimit : 7000000});

  console.log("registry", registry.address);
                                      
  await bComptroller.setRegistry(registry.address, {from:me, gasLimit : 7000000});

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

  const start = Math.floor(new Date().getTime() / 1000);
  const end = start + 60 * 24 * 60 * 60;
  console.log("deploying score");
  const score = await BScore.new(registry.address, start, end, cTokens, sMul, bMul, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log(score.address);
  console.log("deploying jarConnector");  
  const jarConnector = await JarConnector.new(cTokens, score.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("jar connector", jarConnector.address);  
  console.log("deploying jar");
  const jar = await Jar.new(end, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("jar", jar.address);    
  await jar.setConnector(jarConnector.address, {from:me, gasLimit : 7000000, gasPrice:100e9});

  await registry.setScore(score.address, {from:me, gasLimit : 7000000, gasPrice:100e9});  

  const importContract = await Import.new(registry.address, bComptroller.address, {from:me, gasLimit : 7000000, gasPrice:100e9});
  console.log("importContract", importContract.address);  
  console.log(jarConnector.address);  
  const flashImport = await FlashLoanImport.new({from:me, gasLimit : 5000000, gasPrice:100e9});
  console.log("flashImport", flashImport.address);  
  return;
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
debugUserInfo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


  // Account #0: 0x750a86c18d612a20190a5dbbf487902998526921 (100000000000000 ETH)
  // Private Key: 0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199333