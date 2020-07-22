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

    modifier onlyUser() {
        // FIXME Improve this as `IRegistry.avatars` is called twice.
        // FIXME try to think how to do the extrnal function call only once.
        require(registry.avatars(msg.sender) != address(0), "Avatar not found for user");
        _;
    }

    constructor(address _registry, address _cToken) public {
        registry = IRegistry(_registry);
        cToken = _cToken;
    }

    // CEther
    function mint() public onlyUser payable {
        IAvatar avatar = IAvatar(registry.avatars(msg.sender));
        avatar.mint.value(msg.value)(cToken);
    }

    // CErc20

}