pragma solidity 0.5.16;

import { ICToken } from "../interfaces/CTokenInterfaces.sol";

library SafeCToken {

    function safeMint(ICToken cToken, uint256 mintAmount) internal {
        require(cToken.mint(mintAmount) == 0, "Mint failed");
    }

    function safeRedeem(ICToken cToken, uint256 redeemTokens) internal {
        require(cToken.redeem(redeemTokens) == 0, "Redeem failed");
    }

    function safeRedeemUnderlying(ICToken cToken, uint256 redeemAmount) internal {
        require(cToken.redeemUnderlying(redeemAmount) == 0, "Redeem underlying failed");
    }

    function safeBorrow(ICToken cToken, uint256 borrowAmount) internal {
        require(cToken.borrow(borrowAmount) == 0, "Borrow failed");
    }

    function safeRepayBorrow(ICToken cToken, uint256 repayAmount) internal {
        require(cToken.repayBorrow(repayAmount) == 0, "RepayBorrow failed");
    }

    function safeRepayBorrowBehalf(ICToken cToken, address borrower, uint256 repayAmount) internal {
        require(cToken.repayBorrowBehalf(borrower, repayAmount) == 0, "RepayBorrowBehalf failed");
    }

}