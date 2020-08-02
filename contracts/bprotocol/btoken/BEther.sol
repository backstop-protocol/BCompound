pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

import { IAvatarCEther } from "../interfaces/IAvatar.sol";

contract BEther is BToken {

    constructor(address _registry, address _cToken) public BToken(_registry, _cToken) {

    }

    function _iAvatarCEther() internal returns (IAvatarCEther) {
        return IAvatarCEther(address(avatar()));
    }

    function mint() external payable {
        _iAvatarCEther().mint.value(msg.value)(cToken);
    }

    function repayBorrow() external payable {
        _iAvatarCEther().repayBorrow.value(msg.value)();
    }
}