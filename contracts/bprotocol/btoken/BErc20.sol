pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

import { IAvatarCErc20 } from "../interfaces/IAvatar.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BErc20 is BToken {

    IERC20 public underlying;

    constructor(
        address _registry,
        address _cToken,
        address _pool
    ) public BToken(_registry, _cToken, _pool) {
        underlying = ICToken(cToken).underlying();
    }

    function _iAvatarCErc20() internal returns (IAvatarCErc20) {
        return IAvatarCErc20(address(avatar()));
    }

    function mint(uint256 mintAmount) external returns (uint256) {
        IAvatarCErc20 _avatar = _iAvatarCErc20();
        underlying.safeTransferFrom(msg.sender, address(_avatar), mintAmount);
        // TODO tokens can be lost in case CToken returns error
        // TODO add test
        uint256 result = _avatar.mint(cToken, mintAmount);
        // TODO also score should only be updated when mint success
        updateCollScore(msg.sender, cToken, toInt256(mintAmount));
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
        updateDebtScore(msg.sender, cToken, -toInt256(repayAmount));
        return result;
    }
}