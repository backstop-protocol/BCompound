pragma solidity 0.5.16;

import { IRegistry } from "./interfaces/IRegistry.sol";
import { IAvatar } from "./interfaces/IAvatar.sol";

/**
 * @dev BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken {

    IRegistry public registry;
    // Compoun's CToken this BToken contract is tied to
    address public cToken;

    constructor(address _registry, address _cToken) public {
        registry = IRegistry(_registry);
        cToken = _cToken;
    }

    function avatar() public returns (IAvatar) {
        return IAvatar(registry.avatars(msg.sender));
    }

    // CEther
    function mint() public payable {
        avatar().mint.value(msg.value)(cToken);
    }

    // CErc20

}