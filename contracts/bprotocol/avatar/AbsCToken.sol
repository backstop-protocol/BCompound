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

    function borrowBalanceCurrent(ICToken cToken) public onlyBToken returns (uint256) {
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
        cEther.mint.value(msg.value)(); // fails on compound in case of err
        _score().updateCollScore(address(this), address(cEther), toInt256(msg.value));
    }

    function repayBorrow()
        external
        payable
        onlyBToken
        postPoolOp(false)
    {
        uint256 amtToRepayOnCompound = _untopPartial(cEther, msg.value);
        if(amtToRepayOnCompound > 0) cEther.repayBorrow.value(amtToRepayOnCompound)(); // fails on compound in case of err
        _score().updateDebtScore(address(this), address(cEther), -toInt256(msg.value));
    }

    function liquidateBorrow(ICToken cTokenCollateral) external payable onlyBToken {
        _liquidateBorrow(msg.value, cTokenCollateral);
    }


    // CErc20
    // ======
    function mint(ICErc20 cToken, uint256 mintAmount) public onlyBToken postPoolOp(false) returns (uint256) {
        uint result = cToken.mint(mintAmount);
        require(result == 0, "AbsCToken: mint-failed");
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
        uint256 result = 0;
        if(amtToRepayOnCompound > 0) {
            IERC20 underlying = cToken.underlying();
            // use resetApprove() in case ERC20.approve() has front-running attack protection
            underlying.safeApprove(address(cToken), repayAmount);
            result = cToken.repayBorrow(amtToRepayOnCompound);
            require(result == 0, "AbsCToken: repayBorrow-failed");
            _score().updateDebtScore(address(this), address(cToken), -toInt256(repayAmount));
        }
        return result; // in case of err, tx fails at BToken
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
        console.log("redeem result: %s", result);
        require(result == 0, "AbsCToken: redeem-failed");

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, redeemTokens);
        _score().updateCollScore(address(this), address(cToken), -toInt256(underlyingRedeemAmount));

        // Do the fund transfer at last
        if(_isCEther(cToken)) {
            userOrDelegatee.transfer(address(this).balance);
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
        require(result == 0, "AbsCToken: redeemUnderlying-failed");

        _score().updateCollScore(address(this), address(cToken), -toInt256(redeemAmount));

        // Do the fund transfer at last
        if(_isCEther(cToken)) {
            userOrDelegatee.transfer(redeemAmount);
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
        console.log("borrow result: %s", result);
        require(result == 0, "AbsCToken: borrow-failed");
        
        _score().updateDebtScore(address(this), address(cToken), toInt256(borrowAmount));

        // send funds at last
        if(_isCEther(cToken)) {
            userOrDelegatee.transfer(borrowAmount);
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
        require(result, "AbsCToken: transfer-failed");

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        _score().updateCollScore(address(this), address(cToken), -toInt256(underlyingRedeemAmount));
        _score().updateCollScore(dstAvatar, address(cToken), toInt256(underlyingRedeemAmount));
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken postPoolOp(true) returns (bool) {
        address srcAvatar = registry.getAvatar(src);
        address dstAvatar = registry.getAvatar(dst);

        bool result = cToken.transferFrom(srcAvatar, dstAvatar, amount);
        require(result, "AbsCToken: transferFrom-failed");

        uint256 underlyingRedeemAmount = _toUnderlying(cToken, amount);
        _score().updateCollScore(srcAvatar, address(cToken), -toInt256(underlyingRedeemAmount));
        _score().updateCollScore(dstAvatar, address(cToken), toInt256(underlyingRedeemAmount));
        return result;
    }

    function approve(ICToken cToken, address spender, uint256 amount) public onlyBToken returns (bool) {
        address spenderAvatar = registry.getAvatar(spender);
        return cToken.approve(spenderAvatar, amount);
    }

    function collectCToken(ICToken cToken, address from, uint256 cTokenAmt) public {
        require(cToken.transferFrom(from, address(this), cTokenAmt), "AbsCToken: transferFrom-failed");
        uint256 underlyingAmt = _toUnderlying(cToken, cTokenAmt);
        _score().updateCollScore(address(this), address(cToken), toInt256(underlyingAmt));
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