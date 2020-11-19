pragma solidity 0.5.16;

// interface
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IAvatar } from "../interfaces/IAvatar.sol";
import { IAvatarCEther } from "../interfaces/IAvatar.sol";
import { IAvatarCErc20 } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

import { BTokenScore } from "../scoring/BTokenScore.sol";

// Libs
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken is BTokenScore {
    using SafeERC20 for IERC20;

    // BProtocol Registry contract
    IRegistry public registry;
    // Compound's CToken this BToken contract is tied to
    address public cToken;
    // Pool contract
    address public pool;
    bool public isCEther = false;
    IERC20 public underlying;

    constructor(address _registry, address _cToken, address _pool) public {
        registry = IRegistry(_registry);
        cToken = _cToken;
        pool = _pool;
        isCEther = _cToken == registry.cEther();
        if(! isCEther) underlying = ICToken(cToken).underlying();
    }

    function avatar() public returns (IAvatar) {
        return IAvatar(registry.getAvatar(msg.sender));
    }

    function _iAvatarCEther() internal returns (IAvatarCEther) {
        return IAvatarCEther(address(avatar()));
    }

    function _iAvatarCErc20() internal returns (IAvatarCErc20) {
        return IAvatarCErc20(address(avatar()));
    }

    function toUnderlying(uint256 redeemTokens) internal returns (uint256) {
        uint256 exchangeRate = ICToken(cToken).exchangeRateCurrent();
        return mulTrucate(redeemTokens, exchangeRate);
    }

    // Math functions
    // ===============
    function mulTrucate(uint a, uint b) internal pure returns (uint) {
        return mul_(a, b) / 1e18;
    }

    function mul_(uint a, uint b) pure internal returns (uint) {
        if (a == 0 || b == 0) {
            return 0;
        }
        uint c = a * b;
        require(c / a == b);
        return c;
    }


    // CEther
    // =======
    function mint() external payable {
        _iAvatarCEther().mint.value(msg.value)(cToken);
        updateCollScore(msg.sender, cToken, toInt256(msg.value));
    }

    function repayBorrow() external payable {
        _iAvatarCEther().repayBorrow.value(msg.value)();
        updateDebtScore(msg.sender, cToken, -toInt256(msg.value));
    }

    // CErc20
    // =======
    function mint(uint256 mintAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = _iAvatarCErc20();
        underlying.safeTransferFrom(msg.sender, address(_avatar), mintAmount);
        _iAvatarCErc20().mint(cToken, mintAmount);
        updateCollScore(msg.sender, cToken, toInt256(mintAmount));
    }

    function repayBorrow(uint256 repayAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = _iAvatarCErc20();
        uint256 actualRepayAmount = repayAmount;
        if(repayAmount == uint256(-1)) {
            actualRepayAmount = _avatar.borrowBalanceCurrent(cToken);
        }
        underlying.safeTransferFrom(msg.sender, address(_avatar), actualRepayAmount);
        uint256 result = _avatar.repayBorrow(cToken, actualRepayAmount);
        updateDebtScore(msg.sender, cToken, -toInt256(repayAmount));
        return result;
    }

    // CEther / CErc20
    // ===============
    function redeem(uint256 redeemTokens) external returns (uint256) {
        uint256 result = avatar().redeem(cToken, redeemTokens);
        uint256 underlyingRedeemAmount = toUnderlying(redeemTokens);
        updateCollScore(msg.sender, cToken, -toInt256(underlyingRedeemAmount));
        return result;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        uint256 result = avatar().redeemUnderlying(cToken, redeemAmount);
        updateCollScore(msg.sender, cToken, -toInt256(redeemAmount));
        return result;
    }

    function borrow(uint256 borrowAmount) external returns (uint256) {
        uint256 result = avatar().borrow(cToken, borrowAmount);
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
        require(registry.isAvatarExist(targetAvatar), "avatar-not-exists");
        require(msg.sender == pool, "only-pool-is-authorized");

        uint256 seizedCTokens = IAvatar(targetAvatar).liquidateBorrow.value(msg.value)(cToken, amount, collateral);
        // Convert seizedCToken to underlyingTokens
        uint256 underlyingSeizedTokens = toUnderlying(seizedCTokens);
        updateCollScore(targetAvatar, cToken, -toInt256(underlyingSeizedTokens));
        updateDebtScore(targetAvatar, collateral, -toInt256(amount));
    }

    // IERC20
    // =======
    function transfer(address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transfer(cToken, dst, amount);
        uint256 underlyingRedeemAmount = toUnderlying(amount);
        updateCollScore(msg.sender, cToken, -toInt256(underlyingRedeemAmount));
        return result;
    }

    function transferFrom(address src, address dst, uint256 amount) external returns (bool) {
        bool result = avatar().transferFrom(cToken, src, dst, amount);

        uint256 underlyingRedeemAmount = toUnderlying(amount);
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