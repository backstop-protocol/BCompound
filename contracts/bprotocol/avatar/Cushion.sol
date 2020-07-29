pragma solidity 0.5.16;

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";

import { CushionBase } from "./CushionBase.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Cushion is CushionBase {

    modifier prePoolOp(ICToken cToken, uint256 repayBorrowAmount) {
        if(toppedUpAmount > 0) {
            uint256 currentBorrowBalance = cToken.borrowBalanceCurrent(address(this));
            if(add_(repayBorrowAmount, toppedUpAmount) >= currentBorrowBalance) {
                _untop();
            }
        }
        _;
    }

    /**
     * @dev Returns the status if this Avatar's debt can be liquidated
     * @return `true` when this Avatar can be liquidated, `false` otherwise
     */
    function canLiquidate() public returns (bool) {
        return !_canUntop();
    }

    /**
     * @dev Topup this avatar by repaying borrowings with ETH
     */
    function topup() external payable onlyPool {
        // when already topped
        if(_isToppedUp()) return;

        // 2. Repay borrows from Pool to topup
        cETH.repayBorrow.value(msg.value)();

        // 3. Store Topped-up details
        _topupAndStoreDetails(cETH, msg.value);
    }

    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     * @param cToken CToken address to use to RepayBorrows
     * @param topupAmount Amount of tokens to Topup
     */
    function topup(ICErc20 cToken, uint256 topupAmount) external onlyPool {
        // when already topped
        if(_isToppedUp()) return;

        // 1. Transfer funds from the Pool contract
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(pool, address(this), topupAmount);

        // 2. Repay borrows from Pool to topup
        require(cToken.repayBorrow(topupAmount) == 0, "RepayBorrow-failed");

        // 3. Store Topped-up details
        _topupAndStoreDetails(cToken, topupAmount);
    }

    function _topupAndStoreDetails(ICToken cToken, uint256 topupAmount) internal {
        toppedUpCToken = cToken;
        toppedUpAmount = topupAmount;
    }

    function untop() external onlyPool {
        _untop();
    }

    /**
     * @dev Untop the borrowed position of this Avatar by borrowing from Compound and transferring
     *      it to the pool.
     * @notice Only Pool contract allowed to call the untop.
     * @return `true` if success, `false` otherwise.
     */
    function _untop() internal {
        // when already untopped
        if(!_isToppedUp()) return;

        // 1. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "borrow-failed");

        if(address(toppedUpCToken) == address(cETH)) {
            // 2. Send borrowed ETH to Pool contract
            // Sending ETH to Pool using `.send()` to avoid DoS attack
            bool success = pool.send(toppedUpAmount);
            success; // shh: Not checking return value to avoid DoS attack
        } else {
            // 2. Transfer borrowed amount to Pool contract
            IERC20 underlying = toppedUpCToken.underlying();
            underlying.safeTransfer(pool, toppedUpAmount);
        }

        // 3. Udpdate storage for toppedUp details
        toppedUpAmount = 0;
    }

    function _doLiquidateBorrow(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate,
        ICToken collCToken
    )
        internal
    {
        // 1. Is toppedUp OR partially liquidated
        bool isPartiallyLiquidated = _isPartiallyLiquidated();
        require(_isToppedUp() || isPartiallyLiquidated, "cannot-perform-liquidateBorrow");
        if(isPartiallyLiquidated) {
            require(debtCToken == liquidationCToken, "debtCToken-not-equal-to-liquidationCToken");
        } else {
            require(debtCToken == toppedUpCToken, "debtCToken-not-equal-to-toppedUpCToken");
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
        // 2. `underlayingAmtToLiquidate` is under limit
        require(underlyingAmtToLiquidate <= remainingLiquidationAmount, "liquidateBorrow:-amountToLiquidate-is-too-big");

        // 3. Liquidator perform repayBorrow
        uint256 repayAmount = 0;
        if(toppedUpAmount < underlyingAmtToLiquidate) {
            repayAmount = sub_(underlyingAmtToLiquidate, toppedUpAmount);

            if(isCEtherDebt) {
                // CEther
                require(msg.value == repayAmount, "insuffecient-ETH-sent");
                cETH.repayBorrow.value(repayAmount)();
            } else {
                // CErc20
                toppedUpCToken.underlying().safeTransferFrom(msg.sender, address(this), repayAmount);
                require(ICErc20(address(debtCToken)).repayBorrow(repayAmount) == 0, "liquidateBorrow:-repayBorrow-failed");
            }
            toppedUpAmount = 0;
        }
        else {
            toppedUpAmount = sub_(toppedUpAmount, underlyingAmtToLiquidate);
            repayAmount = underlyingAmtToLiquidate;
        }

        // 4.1 Update remaining liquidation amount
        remainingLiquidationAmount = sub_(remainingLiquidationAmount, repayAmount);

        // 5. Calculate premium and transfer to Liquidator
        (uint err, uint seizeTokens) = comptroller.liquidateCalculateSeizeTokens(
            address(debtCToken),
            address(collCToken),
            underlyingAmtToLiquidate
        );
        require(err == 0, "error-in-liquidateCalculateSeizeTokens");

        // 6. Transfer permiumAmount to liquidator
        require(collCToken.transfer(msg.sender, seizeTokens), "collateral-cToken-transfer-failed");
    }
}