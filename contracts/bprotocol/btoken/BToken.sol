pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { IAvatar } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @dev BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken {
    using SafeERC20 for IERC20;

    // BProtocol Registry contract
    IRegistry public registry;
    // Compound's CToken this BToken contract is tied to
    address public cToken;

    constructor(address _registry, address _cToken) internal {
        registry = IRegistry(_registry);
        cToken = _cToken;
    }

    function avatar() public returns (IAvatar) {
        return IAvatar(registry.getAvatar(msg.sender));
    }

    // CEther / CErc20
    // ===============
    function redeem(uint256 redeemTokens) external returns (uint256) {
        return avatar().redeem(cToken, redeemTokens);
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        return avatar().redeemUnderlying(cToken, redeemAmount);
    }

    function borrow(uint256 borrowAmount) external returns (uint256) {
        return avatar().borrow(cToken, borrowAmount);
    }

    // IERC20
    // =======
    function transfer(address dst, uint256 amount) external returns (bool) {
        return avatar().transfer(cToken, dst, amount);
    }

    function transferFrom(address src, address dst, uint256 amount) external returns (bool) {
        return avatar().transferFrom(cToken, src, dst, amount);
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