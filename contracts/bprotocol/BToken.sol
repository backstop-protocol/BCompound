pragma solidity 0.5.16;

import { IRegistry } from "./interfaces/IRegistry.sol";
import { IAvatar } from "./interfaces/IAvatar.sol";
import { IAvatarCEther } from "./interfaces/IAvatar.sol";
import { IAvatarCErc20 } from "./interfaces/IAvatar.sol";
import { ICToken } from "./interfaces/CTokenInterfaces.sol";

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
    bool public isCEther = false;

    constructor(address _registry, address _cToken) public {
        registry = IRegistry(_registry);
        cToken = _cToken;
        isCEther = _cToken == registry.cEther();
    }

    // HELPER FUNCTIONS
    // =================
    function _newAvatarIfNotExists() internal returns (address) {
        address avatar = registry.avatars(msg.sender);
        if(avatar == address(0)) {
            avatar = registry.newAvatar();
        }
        return avatar;
    }

    function avatar() public returns (IAvatar) {
        return IAvatar(registry.avatars(msg.sender));
    }

    function _iAvatarCEther() internal returns (IAvatarCEther) {
        return IAvatarCEther(registry.avatars(msg.sender));
    }

    function _iAvatarCErc20() internal returns (IAvatarCErc20) {
        return IAvatarCErc20(registry.avatars(msg.sender));
    }

    // CEther
    // =======
    function mint() external payable {
        IAvatarCEther _avatar = IAvatarCEther(_newAvatarIfNotExists());
        _avatar.mint.value(msg.value)(cToken);
    }

    function repayBorrow() external payable {
        _iAvatarCEther().repayBorrow.value(msg.value)();
    }

    function repayBorrowBehalf(address borrower) external payable {
        _iAvatarCEther().repayBorrowBehalf.value(msg.value)(borrower);
    }

    // CErc20
    // =======
    function mint(uint256 mintAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = IAvatarCErc20(_newAvatarIfNotExists());
        _avatar.mint(cToken, mintAmount);
    }

    function repayBorrow(uint256 repayAmount) external returns (uint256) {
        return _iAvatarCErc20().repayBorrow(cToken, repayAmount);
    }

    function repayBorrowBehalf(address borrower, uint256 repayAmount) external returns (uint256) {
        return _iAvatarCErc20().repayBorrowBehalf(cToken, borrower, repayAmount);
    }

    // CEther / CErc20
    // ===============
    function redeem(uint256 redeemTokens) external returns (uint256) {
        uint256 result = avatar().redeem(cToken, redeemTokens);
        if(isCEther) {
            msg.sender.transfer(address(this).balance);
        } else {
            IERC20 underlying = ICToken(cToken).underlying();
            uint256 balance = underlying.balanceOf(address(this));
            underlying.safeTransfer(msg.sender, balance);
        }
        return result;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        uint256 result = avatar().redeemUnderlying(cToken, redeemAmount);
        if(isCEther) {
            msg.sender.transfer(redeemAmount);
        } else {
            IERC20 underlying = ICToken(cToken).underlying();
            underlying.safeTransfer(msg.sender, redeemAmount);
        }
        return result;
    }

    function borrow(uint256 borrowAmount) external returns (uint256) {
        uint256 result = avatar().borrow(cToken, borrowAmount);
        if(isCEther) {
            msg.sender.transfer(borrowAmount);
        } else {
            IERC20 underlying = ICToken(cToken).underlying();
            underlying.safeTransfer(msg.sender, borrowAmount);
        }
        return result;
    }

    function liquidateBorrow(uint256 underlyingAmtToLiquidate, address collCToken) external payable {
        avatar().liquidateBorrow(cToken, underlyingAmtToLiquidate, collCToken);
        IERC20 collToken = IERC20(collCToken);
        uint256 balance = collToken.balanceOf(address(this));
        collToken.safeTransfer(msg.sender, balance);
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

    /**
     * @dev Receive ETH from Avatar contract
     */
    function () external payable {
        // Receive ETH from Avatar
    }
}