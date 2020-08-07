pragma solidity 0.5.16;

// TODO To be removed in mainnet deployment
import "@nomiclabs/buidler/console.sol";

import { AvatarBase } from "./AvatarBase.sol";

contract CushionBase is AvatarBase {

    modifier postPoolOp(bool debtIncrease) {
        _;
        _reevaluate(debtIncrease);
    }

    /**
     * @dev Hard check to ensure untop is allowed and then reset remaining liquidation amount
     */
    function _hardReevaluate() private {
        // Check: must allowed untop
        require(canUntop(), "cannot-untop");
        // Reset it to force re-calculation
        remainingLiquidationAmount = 0;
    }

    /**
     * @dev Soft check and reset remaining liquidation amount
     */
    function _softReevaluate() private {
        if(isPartiallyLiquidated()) {
            _hardReevaluate();
        }
    }

    function _reevaluate(bool debtIncrease) private {
        if(debtIncrease) {
            _hardReevaluate();
        } else {
            _softReevaluate();
        }
    }

    function isPartiallyLiquidated() public view returns (bool) {
        return remainingLiquidationAmount > 0;
    }

    function isToppedUp() public view returns (bool) {
        console.log("In _isToppedUp, result: %s", toppedUpAmount > 0);
        return toppedUpAmount > 0;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function canUntop() public returns (bool) {
        // When not topped up, just return true
        if(!isToppedUp()) return true;
        bool result = comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
        console.log("In canUntop, result: %s", result);
        return result;
    }

}