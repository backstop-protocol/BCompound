pragma solidit ^0.6.0;

import { Avatar } from "./Avatar.sol";

contract AvatarFactory {

    address public registry;
    address public avatarImpl;

    constructor(address _registry, address _avatarImpl) public {
        registry = _registry;
        avatarImpl = _avatarImpl;
    }

    function newAvatar() external returns (address) {
        bytes memory data = ""; // TODO call initialize
        NonUpgradeableProxy proxy = new NonUpgradeableProxy(avatarImpl, data);
        return proxy;
    }
}