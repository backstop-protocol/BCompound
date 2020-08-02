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
        require(_canUntop(), "cannot-untop");
        // Reset it to force re-calculation
        remainingLiquidationAmount = 0;
    }

    /**
     * @dev Soft check and reset remaining liquidation amount
     */
    function _softReevaluate() private {
        if(_isPartiallyLiquidated()) {
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

    function _isPartiallyLiquidated() internal view returns (bool) {
        return remainingLiquidationAmount > 0;
    }

    function _isToppedUp() internal view returns (bool) {
        console.log("In _isToppedUp, result: %s", toppedUpAmount > 0);
        return toppedUpAmount > 0;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function _canUntop() internal returns (bool) {
        // When not topped up, just return true
        if(!_isToppedUp()) return true;
        bool result = comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
        console.log("In _canUntop, result: %s", result);
        return result;
    }

}