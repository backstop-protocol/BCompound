pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICEther } from "./interfaces/CTokenInterfaces.sol";
import { ComptrollerInterface } from "./interfaces/ComptrollerInterface.sol";
import { SafeCToken } from "./lib/SafeCToken.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Avatar {
    using SafeERC20 for IERC20;
    using SafeCToken for ICToken;

    modifier onlyAllowed() {
        require(isAllowed(msg.sender), "Unauthorized");
        _;
    }

    constructor() public {

    }

    // ADMIN FUNCTIONS
    // ===============
    function enableCToken(ICToken cToken) external onlyAllowed {
        approveInfinite(cToken);
    }

    function approveInfinite(ICToken cToken) internal {
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeApprove(address(cToken), 0);
        underlying.safeApprove(address(cToken), uint(-1));
    }

    function isAllowed(address sender) internal pure returns (bool) {
        sender; // shhh
        // FIXME Get the whitelisted addresses from Registry
        // List of allowed contracts
        // 1. BToken
        // 2. BComptroller
        return true;
    }

    // CEther
    // ======
    function mint(ICEther cEther) external payable onlyAllowed {
        cEther.mint.value(msg.value)();
    }

    // CToken
    // ======
    function mint(ICToken cToken, address user, uint mintAmount) external onlyAllowed returns (uint) {
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), mintAmount);

        cToken.safeMint(mintAmount);
    }

    function redeem(ICToken cToken, address user, uint redeemTokens) external onlyAllowed returns (uint) {
        cToken.safeRedeem(redeemTokens);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, redeemedAmount);
    }

    function redeemUnderlying(ICToken cToken, address user, uint redeemAmount) external onlyAllowed returns (uint) {
        cToken.safeRedeemUnderlying(redeemAmount);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, redeemedAmount);
    }

    function borrow(ICToken cToken, address user, uint borrowAmount) external onlyAllowed returns (uint) {
        cToken.safeBorrow(borrowAmount);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, borrowedAmount);
    }

    function repayBorrow(ICToken cToken, address user, uint repayAmount) external onlyAllowed returns (uint) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), amountToRepay);
        cToken.safeRepayBorrow(amountToRepay);
    }

    /*
    // TODO This call should not be allowed in BProtocol. Get the Confirmation.
    function repayBorrowBehalf(ICToken cToken, address borrower, uint repayAmount) external onlyAllowed returns (uint) {
        cToken.safeRepayBorrowBehalf(borrower, repayAmount);
    }
    */

    // Comptroller
    // ===========
    function enterMarkets(ComptrollerInterface comptroller, address[] calldata cTokens) external onlyAllowed returns (uint[] memory) {
        return comptroller.enterMarkets(cTokens);
    }

    function exitMarket(ComptrollerInterface comptroller, address cToken) external onlyAllowed returns (uint) {
        return comptroller.exitMarket(cToken);
    }

}