pragma solidity 0.5.16;

// Interface
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IAvatar } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

// Libs
import { Exponential } from "../lib/Exponential.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken is Exponential {
    using SafeERC20 for IERC20;

    // BProtocol Registry contract
    IRegistry public registry;
    // Compound's CToken this BToken contract is tied to
    address public cToken;

    modifier onlyPool() {
        require(msg.sender == registry.pool(), "BToken: only-pool-is-authorized");
        _;
    }

    constructor(address _registry, address _cToken) internal {
        registry = IRegistry(_registry);
        cToken = _cToken;
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
    function borrowBalanceCurrent(address account) external returns (uint256) {
        address _avatar = registry.getAvatar(account);
        return IAvatar(_avatar).borrowBalanceCurrent(cToken);
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        uint256 result = avatar().redeem(cToken, redeemTokens);
        require(result == 0, "BToken: redeem-failed");
        return result;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        uint256 result = avatar().redeemUnderlying(cToken, redeemAmount);
        require(result == 0, "BToken: redeemUnderlying-failed");
        return result;
    }

    function borrow(uint256 borrowAmount) external returns (uint256) {
        uint256 result = avatar().borrow(cToken, borrowAmount);
        require(result == 0, "BToken: borrow-failed");
        return result;
    }


    // IERC20
    // =======
    function transfer(address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transfer(cToken, dst, amount);
        require(result, "BToken: transfer-failed");
        return result;
    }

    function transferFrom(address src, address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transferFrom(cToken, src, dst, amount);
        require(result, "BToken: transferFrom-failed");
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