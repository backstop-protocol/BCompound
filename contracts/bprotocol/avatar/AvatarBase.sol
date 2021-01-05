pragma solidity 0.5.16;

// TODO To be removed in mainnet deployment
import "hardhat/console.sol";

import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { IComptroller } from "../interfaces/IComptroller.sol";
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IScore } from "../interfaces/IScore.sol";
import { Exponential } from "../lib/Exponential.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Initializable } from "openzeppelin-upgrades/packages/core/contracts/Initializable.sol";

contract AvatarBase is Exponential, Initializable {
    using SafeERC20 for IERC20;

    IRegistry public registry;

    /* Storage for topup details */
    // Topped up cToken
    ICToken public toppedUpCToken;
    // Topped up amount of tokens
    uint256 public toppedUpAmount;
    // Remaining max amount available for liquidation
    uint256 public remainingLiquidationAmount;
    // Liquidation cToken
    ICToken public liquidationCToken;

    modifier onlyAvatarOwner() {
        require(msg.sender == registry.ownerOf(address(this)), "sender-is-not-owner");
        _;
    }

    modifier onlyPool() {
        require(msg.sender == pool(), "only-pool-is-authorized");
        _;
    }

    modifier onlyBComptroller() {
        require(msg.sender == registry.bComptroller(), "only-BComptroller-is-authorized");
        _;
    }

    modifier postPoolOp(bool debtIncrease) {
        _;
        _reevaluate(debtIncrease);
    }

    function _initAvatarBase(address _registry) internal initializer {
        registry = IRegistry(_registry);
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

    function _isCEther(ICToken cToken) internal view returns (bool) {
        return address(cToken) == registry.cEther();
    }

    function _score() internal view returns (IScore) {
        return IScore(registry.score());
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        int256 result = int256(value);
        require(result >= 0, "Cast from uint to int failed");
        return result;
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
        IComptroller comptroller = IComptroller(registry.comptroller());
        bool result = comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
        console.log("In canUntop, result: %s", result);
        return result;
    }

    function pool() public view returns (address payable) {
        return address(uint160(registry.pool()));
    }
}