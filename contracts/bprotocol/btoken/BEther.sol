pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

import { IAvatarCEther } from "../interfaces/IAvatar.sol";

contract BEther is BToken {

    constructor(
        address _registry,
        address _cToken,
        address _pool
    ) public BToken(_registry, _cToken, _pool) {}

    function _iAvatarCEther() internal returns (IAvatarCEther) {
        return IAvatarCEther(address(avatar()));
    }

    function mint() external payable {
        // CEther calls requireNoError() to ensure no failures
        _iAvatarCEther().mint.value(msg.value)(cToken);
        updateCollScore(msg.sender, cToken, toInt256(msg.value));
    }

    function repayBorrow() external payable {
        // CEther calls requireNoError() to ensure no failures
        _iAvatarCEther().repayBorrow.value(msg.value)();
        updateDebtScore(msg.sender, cToken, -toInt256(msg.value));
    }
}