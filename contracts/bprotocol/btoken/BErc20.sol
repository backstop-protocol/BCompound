pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

import { IAvatarCErc20 } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BErc20 is BToken {

    IERC20 public underlying;

    constructor(
        address _registry,
        address _cToken
    ) public BToken(_registry, _cToken) {
        underlying = ICToken(cToken).underlying();
    }

    function _iAvatarCErc20() internal returns (IAvatarCErc20) {
        return IAvatarCErc20(address(avatar()));
    }

    function mint(uint256 mintAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = _iAvatarCErc20();
        underlying.safeTransferFrom(msg.sender, address(_avatar), mintAmount);
        uint256 result = _avatar.mint(cToken, mintAmount);
        require(result == 0, "BErc20: mint-failed");
        return result;
    }

    function repayBorrow(uint256 repayAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = _iAvatarCErc20();
        uint256 actualRepayAmount = repayAmount;
        if(repayAmount == uint256(-1)) {
            actualRepayAmount = _avatar.borrowBalanceCurrent(cToken);
        }
        underlying.safeTransferFrom(msg.sender, address(_avatar), actualRepayAmount);
        uint256 result = _avatar.repayBorrow(cToken, actualRepayAmount);
        require(result == 0, "BErc20: repayBorrow-failed");
        return result;
    }

    function liquidateBorrow(address borrower, uint repayAmount, address cTokenCollateral) external onlyPool returns (uint) {
        address borrowerAvatar = registry.avatarOf(borrower);
        uint result = IAvatarCErc20(borrowerAvatar).liquidateBorrow(repayAmount, cTokenCollateral);
        require(result == 0, "BErc20: liquidateBorrow-failed");
        return result;
    }
}