pragma solidity 0.5.16;

// TODO To be removed in mainnet deployment
import "hardhat/console.sol";

import { ICToken, ICErc20, ICEther } from "../interfaces/CTokenInterfaces.sol";
import { IComptroller } from "../interfaces/IComptroller.sol";
import { AvatarBase } from "./AvatarBase.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Cushion is AvatarBase {

    /**
     * @dev Returns the status if this Avatar's debt can be liquidated
     * @return `true` when this Avatar can be liquidated, `false` otherwise
     */
    function canLiquidate() public returns (bool) {
        bool result = !canUntop();
        console.log("In canLiquidate(), result: %s", result);
        return result;
    }

    /**
     * @dev Topup this avatar by repaying borrowings with ETH
     */
    function topup() external payable onlyPool {
        // when already topped
        if(isToppedUp()) return;

        // 2. Repay borrows from Pool to topup
        ICEther cEther = ICEther(registry.cEther());
        cEther.repayBorrow.value(msg.value)();

        // 3. Store Topped-up details
        _topupAndStoreDetails(cEther, msg.value);
    }

    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     * @param cToken CToken address to use to RepayBorrows
     * @param topupAmount Amount of tokens to Topup
     */
    function topup(ICErc20 cToken, uint256 topupAmount) external onlyPool {
        // when already topped
        if(isToppedUp()) return;

        // 1. Transfer funds from the Pool contract
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(pool(), address(this), topupAmount);
        underlying.safeApprove(address(cToken), topupAmount);

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
        if(!isToppedUp()) return;

        // 1. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "borrow-failed");

        address payable pool = pool();
        if(address(toppedUpCToken) == registry.cEther()) {
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

    function _untopPartial(uint256 amount) internal {
        require(amount <= toppedUpAmount, "Cushion: partial-untop-not-allowed");

        // 1. when already untopped, return
        if(!isToppedUp()) return;

        address payable pool = pool();
        if(address(toppedUpCToken) == registry.cEther()) {
            // 2. Send borrowed ETH to Pool contract
            // Sending ETH to Pool using `.send()` to avoid DoS attack
            bool success = pool.send(amount);
            success; // shh: Not checking return value to avoid DoS attack
        } else {
            // 2. Transfer borrowed amount to Pool contract
            IERC20 underlying = toppedUpCToken.underlying();
            underlying.safeTransfer(pool, amount);
        }

        // 3. Udpdate storage for toppedUp details
        toppedUpAmount = sub_(toppedUpAmount, amount);
    }

    function _doLiquidateBorrow(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate,
        ICToken collCToken
    )
        internal
        returns (uint256)
    {
        // 1. Is toppedUp OR partially liquidated
        bool isPartiallyLiquidated = isPartiallyLiquidated();
        require(isToppedUp() || isPartiallyLiquidated, "cannot-perform-liquidateBorrow");
        // TODO below condition means debtCToken always = to toppedUpCToken
        // TODO if this is true, then dont need below if-else block
        if(isPartiallyLiquidated) {
            require(debtCToken == liquidationCToken, "debtCToken-not-equal-to-liquidationCToken");
        } else {
            require(debtCToken == toppedUpCToken, "debtCToken-not-equal-to-toppedUpCToken");
            liquidationCToken = debtCToken;
        }

        if(!isPartiallyLiquidated) {
            remainingLiquidationAmount = getMaxLiquidationAmount(debtCToken);
        }

        // 2. `underlayingAmtToLiquidate` is under limit
        require(underlyingAmtToLiquidate <= remainingLiquidationAmount, "liquidateBorrow:-amountToLiquidate-is-too-big");

        // 3. Liquidator perform repayBorrow
        (uint256 amtToDeductFromTopup, uint256 amtToRepayOnCompound) = splitAmountToLiquidate(underlyingAmtToLiquidate, remainingLiquidationAmount);

        address payable pool = pool();
        if(amtToRepayOnCompound > 0) {
            bool isCEtherDebt = _isCEther(debtCToken);
            if(isCEtherDebt) {
                // CEther
                require(msg.value == amtToRepayOnCompound, "insuffecient-ETH-sent");
                ICEther cEther = ICEther(registry.cEther());
                cEther.repayBorrow.value(amtToRepayOnCompound)();
                // send back rest of the amount to the Pool contract
                if(amtToDeductFromTopup > 0 ) {
                    bool success = pool.send(amtToDeductFromTopup); // avoid DoS attack
                    success; // shh
                }
            } else {
                // CErc20
                console.log("in CErc20: amtToRepayOnCompound %s", amtToRepayOnCompound);
                // take tokens from pool contract
                IERC20 underlying = toppedUpCToken.underlying();
                underlying.safeTransferFrom(pool, address(this), amtToRepayOnCompound);
                underlying.safeApprove(address(debtCToken), amtToRepayOnCompound);
                require(ICErc20(address(debtCToken)).repayBorrow(amtToRepayOnCompound) == 0, "liquidateBorrow:-repayBorrow-failed");
            }
        }

        toppedUpAmount = sub_(toppedUpAmount, amtToDeductFromTopup);

        // 4.1 Update remaining liquidation amount
        remainingLiquidationAmount = sub_(remainingLiquidationAmount, underlyingAmtToLiquidate);

        // 5. Calculate premium and transfer to Liquidator
        IComptroller comptroller = IComptroller(registry.comptroller());
        (uint err, uint seizeTokens) = comptroller.liquidateCalculateSeizeTokens(
            address(debtCToken),
            address(collCToken),
            underlyingAmtToLiquidate
        );
        require(err == 0, "error-in-liquidateCalculateSeizeTokens");

        // 6. Transfer permiumAmount to liquidator
        require(collCToken.transfer(pool, seizeTokens), "collateral-cToken-transfer-failed");

        return seizeTokens;
    }

    function getMaxLiquidationAmount(ICToken debtCToken) public returns (uint256) {
        uint256 avatarDebt = debtCToken.borrowBalanceCurrent(address(this));
        // `toppedUpAmount` is also called poolDebt;
        uint256 totalDebt = add_(avatarDebt, toppedUpAmount);
        // When First time liquidation is performed after topup
        // maxLiquidationAmount = closeFactorMantissa * totalDedt / 1e18;
        IComptroller comptroller = IComptroller(registry.comptroller());
        return mulTrucate(comptroller.closeFactorMantissa(), totalDebt);
    }

    function splitAmountToLiquidate(
        uint256 underlyingAmtToLiquidate,
        uint256 maxLiquidationAmount
    )
        public view returns (uint256 amtToDeductFromTopup, uint256 amtToRepayOnCompound)
    {
        console.log("underlyingAmtToLiquidate: %s", underlyingAmtToLiquidate);
        console.log("maxLiquidationAmount: %s", maxLiquidationAmount);
        // underlyingAmtToLiqScalar = underlyingAmtToLiquidate * 1e18
        (MathError mErr, Exp memory result) = mulScalar(Exp({mantissa: underlyingAmtToLiquidate}), expScale);
        require(mErr == MathError.NO_ERROR, "underlyingAmtToLiqScalar failed");
        uint underlyingAmtToLiqScalar = result.mantissa;
        console.log("underlyingAmtToLiqScalar: %s", underlyingAmtToLiqScalar);

        // percent = underlyingAmtToLiqScalar / maxLiquidationAmount
        uint256 percentInScale = div_(underlyingAmtToLiqScalar, maxLiquidationAmount);
        console.log("percentInScale: %s", percentInScale);

        // amtToDeductFromTopup = toppedUpAmount * percentInScale / 1e18
        amtToDeductFromTopup = mulTrucate(toppedUpAmount, percentInScale);
        console.log("toppedUpAmount: %s", toppedUpAmount);
        console.log("amtToDeductFromTopup: %s", amtToDeductFromTopup);

        // amtToRepayOnCompound = underlyingAmtToLiquidate - amtToDeductFromTopup
        amtToRepayOnCompound = sub_(underlyingAmtToLiquidate, amtToDeductFromTopup);
        console.log("amtToRepayOnCompound: %s", amtToRepayOnCompound);
    }

    /**
     * @dev Off-chain function to calculate `amtToDeductFromTopup` and `amtToRepayOnCompound`
     * @notice function is non-view but no-harm as CToken.borrowBalanceCurrent() only updates accured interest
     */
    function calcAmountToLiquidate(
        ICToken debtCToken,
        uint256 underlyingAmtToLiquidate
    )
        external returns (uint256 amtToDeductFromTopup, uint256 amtToRepayOnCompound)
    {
        uint256 amountToLiquidate = remainingLiquidationAmount;
        if(! isPartiallyLiquidated()) {
            amountToLiquidate = getMaxLiquidationAmount(debtCToken);
        }
        console.log("underlyingAmtToLiquidate: %s", underlyingAmtToLiquidate);
        console.log("amountToLiquidate: %s", amountToLiquidate);
        (amtToDeductFromTopup, amtToRepayOnCompound) = splitAmountToLiquidate(underlyingAmtToLiquidate, amountToLiquidate);
    }
}