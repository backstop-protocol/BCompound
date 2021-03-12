"use strict";
const json = require("../../playground/bcompound.json");

const { BN } = require("@openzeppelin/test-helpers");
const { exit } = require("shelljs");

// Constants
const ZERO = new BN(0);
const ONE_USD = new BN(10).pow(new BN(18));
const MIN_LIQUIDITY = ONE_USD.mul(new BN(10));

// Compound
const Comptroller = artifacts.require("Comptroller");
const Comp = artifacts.require("Comp");
const CErc20 = artifacts.require("CErc20");
const CEther = artifacts.require("CEther");
const ERC20Detailed = artifacts.require("ERC20Detailed");
const FakePriceOracle = artifacts.require("FakePriceOracle");

// BCompound
const BComptroller = artifacts.require("BComptroller");
const GovernanceExecutor = artifacts.require("GovernanceExecutor");
const CompoundJar = artifacts.require("CompoundJar");
const JarConnector = artifacts.require("JarConnector");
const Migrate = artifacts.require("Migrate");
const Pool = artifacts.require("Pool");
const Registry = artifacts.require("Registry");
const BScore = artifacts.require("BScore");
const BErc20 = artifacts.require("BErc20");
const BEther = artifacts.require("BEther");
const Avatar = artifacts.require("Avatar");
const LiquidatorInfo = artifacts.require("LiquidatorInfo");
const UserInfo = artifacts.require("UserInfo");

// variables
let pendingMap = new Map();

// TokenInfo
let tokenInfo;
let tokenInfoKeys = {
  btoken: "btoken",
  ctoken: "ctoken",
  ctokenDecimals: "ctokenDecimals",
  underlying: "underlying",
  underlyingDecimals: "underlyingDecimals",
  ctokenExchangeRate: "ctokenExchangeRate",
  underlyingPrice: "underlyingPrice",
  borrowRate: "borrowRate",
  supplyRate: "supplyRate",
  listed: "listed",
  collateralFactor: "collateralFactor",
  bTotalSupply: "bTotalSupply",
};

// Structs
let liquidationInfoKeys = { remainingLiquidationSize: "remainingLiquidationSize" };
let cushionInfoKeys = {
  hasCushion: "hasCushion",
  shouldTopup: "shouldTopup",
  shouldUntop: "shouldUntop",
  cushionCurrentToken: "cushionCurrentToken",
  cushionCurrentSize: "cushionCurrentSize",
  cushionPossibleTokens: "cushionPossibleTokens",
  cushionMaxSizes: "cushionMaxSizes",
};
let avatarInfoKeys = {
  user: "user",
  totalDebt: "totalDebt",
  totalCollateral: "totalCollateral",
  weightedCollateral: "weightedCollateral",
  debtTokens: "debtTokens",
  debtAmounts: "debtAmounts",
  collateralTokens: "collateralTokens",
  collateralAmounts: "collateralAmounts",
  weightedCollateralAmounts: "weightedCollateralAmounts",
};
let accountInfoKeys = {
  avatarInfo: "avatarInfo",
  cushionInfo: "cushionInfo",
  liquidationInfo: "liquidationInfo",
};

// Members
const MEMBER_1 = json.bcompound.MEMBER_1;
const MEMBER_2 = json.bcompound.MEMBER_2;
const MEMBER_3 = json.bcompound.MEMBER_3;
const MEMBER_4 = json.bcompound.MEMBER_4;

// Compound;
let comptroller;
let comp;
let oracle;

// BCompound
let bComptroller;
let registry;
let pool;
let liquidatorInfo;
let userInfo;

// ETH / ERC20
let cETH;
let bETH;

let ZRX;
let cZRX;
let bZRX;

module.exports = async function (callback) {
  console.log("starting bot...");

  try {
    await init();
    await validateBCompoundDeployment();
    await validateCompoundDeployment();

    await loadTokens();

    console.log("listening for blocks...");
    web3.eth.subscribe("newBlockHeaders", async (error, event) => {
      if (error) {
        console.log(error);
        exit(1);
      }

      console.log("Block: " + event.number + " Timestamp: " + event.timestamp);
      await processBlock();
    });
  } catch (error) {
    console.log(error);
  }
};

async function loadTokens() {
  console.log("Loading cTokens and bTokens...");
  const numMarkets = await userInfo.getNumMarkets.call(comptroller.address);
  console.log("Num of Markets: " + numMarkets);

  tokenInfo = await userInfo.getTokenInfo.call(comptroller.address, bComptroller.address);
  //console.log(tokenInfo[tokenInfoKeys.btoken]);
}

async function init() {
  try {
    web3.setProvider(new web3.providers.WebsocketProvider("ws://localhost:8545"));

    // NOTICE: Keeping these two contracs here so that we dont need to re-create snapshot
    // in case any changes are there in both of the contracts.
    // Deploy LiquidatorInfo
    liquidatorInfo = await LiquidatorInfo.new();
    console.log("LiquidatorInfo: " + liquidatorInfo.address);
    // Deploy UserInfo
    userInfo = await UserInfo.new();
    console.log("UserInfo: " + userInfo.address);
  } catch (error) {
    console.log(error);
  }
}

async function validateCompoundDeployment() {
  try {
    console.log("====================== Compound Contracts ======================");
    comptroller = await Comptroller.at(json.compound.Comptroller);
    console.log("Comptroller: " + comptroller.address);

    comp = await Comptroller.at(json.compound.Comp);
    console.log("Comp: " + comp.address);

    oracle = await FakePriceOracle.at(json.compound.PriceOracle);
    console.log("Oracle: " + oracle.address);

    // Tokens
    cETH = await CEther.at(json.compound.cETH);
    console.log("cETH: " + cETH.address);

    bETH = await BEther.at(await bComptroller.c2b(cETH.address));
    console.log("bETH: " + bETH.address);

    ZRX = await ERC20Detailed.at(json.compound.ZRX);
    console.log("ZRX: " + ZRX.address);

    cZRX = await CErc20.at(json.compound.cZRX);
    console.log("cZRX: " + cZRX.address);

    bZRX = await BErc20.at(await bComptroller.c2b(cZRX.address));
    console.log("bZRX: " + bZRX.address);
  } catch (error) {
    console.log(error);
  }
}

async function validateBCompoundDeployment() {
  try {
    console.log("====================== BCompound Contracts ======================");
    registry = await Registry.at(json.bcompound.Registry);
    console.log("Registry: " + registry.address);

    bComptroller = await BComptroller.at(json.bcompound.BComptroller);
    console.log("BComptroller: " + bComptroller.address);

    pool = await Pool.at(json.bcompound.Pool);
    console.log("Pool: " + pool.address);
  } catch (error) {
    console.log(error);
  }
}

async function processBlock() {
  try {
    // fetch all avatars
    // const numOfAvatars = await liquidatorInfo.getNumAvatars(pool.address);
    // console.log("avatar length: " + numOfAvatars);
    // const avatars = await registry.avatarList();
    // for (let i = 0; i < avatars.length; i++) {
    //   const avatar = avatars[i];

    //   // const bcompound = json.bcompound;
    //   // await liquidatorInfo.getCushionInfo.call(
    //   //   bcompound.Registry,
    //   //   bcompound.BComptroller,
    //   //   bcompound.Pool,
    //   //   tokenInfo[tokenInfoKeys.ctoken],
    //   //   tokenInfo[tokenInfoKeys.underlyingPrice],
    //   //   ZERO,
    //   //   ZERO,
    //   //   avatar,
    //   //   MEMBER_1,
    //   // );

    //   //const avatarInfo = await getAvatarInfo(avatar);
    //   //console.log(avatarInfo);

    //   // const liqInfo = await liquidatorInfo.getLiquidationInfo.call(avatar);
    //   // console.log(liqInfo[liquidationInfoKeys.remainingLiquidationSize].toString());

    //   // await processAvatar(avatar);
    // }

    // get all AccountInfo
    const numOfAvatars = await liquidatorInfo.getNumAvatars(pool.address);
    if (numOfAvatars.gt(ZERO)) {
      const startIndex = ZERO;
      const endIndex = numOfAvatars.sub(new BN(1));
      const cTokens = tokenInfo[tokenInfoKeys.ctoken];
      const priceFeeds = tokenInfo[tokenInfoKeys.underlyingPrice];
      const accountInfoArr = await liquidatorInfo.getInfo.call(
        startIndex,
        endIndex,
        MEMBER_1,
        pool.address,
        cTokens,
        priceFeeds,
      );
      console.log("AccountInfo fetched for accounts: " + accountInfoArr.length);
      for (let i = 0; i < accountInfoArr.length; i++) {
        if (!pendingMap.get(i)) {
          const accInfo = accountInfoArr[i];
          pendingMap.set(i, true);
          await processAccountInfo(accInfo);
          pendingMap.set(i, false);
        } else {
          console.log("skipping account: " + i);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

async function processAccountInfo(accInfo) {
  try {
    // get liquidity
    const avatarInfo = accInfo[accountInfoKeys.avatarInfo];
    const user = avatarInfo[avatarInfoKeys.user];
    const avatar = await registry.avatarOf(user);
    let liquidity;
    let shortFall;
    [liquidity, shortFall] = await getAccountLiquidity(user);

    console.log("liquidity: " + liquidity.toString());
    // If an avatar has low liquidity allow a member to topup
    if (liquidity.gt(ZERO) && liquidity.lt(MIN_LIQUIDITY)) {
      await updatePrice();
      // get liquidity again
      [liquidity, shortFall] = await getAccountLiquidity(user);
      // get accInfo again
      accInfo = await getSingleAccountInfo(avatar);
    }

    // If avatar can be liquidated after price update. Then member performs liquidation.
    if (shortFall.gt(ZERO)) {
      console.log("shortFall: " + shortFall.toString());
      const cushionInfo = accInfo[accountInfoKeys.cushionInfo];
      const shouldTopup = cushionInfo[cushionInfoKeys.shouldTopup];
      const hasCushion = cushionInfo[cushionInfoKeys.hasCushion];
      console.log("shouldTopup: " + shouldTopup);
      console.log("hasCushion: " + hasCushion);
      // not has cushion && shouldTopup
      if (!hasCushion && shouldTopup) {
        await memberDepositAndTopup(accInfo);
        await liquidate(accInfo);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

async function getSingleAccountInfo(avatar) {
  const bcompound = json.bcompound;
  return await liquidatorInfo.getSingleAccountInfo.call(
    bcompound.Pool,
    bcompound.Registry,
    bcompound.BComptroller,
    MEMBER_1,
    avatar,
    tokenInfo[tokenInfoKeys.ctoken],
    tokenInfo[tokenInfoKeys.underlyingPrice],
  );
}

async function getAccountLiquidity(user) {
  const accountLiquidity = await bComptroller.getAccountLiquidity(user);
  const liquidity = accountLiquidity["liquidity"];
  const shortFall = accountLiquidity["shortFall"];
  return [liquidity, shortFall];
}

async function updatePrice() {
  const ONE_ZRX_IN_USD_MAINNET = new BN("1605584000000000000"); // 18 decimal, ($1.6)
  const new_ONE_ZRX_IN_USD_MAINNET = ONE_ZRX_IN_USD_MAINNET.mul(new BN(105)).div(new BN(100));
  await oracle.setPrice(cZRX.address, new_ONE_ZRX_IN_USD_MAINNET);
  // load latest prices again
  await loadTokens();
}

async function memberDepositAndTopup(accInfo) {
  console.log("member depositing ...");
  const avatarInfo = accInfo[accountInfoKeys.avatarInfo];
  const user = avatarInfo[avatarInfoKeys.user];
  const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX.address);
  const minTopup = debtInfo["minTopup"];
  console.log("minTopup: " + minTopup.toString());
  await ZRX.approve(pool.address, minTopup, { from: MEMBER_1 });
  await pool.methods["deposit(address,uint256)"](ZRX.address, minTopup, {
    from: MEMBER_1,
  });

  // member topup
  console.log("member doing topup ...");
  await pool.topup(user, bZRX.address, minTopup, false, { from: MEMBER_1 });
}

async function liquidate(accInfo) {
  console.log("member liquidating ...");
  const avatarInfo = accInfo[accountInfoKeys.avatarInfo];
  const user = avatarInfo[avatarInfoKeys.user];
  const avatar_addr = await registry.avatarOf(user);
  const avatar = await Avatar.at(avatar_addr);
  // Check if an avatar has low liquidity and after price update

  // avatar will have short-fall and it can be liquidated
  // deposit & Liquidate
  const debtInfo = await pool.getDebtTopupInfo.call(user, bZRX.address);
  const minTopup = debtInfo["minTopup"];
  const maxLiquidationAmt = await avatar.getMaxLiquidationAmount.call(cZRX.address);
  const remainingBalToDeposit = maxLiquidationAmt.sub(minTopup);
  await ZRX.approve(pool.address, remainingBalToDeposit, { from: MEMBER_1 });
  await pool.methods["deposit(address,uint256)"](ZRX.address, remainingBalToDeposit, {
    from: MEMBER_1,
  });

  await pool.liquidateBorrow(user, bETH.address, bZRX.address, maxLiquidationAmt, {
    from: MEMBER_1,
  });
  console.log("member liquidated successfully.");
}

async function getAvatarInfo(
  avatar,
  ctoken = tokenInfo[tokenInfoKeys.ctoken],
  priceFeed = tokenInfo[tokenInfoKeys.underlyingPrice],
) {
  return await liquidatorInfo.getAvatarInfo.call(
    json.bcompound.Registry,
    json.bcompound.BComptroller,
    ctoken,
    priceFeed,
    avatar,
  );
}
