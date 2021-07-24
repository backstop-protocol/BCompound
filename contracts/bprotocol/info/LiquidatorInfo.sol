pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import { Registry } from "./../Registry.sol";
import { BComptroller } from "./../BComptroller.sol";
import { CTokenInterface } from "./../interfaces/CTokenInterfaces.sol";
import { IBToken } from "./../interfaces/IBToken.sol";
import { ICushion } from "./../interfaces/IAvatar.sol";
import { IComptroller } from "./../interfaces/IComptroller.sol";
import { IUniswapAnchoredView } from "./../interfaces/IUniswapAnchoredView.sol";
import { Pool } from "./../Pool.sol";

contract LiquidatorInfo {
    address constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    struct AvatarInfo {
        address user;

        uint totalDebt; // total debt according to price feed
        uint totalCollateral; // total collateral according to price feed
        uint weightedCollateral; // collateral x collateral factor. liquidation when weightedCollateral < totalDebt

        address[] debtTokens;
        uint[] debtAmounts;

        address[] collateralTokens;
        uint[] collateralAmounts;
        uint[] weightedCollateralAmounts;
    }

    struct CushionInfo {
        bool hasCushion;
        bool shouldTopup;
        bool shouldUntop;

        address cushionCurrentToken;
        uint cushionCurrentSize;
        uint cushionTokenTotalDebt;

        address[] cushionPossibleTokens; // which tokens could be used for cushion
        uint[] cushionMaxSizes;
    }

    struct LiquidationInfo {
        // only relevant if there is a cushion. we assume only one liquidator
        uint remainingLiquidationSize;
        uint memberLiquidationIncentive;
    }

    struct AccountInfo {
        AvatarInfo avatarInfo;
        CushionInfo cushionInfo;
        LiquidationInfo liquidationInfo;
        uint blockNumber;
    }

    struct CToken2BToken {
        address[] cTokens;
        address[] bTokens;
    }

    struct CurrentPrices {
        uint[] currPrices;
        address[] ctokens;
    }

    struct Info {
        AccountInfo[] accountInfo;
        CToken2BToken c2bMapping;
        CurrentPrices currPrices;
        uint numAvatars;
    }

    function getCTokenToBTokenList(BComptroller bComptroller) 
        public
        view
        returns (CToken2BToken memory info)
    {
        info.cTokens = bComptroller.getAllMarkets();
        info.bTokens = new address[](info.cTokens.length);

        for(uint i = 0; i < info.cTokens.length; i++) {
            info.bTokens[i] = bComptroller.c2b(info.cTokens[i]);
        }
    }

    function getCurrentPrices(IUniswapAnchoredView oracle, address[] memory ctokens)
        public
        view
        returns (CurrentPrices memory info)
    {
        info.currPrices = new uint[](ctokens.length);
        info.ctokens = ctokens;

        for(uint i = 0 ; i < ctokens.length ; i++) {
            info.currPrices[i] = oracle.getUnderlyingPrice(ctokens[i]);
        }
    }

    function isIn(address[] memory array, address elm) internal pure returns(bool) {
        for(uint i = 0 ; i < array.length ; i++) {
            if(elm == array[i]) return true;
        }

        return false;
    }

    function getAvatarInfo(
        Registry registry,
        BComptroller bComptroller,
        address[] memory cTokens,
        uint[] memory priceFeed,
        address avatar
    ) 
        public
        returns(AvatarInfo memory info) 
    {
        require(cTokens.length == priceFeed.length, "cTokens-priceFeed-missmatch");

        uint numTokens = cTokens.length;
        address user = registry.ownerOf(avatar);

        info.user = user;
        info.debtTokens = new address[](numTokens);
        info.debtAmounts = new uint[](numTokens);
        info.collateralTokens = new address[](numTokens);
        info.collateralAmounts = new uint[](numTokens);
        info.weightedCollateralAmounts = new uint[](numTokens);

        IComptroller comptroller = bComptroller.comptroller();
        address[] memory assetsIn = comptroller.getAssetsIn(avatar);

        for(uint i = 0 ; i < numTokens ; i++) {
            if(registry.cEther() == cTokens[i]) 
                info.debtTokens[i] = ETH;
            else 
                info.debtTokens[i] = address(CTokenInterface(cTokens[i]).underlying());

            address bToken = bComptroller.c2b(cTokens[i]);
            info.debtAmounts[i] = IBToken(bToken).borrowBalanceCurrent(user);

            info.collateralTokens[i] = cTokens[i];
            info.collateralAmounts[i] = IBToken(bToken).balanceOfUnderlying(user);
            if(! isIn(assetsIn, cTokens[i])) info.collateralAmounts[i] = 0; 
            // set as 0 if not in market
            // CR = collateralRatio = collateralFactorMantissa
            (,uint CR) = comptroller.markets(cTokens[i]);
            info.weightedCollateralAmounts[i] = info.collateralAmounts[i] * CR / 1e18;

            info.totalDebt += info.debtAmounts[i] * priceFeed[i] / 1e18;
            info.totalCollateral += info.collateralAmounts[i] * priceFeed[i] / 1e18;
            info.weightedCollateral += info.weightedCollateralAmounts[i] * priceFeed[i] / 1e18;
        }
    }

    function cTokenToUnderlying(Registry registry, address cToken) internal view returns(address) {
        if(registry.cEther() == cToken) 
            return ETH; 
        else 
            return address(CTokenInterface(cToken).underlying());
    }

    function getCushionInfo(
        Registry registry,
        BComptroller bComptroller,
        Pool pool,
        address[] memory cTokens,
        uint[] memory priceFeed,
        uint debtAmount,
        uint weightedCollateral,
        address avatar,
        address me
    ) 
        public
        returns(CushionInfo memory info) 
    {
        address user = registry.ownerOf(avatar);
        info.hasCushion = ICushion(avatar).toppedUpAmount() > 0;
        (, uint amountTopped,) = pool.getMemberTopupInfo(user, me);

        if(debtAmount > weightedCollateral) {
            // assume there is only one member
            info.shouldTopup = true;
        }
        info.shouldUntop = (!info.hasCushion && amountTopped > 0);

        if(amountTopped > 0) {
            (,address toppedCToken) = pool.topped(avatar);
            info.cushionCurrentToken = cTokenToUnderlying(registry, toppedCToken);
            info.cushionCurrentSize = amountTopped;
        }

        info.cushionPossibleTokens = new address[](cTokens.length);
        info.cushionMaxSizes = new uint[](cTokens.length);        
        for(uint i = 0 ; i < cTokens.length ; i++) {
            uint debt = IBToken(bComptroller.c2b(cTokens[i])).borrowBalanceCurrent(user);
            uint debtUsd = debt * priceFeed[i] / 1e18;
            if(amountTopped > 0 && info.hasCushion) {
                if(info.cushionCurrentToken != cTokenToUnderlying(registry, cTokens[i])) continue;
                info.cushionTokenTotalDebt = debt;
                debt -= amountTopped;
            }

            info.cushionPossibleTokens[i] = cTokenToUnderlying(registry, cTokens[i]);
            info.cushionMaxSizes[i] = debt;

            if(debtAmount > weightedCollateral) {
                // not enough debt to topup
                if(debtUsd < (debtAmount - weightedCollateral)) info.cushionMaxSizes[i] = 0;
            }
        }
    }

    function getLiquidationInfo(Pool pool, address avatar) public returns(LiquidationInfo memory info) {
        info.remainingLiquidationSize = ICushion(avatar).remainingLiquidationAmount();
        Registry registry = Registry(address(pool.registry()));
        IComptroller comptroller = IComptroller(registry.comptroller());
        info.memberLiquidationIncentive = 
            comptroller.liquidationIncentiveMantissa() * pool.shareNumerator() / pool.shareDenominator();
    }

    function getSingleAccountInfo(
        Pool pool,
        Registry registry,
        BComptroller bComptroller, 
        address me,
        address avatar,
        address[] memory cTokens,
        uint[] memory priceFeed,
        IUniswapAnchoredView oracle
    )
        public
        returns(AccountInfo memory info) 
    {

        info.avatarInfo = getAvatarInfo(registry, bComptroller, cTokens, priceFeed, avatar);
        info.cushionInfo = getCushionInfo(
            registry,
            bComptroller,
            pool,
            cTokens,
            priceFeed,
            info.avatarInfo.totalDebt,
            info.avatarInfo.weightedCollateral,
            avatar,
            me
        );
        info.liquidationInfo = getLiquidationInfo(pool, avatar);
        info.blockNumber = block.number;

        CurrentPrices memory realPrices = getCurrentPrices(oracle, cTokens);
        AvatarInfo memory realAvatarInfo = getAvatarInfo(registry, bComptroller, cTokens, realPrices.currPrices, avatar);

        if(realAvatarInfo.totalDebt > realAvatarInfo.weightedCollateral) {
            if(info.liquidationInfo.remainingLiquidationSize == 0) {
                info.liquidationInfo.remainingLiquidationSize = info.cushionInfo.cushionTokenTotalDebt / 2;
            }
        }
    }

    function getInfo(
        uint startAccount,
        uint endAccount,
        address me,
        Pool pool,
        address[] memory cTokens,
        uint[] memory priceFeed,
        string[] memory /* symbols */ // this is obselete now
    )
        public
        returns(Info memory info) 
    {
        info.accountInfo = new AccountInfo[](endAccount + 1 - startAccount);

        Registry registry = Registry(address(pool.registry()));
        BComptroller bComptroller = BComptroller(address(pool.bComptroller()));

        IUniswapAnchoredView oracle = IUniswapAnchoredView(IComptroller(BComptroller(bComptroller).comptroller()).oracle());

        for(uint i = 0 ; i + startAccount <= endAccount ; i++) {
            uint accountNumber = i + startAccount;
            address avatar = registry.avatars(accountNumber);
            info.accountInfo[i] = getSingleAccountInfo(pool, registry, bComptroller, me, avatar, cTokens, priceFeed, oracle);
        }

        info.c2bMapping = getCTokenToBTokenList(bComptroller);
        info.currPrices = getCurrentPrices(oracle, cTokens);
        info.numAvatars = registry.avatarLength();
    }

    function getNumAvatars(Pool pool) public view returns(uint) {
        Registry registry = Registry(address(pool.registry()));
        return registry.avatarLength(); 
    }
}
