pragma solidity 0.5.16;

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";

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

    // CEther
    // ======
    function mint(ICEther cEther) public payable onlyBToken poolPostOp(false) {
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
    function mint(ICErc20 cToken, uint256 mintAmount) public onlyBToken poolPostOp(false) returns (uint256) {
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 result = cToken.mint(mintAmount);
        return result;
    }

    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken poolPostOp(true) returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);

        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            // FIXME if we can calculate and send exact amount
            owner.transfer(address(this).balance);
        } else {
            IERC20 underlying = cToken.underlying();
            uint256 redeemedAmount = underlying.balanceOf(address(this));
            underlying.safeTransfer(owner, redeemedAmount);
        }
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken poolPostOp(true) returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            owner.transfer(redeemAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(owner, redeemAmount);
        }
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken poolPostOp(true) returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        if(_isCEther(cToken)) {
            // FIXME OZ `Address.sendValue`
            owner.transfer(borrowAmount);
        } else {
            IERC20 underlying = cToken.underlying();
            underlying.safeTransfer(owner, borrowAmount);
        }
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

    function liquidateBorrow(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate,
        ICToken collCToken
    )
        external payable onlyPool
    {
        // 1. Can liquidate?
        require(canLiquidate(), "cannot-liquidate");

        _doLiquidateBorrow(debtCToken, underlyingAmtToLiquidate, collCToken);
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