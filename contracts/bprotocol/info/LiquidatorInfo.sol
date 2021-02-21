pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import { Registry } from "./../Registry.sol";
import { BComptroller } from "./../BComptroller.sol";
import { CTokenInterface } from "./../Inteface/CTokenInterface.sol";
import { IBToken } from "./../Inteface/IBToken.sol";
import { ICushion } from "./../Inteface/IAvatar.sol";
import { Pool } from "./Pool.sol";

contract LiquidatorInfo {
    address constant ETH = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    struct AvatarInfo {
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
        uint[] cushionPossibleSizes; // depends on a price feed
    }

    struct liquidationInfo {
        // only relevant if there is a cushion. we assume only one liquidator
        uint remainingLiquidationSize;        
        address[] collateralTokens;
        uint[] collateralForRemainingLiquidationSize;
        address[] collateralCToken;        
    }

    function getAvatarInfo(Registry registry,
                           BComptroller bComptroller,
                           address[] memory ctoken,
                           uint[] priceFeed,
                           address user) public view return(AvatarInfo memory info) {
        require(ctoken.length == priceFeed.length, "ctoken-priceFeed-missmatch");

        uint numTokens = ctoken.length;

        info.debtTokens = new address[](numTokens);
        info.debtAmounts = new address[](numTokens);
        info.collateralTokens = new address[](numTokens);
        info.collateralAmounts = new address[](numTokens);
        info.weightedCollateralAmounts = new uint[](numTokens);

        for(uint i = 0 ; i < numTokens ; i++) {
            if(registry.cEther() == ctoken[i]) info.debtTokens[i] = ETH;
            else info.debtTokens[i] = CTokenInterface(info.debtTokens[i]).underlying();

            address btoken = bComptroller.c2b(ctoken[i]);
            info.debtAmounts[i] = IBToken(btoken).borrowBalanceCurrent(user);

            info.collateralTokens[i] = ctoken[i];
            info.collateralAmounts[i] = CTokenInterface(btoken).exchangeRateCurrent() * CTokenInterface(btoken).balanceOf(user) / 1e18;
            uint CR = bComptroller.comptroller().markets(ctoken[i]);
            info.weightedCollateralAmounts[i] = info.collateralAmounts[i] * CR / 1e18;

            info.totalDebt += info.debtAmounts[i] * priceFeed[i] / 1e18;
            info.totalCollateral += info.collateralAmounts[i] * priceFeed[i] / 1e18;
            info.weightedCollateral += info.weightedCollateralAmounts[i] * priceFeed[i] / 1e18;
        }
    }

    function getCushionInfo(Registry registry,
                            BComptroller bComptroller,
                            Pool pool,
                            address[] memory ctoken,
                            uint[] priceFeed,
                            uint debtAmount,
                            uint weightedCollateralAmounts,
                            address user,
                            address me) public view return(CushionInfo memory info) {
        address avatar = registry.avatarOf(user);
        info.hasCushion = ICushion(avatar).toppedUpAmount() > 0;
        (uint expire, uint amountTopped, uint amountLiquidated) = pool.getMemberTopupInfo(user, me);

        if(debtAmount > weightedCollateralAmounts) {
            // assume there is only one member
            if(amountTopped == 0 || info.hasCushion) info.shouldTopup = true;
        }
        info.shouldUntop = (!info.hasCushion && amountTopped > 0);

        if(amountTopped > 0) {
            info.cushionCurrentToken = pool.topped(avatar).cToken;
            info.cushionCurrentSize = amountTopped;
        }

        for(uint i = 0 ; i < ctoken.length ; i++) {
            address btoken = bComptroller.c2b(ctoken[i]);
            uint debt = IBToken(btoken).borrowBalanceCurrent(user);
            uint debtUsd = debt * priceFeed[i] / 1e18;
            if(amountTopped > 0 && info.hasCushion) {
                
            }
        }

    }

    struct CushionInfo {
        bool hasCushion;
        bool shouldTopup;
        bool shouldUntop;

        address cushionCurrentToken;
        uint cushionCurrentSize;

        address[] cushionPossibleTokens; // which tokens could be used for cushion
        uint[] cushionPossibleSizes; // depends on a price feed
    }
}