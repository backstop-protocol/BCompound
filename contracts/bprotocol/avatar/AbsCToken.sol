pragma solidity 0.5.16;

// TODO To be removed in mainnet deployment
import "hardhat/console.sol";

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";
import { IScore } from "../interfaces/IScore.sol";

import { Cushion } from "./Cushion.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AbsCToken is Cushion {

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
        _score().updateCollScore(address(this), address(cETH), toInt256(msg.value));
    }

    function repayBorrow()
        external
        payable
        onlyBToken
        postPoolOp(false)
    {
        uint256 amtToRepayOnCompound = _untopPartial(cETH, msg.value);
        if(amtToRepayOnCompound > 0) cETH.repayBorrow.value(amtToRepayOnCompound)(); // fails on compound in case of err
        _score().updateDebtScore(address(this), address(cETH), -toInt256(msg.value));
    }

    function liquidateBorrow(ICToken cTokenCollateral) external payable onlyBToken {
        _liquidateBorrow(msg.value, cTokenCollateral);
    }


    // CErc20
    // ======
    function mint(ICErc20 cToken, uint256 mintAmount) public onlyBToken postPoolOp(false) returns (uint256) {
        uint result = cToken.mint(mintAmount);
        _score().updateCollScore(address(this), address(cToken), toInt256(mintAmount));
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
        _score().updateDebtScore(address(this), address(cToken), -toInt256(repayAmount));
        return 0; // no-err
    }

    function liquidateBorrow(uint256 underlyingAmtToLiquidate, ICToken cTokenCollateral) external onlyBToken returns (uint256) {
        return _liquidateBorrow(underlyingAmtToLiquidate, cTokenCollateral);
    }

    // CEther / CErc20
    // ===============
    function _liquidateBorrow(uint256 underlyingAmtToLiquidate, ICToken cTokenCollateral) internal returns (uint256) {
        // 1. Can liquidate?
        require(canLiquidate(), "cannot-liquidate");

        ICToken cTokenDebt = toppedUpCToken;
        uint256 seizedCTokens = _doLiquidateBorrow(cTokenDebt, underlyingAmtToLiquidate, cTokenCollateral);
        // Convert seizedCToken to underlyingTokens
        uint256 underlyingSeizedTokens = _toUnderlying(cTokenDebt, seizedCTokens);
        IScore score = _score();
        score.updateCollScore(address(this), address(cTokenDebt), -toInt256(underlyingSeizedTokens));
        score.updateDebtScore(address(this), address(cTokenCollateral), -toInt256(underlyingAmtToLiquidate));
        return 0;
    }

    function redeem(
        ICToken cToken,
        uint256 redeemTokens,
        address payable userOrDelegatee
    ) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, redeemTokens);
        _score().updateCollScore(address(this), address(cToken), -toInt256(underlyingRedeemAmount));

        // Do the fund transfer at last
        if(_isCEther(cToken)) {
            bool success = userOrDelegatee.send(address(this).balance);
            success; //shh: Avoiding DoS attack
        } else {
            IERC20 underlying = cToken.underlying();
            uint256 redeemedAmount = underlying.balanceOf(address(this));
            underlying.safeTransfer(userOrDelegatee, redeemedAmount);
        }
        return result;
    }

    function redeemUnderlying(
        ICToken cToken,
        uint256 redeemAmount,
        address payable userOrDelegatee
    ) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);

        _score().updateCollScore(address(this), address(cToken), -toInt256(redeemAmount));

        // Do the fund transfer at last
        if(_isCEther(cToken)) {
            bool success = userOrDelegatee.send(redeemAmount);
            success; //shh: Avoiding DoS attack
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(userOrDelegatee, redeemAmount);
        }
        return result;
    }

    function borrow(
        ICToken cToken,
        uint256 borrowAmount,
        address payable userOrDelegatee
    ) external onlyBToken postPoolOp(true) returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        if(result != 0) return result;

        _score().updateDebtScore(address(this), address(cToken), toInt256(borrowAmount));

        // send funds at last
        if(_isCEther(cToken)) {
            bool success = userOrDelegatee.send(borrowAmount);
            success; //shh: avoid DoS attack
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(userOrDelegatee, borrowAmount);
        }
        return result;
    }

    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken postPoolOp(true) returns (bool) {
        address dstAvatar = registry.getAvatar(dst);
        bool result = cToken.transfer(dstAvatar, amount);
        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        _score().updateCollScore(address(this), address(cToken), -toInt256(underlyingRedeemAmount));
        _score().updateCollScore(dstAvatar, address(cToken), toInt256(underlyingRedeemAmount));
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken postPoolOp(true) returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        // If src has an Avatar, deduct coll score
        address srcAvatar = registry.getAvatar(src);
        if(srcAvatar != address(0)) _score().updateCollScore(srcAvatar, address(cToken), -toInt256(underlyingRedeemAmount));

        // if dst has an Avatar, increase coll score
        address dstAvatar = registry.getAvatar(dst);
        if(dstAvatar != address(0)) _score().updateCollScore(dstAvatar, address(cToken), toInt256(underlyingRedeemAmount));

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