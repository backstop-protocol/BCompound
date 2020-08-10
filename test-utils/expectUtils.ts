import BN from "bn.js";

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers");
const chai = require("chai");
const expect = chai.expect;

export function expectedLiquidity(
    accountLiquidity: [BN, BN, BN],
    expectedErr: BN,
    expectedLiquidityAmt: BN,
    expectedShortFallAmt: BN,
    debug: boolean = false,
) {
    if (debug) {
        console.log("Err: " + accountLiquidity[0].toString());
        console.log("Liquidity: " + accountLiquidity[1].toString());
        console.log("ShortFall: " + accountLiquidity[2].toString());
    }

    expect(expectedErr, "Unexpected Err").to.be.bignumber.equal(accountLiquidity[0]);
    expect(expectedLiquidityAmt, "Unexpected Liquidity Amount").to.be.bignumber.equal(
        accountLiquidity[1],
    );
    expect(expectedShortFallAmt, "Unexpected ShortFall Amount").to.be.bignumber.equal(
        accountLiquidity[2],
    );
}

export function expectMarket(
    market: [boolean, BN, boolean],
    isListed: boolean,
    collateralFactorMantissa: BN,
    isComped: boolean = false,
    debug: boolean = false,
) {
    if (debug) {
        console.log("isListed: " + market[0]);
        console.log("collateralFactorMantissa: " + market[1]);
        console.log("isComped: " + market[2]);
    }

    expect(isListed, "Unexpected cToken listing").to.be.equal(market[0]);
    expect(collateralFactorMantissa, "Unexpected collateralFactor").to.be.bignumber.equal(
        market[1],
    );
    // Ignore checking isComped
    // expect(isComped, "Unexpected isComped").to.be.equal(market[2]);
}
