pragma solidity 0.5.16;

// TODO To be removed in mainnet deployment
import "@nomiclabs/buidler/console.sol";

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";

import { Cushion } from "./Cushion.sol";
import { BTokenScore } from "../scoring/BTokenScore.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AbsCToken is BTokenScore, Cushion {

    modifier onlyBToken() {
        require(isValidBToken(msg.sender), "only-BToken-is-authorized");
        _;
    }

    function isValidBToken(address bToken) internal view returns (bool) {
        return bComptroller.isBToken(bToken);
    }

    function borrowBalanceCurrent(ICToken cToken) public returns (uint256) {
        uint256 borrowBalanceCurr = cToken.borrowBalanceCurrent(address(this));
        if(toppedUpCToken == cToken) return add_(borrowBalanceCurr, toppedUpAmount);
        return borrowBalanceCurr;
    }

    function _untopPartial(ICToken cToken, uint256 repayAmount) internal returns (uint256 amtToRepayOnCompound) {
        if(toppedUpAmount > 0 && cToken == toppedUpCToken) {
            // consume debt from cushion first
            uint256 amtToUntopFromB = repayAmount >= toppedUpAmount ? toppedUpAmount : repayAmount;
            super._untopPartial(amtToUntopFromB);
            amtToRepayOnCompound = sub_(repayAmount, amtToUntopFromB);
        } else {
            amtToRepayOnCompound = repayAmount;
        }
    }

    function _toUnderlying(ICToken cToken, uint256 redeemTokens) internal returns (uint256) {
        uint256 exchangeRate = cToken.exchangeRateCurrent();
        return mulTrucate(redeemTokens, exchangeRate);
    }

    // CEther
    // ======
    function mint() public payable onlyBToken postPoolOp(false) {
        cETH.mint.value(msg.value)(); // fails on compound in case of err
        updateCollScore(avatarOwner, address(cETH), toInt256(msg.value));
    }

    function repayBorrow()
        external
        payable
        onlyBToken
        postPoolOp(false)
    {
        uint256 amtToRepayOnCompound = _untopPartial(cETH, msg.value);
        if(amtToRepayOnCompound > 0) cETH.repayBorrow.value(amtToRepayOnCompound)(); // fails on compound in case of err
        updateDebtScore(avatarOwner, address(cETH), -toInt256(msg.value));
    }

    // CToken
    // ======
    function mint(ICErc20 cToken, uint256 mintAmount) public onlyBToken postPoolOp(false) returns (uint256) {
        uint result = cToken.mint(mintAmount);
        updateCollScore(avatarOwner, address(cToken), toInt256(mintAmount));
        return result;
    }

    function repayBorrow(ICErc20 cToken, uint256 repayAmount)
        external
        onlyBToken
        postPoolOp(false)
        returns (uint256)
    {
        uint256 amtToRepayOnCompound = _untopPartial(cToken, repayAmount);
        if(amtToRepayOnCompound > 0) return cToken.repayBorrow(amtToRepayOnCompound); // in case of err, tx fails at BToken
        updateDebtScore(avatarOwner, address(cToken), -toInt256(repayAmount));
        return 0; // no-err
    }

    // CEther / CToken
    // ===============
    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);

        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            // FIXME if we can calculate and send exact amount
            avatarOwner.transfer(address(this).balance);
        } else {
            IERC20 underlying = cToken.underlying();
            uint256 redeemedAmount = underlying.balanceOf(address(this));
            underlying.safeTransfer(avatarOwner, redeemedAmount);
        }
        uint256 underlyingRedeemAmount = _toUnderlying(cToken, redeemTokens);
        updateCollScore(avatarOwner, address(cToken), -toInt256(underlyingRedeemAmount));
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            avatarOwner.transfer(redeemAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(avatarOwner, redeemAmount);
        }
        updateCollScore(avatarOwner, address(cToken), -toInt256(redeemAmount));
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            avatarOwner.transfer(borrowAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(avatarOwner, borrowAmount);
        }
        updateDebtScore(avatarOwner, address(cToken), toInt256(borrowAmount));
        return result;
    }

    function liquidateBorrow(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate,
        ICToken collCToken
    )
        external payable onlyPool returns (uint256)
    {
        console.log("In liquidateBorrow");
        // 1. Can liquidate?
        require(canLiquidate(), "cannot-liquidate");
        console.log("2. In liquidateBorrow");

        uint256 seizedCTokens = _doLiquidateBorrow(debtCToken, underlyingAmtToLiquidate, collCToken);
        // Convert seizedCToken to underlyingTokens
        uint256 underlyingSeizedTokens = _toUnderlying(debtCToken, seizedCTokens);
        updateCollScore(avatarOwner, address(debtCToken), -toInt256(underlyingSeizedTokens));
        updateDebtScore(avatarOwner, address(collCToken), -toInt256(underlyingAmtToLiquidate));
        return 0;
    }


    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken postPoolOp(true) returns (bool) {
        bool result = cToken.transfer(dst, amount);
        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        updateCollScore(avatarOwner, address(cToken), -toInt256(underlyingRedeemAmount));
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken postPoolOp(true) returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        // If src has an Avatar, deduct coll score
        address srcAvatar = registry.getAvatar(src);
        if(srcAvatar != address(0)) updateCollScore(src, address(cToken), -toInt256(underlyingRedeemAmount));

        // if dst has an Avatar, increase coll score
        address dstAvatar = registry.getAvatar(dst);
        if(dstAvatar != address(0)) updateCollScore(dst, address(cToken), toInt256(underlyingRedeemAmount));

        return result;
    }

    function approve(ICToken cToken, address spender, uint256 amount) public onlyBToken returns (bool) {
        return cToken.approve(spender, amount);
    }

    /**
     * @dev Fallback to receieve ETH from CEther contract on `borrow()`, `redeem()`, `redeemUnderlying`
     */
    // TODO Can add a modifier to allow only cTokens. However, don't see a need for
    // the modifier
    function () external payable {
        // Receive ETH
    }
}