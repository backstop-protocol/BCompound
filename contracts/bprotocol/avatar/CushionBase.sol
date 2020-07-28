pragma solidity 0.5.16;

import { AvatarBase } from "./AvatarBase.sol";

contract CushionBase is AvatarBase {

    modifier poolPostOp(bool debtIncrease) {
        _;
        _reevaluate(debtIncrease);
    }

    /**
     * @dev Hard check to ensure untop is allowed and then reset remaining liquidation amount
     */
    function _hardReevaluate() private {
        // Check: must allowed untop
        require(_canUntop(), "Cannot untop");
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
        return toppedUpAmount > 0;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function _canUntop() internal returns (bool) {
        // When not topped up, just return true
        if(!_isToppedUp()) return true;
        return comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
    }

}