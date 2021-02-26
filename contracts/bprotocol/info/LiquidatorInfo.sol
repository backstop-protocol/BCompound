pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import { Registry } from "./../Registry.sol";
import { BComptroller } from "./../BComptroller.sol";
import { CTokenInterface } from "./../interfaces/CTokenInterfaces.sol";
import { IBToken } from "./../interfaces/IBToken.sol";
import { ICushion } from "./../interfaces/IAvatar.sol";
import { IComptroller } from "./../interfaces/IComptroller.sol";
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

        address[] cushionPossibleTokens; // which tokens could be used for cushion
        uint[] cushionMaxSizes;
    }

    struct LiquidationInfo {
        // only relevant if there is a cushion. we assume only one liquidator
        uint remainingLiquidationSize;
    }

    struct AccountInfo {
        AvatarInfo avatarInfo;
        CushionInfo cushionInfo;
        LiquidationInfo liquidationInfo;
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
        address[] memory ctoken,
        uint[] memory priceFeed,
        address avatar
    ) 
        public
        returns(AvatarInfo memory info) 
    {
        require(ctoken.length == priceFeed.length, "ctoken-priceFeed-missmatch");

        uint numTokens = ctoken.length;
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
            if(registry.cEther() == ctoken[i]) info.debtTokens[i] = ETH;
            else info.debtTokens[i] = address(CTokenInterface(info.debtTokens[i]).underlying());

            address btoken = bComptroller.c2b(ctoken[i]);
            info.debtAmounts[i] = IBToken(btoken).borrowBalanceCurrent(user);

            info.collateralTokens[i] = ctoken[i];
            info.collateralAmounts[i] = CTokenInterface(btoken).exchangeRateCurrent() * CTokenInterface(btoken).balanceOf(user) / 1e18;
            if(! isIn(assetsIn, ctoken[i])) info.collateralAmounts[i] = 0; 
            // set as 0 if not in market
            (,uint CR) = comptroller.markets(ctoken[i]);
            info.weightedCollateralAmounts[i] = info.collateralAmounts[i] * CR / 1e18;

            info.totalDebt += info.debtAmounts[i] * priceFeed[i] / 1e18;
            info.totalCollateral += info.collateralAmounts[i] * priceFeed[i] / 1e18;
            info.weightedCollateral += info.weightedCollateralAmounts[i] * priceFeed[i] / 1e18;
        }
    }

    function ctokenToUnderlying(Registry registry, address ctoken) internal view returns(address) {
        if(registry.cEther() == ctoken) return ETH; 
        else return address(CTokenInterface(ctoken).underlying());
    }

    function getCushionInfo(
        Registry registry,
        BComptroller bComptroller,
        Pool pool,
        address[] memory ctoken,
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
            (,address toppedToken) = pool.topped(avatar);
            info.cushionCurrentToken = ctokenToUnderlying(registry, toppedToken);
            info.cushionCurrentSize = amountTopped;
        }

        info.cushionPossibleTokens = new address[](ctoken.length);
        info.cushionMaxSizes = new uint[](ctoken.length);        
        for(uint i = 0 ; i < ctoken.length ; i++) {
            uint debt = IBToken(bComptroller.c2b(ctoken[i])).borrowBalanceCurrent(user);
            uint debtUsd = debt * priceFeed[i] / 1e18;
            if(amountTopped > 0 && info.hasCushion) {
                if(info.cushionCurrentToken != ctokenToUnderlying(registry, ctoken[i])) continue;
                debt -= amountTopped;
            }

            info.cushionPossibleTokens[i] = ctokenToUnderlying(registry, ctoken[i]);
            info.cushionMaxSizes[i] = debt;

            if(debtAmount > weightedCollateral) {
                // not enough debt to topup
                if(debtUsd < (debtAmount - weightedCollateral)) info.cushionMaxSizes[i] = 0;
            }
        }
    }

    function getLiquidationInfo(address  avatar) public returns(LiquidationInfo memory info) {
        info.remainingLiquidationSize = ICushion(avatar).remainingLiquidationAmount();
    }

    function getSingleAccountInfo(
        Pool pool,
        Registry registry,
        BComptroller bComptroller, 
        address me,
        address avatar,
        address[] memory ctokens,
        uint[] memory priceFeed
    )
        public
        returns(AccountInfo memory info) 
    {

        info.avatarInfo = getAvatarInfo(registry, bComptroller, ctokens, priceFeed, avatar);
        info.cushionInfo = getCushionInfo(
            registry,
            bComptroller,
            pool,
            ctokens,
            priceFeed,
            info.avatarInfo.totalDebt,
            info.avatarInfo.weightedCollateral,
            avatar,
            me
        );
        info.liquidationInfo = getLiquidationInfo(avatar);
    }

    function getInfo(
        uint startAccount,
        uint endAccount,
        address me,
        Pool pool,
        address[] memory ctokens,
        uint[] memory priceFeed
    )
        public
        returns(AccountInfo[] memory info) 
    {

        info = new AccountInfo[](endAccount + 1 - startAccount);

        Registry registry = Registry(address(pool.registry()));
        BComptroller bComptroller = BComptroller(address(pool.bComptroller()));

        for(uint i = 0 ; i + startAccount <= endAccount ; i++) {
            uint accountNumber = i + startAccount;
            address avatar = registry.avatars(accountNumber);
            info[i] = getSingleAccountInfo(pool, registry, bComptroller, me, avatar, ctokens, priceFeed);
        }
    }

    function getNumAvatars(Pool pool) public view returns(uint) {
        Registry registry = Registry(address(pool.registry()));
        return registry.avatarLength(); 
    }
}
