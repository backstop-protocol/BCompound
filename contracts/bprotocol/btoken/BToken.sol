pragma solidity 0.5.16;

// Interface
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IAvatar } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

import { BTokenScore } from "../scoring/BTokenScore.sol";

// Libs
import { Exponential } from "../lib/Exponential.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken is BTokenScore, Exponential {
    using SafeERC20 for IERC20;

    // BProtocol Registry contract
    IRegistry public registry;
    // Compound's CToken this BToken contract is tied to
    address public cToken;
    // Pool contract
    address public pool;

    constructor(address _registry, address _cToken, address _pool) internal {
        registry = IRegistry(_registry);
        cToken = _cToken;
        pool = _pool;
    }

    function avatar() public returns (IAvatar) {
        return IAvatar(registry.getAvatar(msg.sender));
    }

    function _toUnderlying(uint256 redeemTokens) internal returns (uint256) {
        uint256 exchangeRate = ICToken(cToken).exchangeRateCurrent();
        return mulTrucate(redeemTokens, exchangeRate);
    }

    // CEther / CErc20
    // ===============
    function borrowBalanceCurrent(address _avatar) external returns (uint256) {
        address toppedUpCToken = IAvatar(_avatar).toppedUpCToken();
        if(toppedUpCToken == cToken) {
            uint256 toppedUpAmount = IAvatar(_avatar).toppedUpAmount();
            return add_(toppedUpAmount, ICToken(cToken).borrowBalanceCurrent(_avatar));
        } else {
            return ICToken(cToken).borrowBalanceCurrent(_avatar);
        }
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        uint256 result = avatar().redeem(cToken, redeemTokens);
        require(result == 0, "BToken: redeem-failed");
        uint256 underlyingRedeemAmount = _toUnderlying(redeemTokens);
        updateCollScore(msg.sender, cToken, -toInt256(underlyingRedeemAmount));
        return result;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        uint256 result = avatar().redeemUnderlying(cToken, redeemAmount);
        require(result == 0, "BToken: redeemUnderlying-failed");
        updateCollScore(msg.sender, cToken, -toInt256(redeemAmount));
        return result;
    }

    function borrow(uint256 borrowAmount) external returns (uint256) {
        uint256 result = avatar().borrow(cToken, borrowAmount);
        require(result == 0, "BToken: borrow-failed");
        updateDebtScore(msg.sender, cToken, toInt256(borrowAmount));
        return result;
    }

    /**
     * @dev Liquidate borrow an Avatar
     * @notice Only Pool contract can call this function
     * @param targetAvatar Avatar to liquidate
     * @param amount Underlying amount to liquidate
     * @param collateral Collateral CToken address
     */
    function liquidateBorrow(
        address targetAvatar,
        uint256 amount,
        address collateral
    )
        external
        payable
    {
        require(registry.isAvatarExist(targetAvatar), "BToken: avatar-not-exists");
        require(msg.sender == pool, "BToken: only-pool-is-authorized");

        uint256 seizedCTokens = IAvatar(targetAvatar).liquidateBorrow.value(msg.value)(cToken, amount, collateral);
        // Convert seizedCToken to underlyingTokens
        uint256 underlyingSeizedTokens = _toUnderlying(seizedCTokens);
        updateCollScore(targetAvatar, cToken, -toInt256(underlyingSeizedTokens));
        updateDebtScore(targetAvatar, collateral, -toInt256(amount));
    }

    // IERC20
    // =======
    function transfer(address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transfer(cToken, dst, amount);
        require(result, "BToken: transfer-failed");
        uint256 underlyingRedeemAmount = _toUnderlying(amount);
        updateCollScore(msg.sender, cToken, -toInt256(underlyingRedeemAmount));
        return result;
    }

    function transferFrom(address src, address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transferFrom(cToken, src, dst, amount);
        require(result, "BToken: transferFrom-failed");

        uint256 underlyingRedeemAmount = _toUnderlying(amount);
        // If src is an Avatar, deduct coll score
        address srcUser = registry.userOf(src);
        if(srcUser != address(0)) updateCollScore(srcUser, cToken, -toInt256(underlyingRedeemAmount));

        // if dst is an Avatar, increase coll score
        address dstUser = registry.userOf(dst);
        if(dstUser != address(0)) updateCollScore(dstUser, cToken, toInt256(underlyingRedeemAmount));
        return result;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        return avatar().approve(cToken, spender, amount);
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return ICToken(cToken).allowance(registry.avatars(owner), spender);
    }

    function balanceOf(address user) public view returns (uint256) {
        return ICToken(cToken).balanceOf(registry.avatars(user));
    }

    function name() public view returns (string memory) {
        return ICToken(cToken).name();
    }

    function symbol() public view returns (string memory) {
        return ICToken(cToken).symbol();
    }

    function decimals() public view returns (uint8) {
        return ICToken(cToken).decimals();
    }

    function totalSupply() public view returns (uint256) {
        return ICToken(cToken).totalSupply();
    }
}