pragma solidity 0.5.16;

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";

import { Cushion } from "./Cushion.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AbsCToken is Cushion {

    // CEther
    // ======
    function mint(ICEther cEther) external payable onlyBToken poolPostOp(false) {
        cEther.mint.value(msg.value)();
    }

    function repayBorrow() external payable onlyBToken poolPostOp(false) {
        cETH.repayBorrow.value(msg.value)();
    }

    function repayBorrowBehalf(address borrower) external payable onlyBToken {
        cETH.repayBorrowBehalf.value(msg.value)(borrower);
    }

    // CToken
    // ======
    function mint(ICErc20 cToken, uint256 mintAmount) external onlyBToken poolPostOp(false) returns (uint256) {
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 result = cToken.mint(mintAmount);
        return result;
    }

    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);

        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            // FIXME if we can calculate and send exact amount
            msg.sender.transfer(address(this).balance);
        } else {
            IERC20 underlying = cToken.underlying();
            uint256 redeemedAmount = underlying.balanceOf(address(this));
            underlying.safeTransfer(msg.sender, redeemedAmount);
        }
        _hardReevaluate();
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            msg.sender.transfer(redeemAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(msg.sender, redeemAmount);
        }
        _hardReevaluate();
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            msg.sender.transfer(borrowAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(msg.sender, borrowAmount);
        }
        _hardReevaluate();
        return result;
    }

    function repayBorrow(ICErc20 cToken, uint256 repayAmount) external onlyBToken poolPostOp(false) returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        uint256 result = cToken.repayBorrow(amountToRepay);
        return result;
    }

    function repayBorrowBehalf(ICErc20 cToken, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(borrower);
        }

        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        return cToken.repayBorrowBehalf(borrower, amountToRepay);
    }

    // CToken / CEther
    function liquidateBorrow(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate,
        ICToken collCToken
    )
        external payable onlyPool
    {
        // 1. Can liquidate?
        require(canLiquidate(), "Cannot liquidate");

        // 2. Is toppedUp OR partially liquidated
        bool isPartiallyLiquidated = _isPartiallyLiquidated();
        require(_isToppedUp() || isPartiallyLiquidated, "Cannot perform liquidateBorrow");
        if(isPartiallyLiquidated) {
            require(debtCToken == liquidationCToken, "debtCToken not equal to liquidationCToken");
        } else {
            require(debtCToken == toppedUpCToken, "debtCToken not equal to toppedUpCToken");
            liquidationCToken = debtCToken;
        }

        if(!_isPartiallyLiquidated()) {
            uint256 avatarDebt = debtCToken.borrowBalanceCurrent(address(this));
            // `toppedUpAmount` is also called poolDebt;
            uint256 totalDebt = add_(avatarDebt, toppedUpAmount);
            // First time liquidation is performed after topup
            // remainingLiquidationAmount = closeFactorMantissa * totalDedt / 1e18;
            remainingLiquidationAmount = mulTrucate(comptroller.closeFactorMantissa(), totalDebt);
        }

        bool isCEtherDebt = _isCEther(debtCToken);
        // 3. `underlayingAmtToLiquidate` is under limit
        require(underlyingAmtToLiquidate <= remainingLiquidationAmount, "liquidateBorrow: amountToLiquidate is too big");

        // 4. Liquidator perform repayBorrow
        uint256 repayAmount = 0;
        if(toppedUpAmount < underlyingAmtToLiquidate) {
            repayAmount = sub_(underlyingAmtToLiquidate, toppedUpAmount);

            if(isCEtherDebt) {
                // CEther
                require(msg.value == repayAmount, "Insuffecient ETH sent");
                cETH.repayBorrow.value(repayAmount)();
            } else {
                // CErc20
                toppedUpCToken.underlying().safeTransferFrom(msg.sender, address(this), repayAmount);
                require(ICErc20(address(debtCToken)).repayBorrow(repayAmount) == 0, "liquidateBorrow: repayBorrow failed");
            }
            toppedUpAmount = 0;
        }
        else {
            toppedUpAmount = sub_(toppedUpAmount, underlyingAmtToLiquidate);
            repayAmount = underlyingAmtToLiquidate;
        }

        // 4.2 Update remaining liquidation amount
        remainingLiquidationAmount = sub_(remainingLiquidationAmount, repayAmount);

        // 5. Calculate premium and transfer to Liquidator
        (uint err, uint seizeTokens) = comptroller.liquidateCalculateSeizeTokens(
            address(debtCToken),
            address(collCToken),
            underlyingAmtToLiquidate
        );
        require(err == 0, "Error in liquidateCalculateSeizeTokens");

        // 6. Transfer permiumAmount to liquidator
        require(collCToken.transfer(msg.sender, seizeTokens), "Collateral cToken transfer failed");
    }


    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken poolPostOp(true) returns (bool) {
        bool result = cToken.transfer(dst, amount);
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken poolPostOp(true) returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);
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