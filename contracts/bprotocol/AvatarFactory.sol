pragma solidity 0.5.16;

import { Avatar } from "./Avatar.sol";

/**
 * @dev Factory contract to create new Avatar contracts
 */
contract AvatarFactory {

    address public pool;
    address public comptroller;

    constructor(address _pool, address _comptroller) public {
        require(_pool != address(0), "Pool address is zero");
        require(_comptroller != address(0), "Comptroller address is zero");

        pool = _pool;
        comptroller = _comptroller;
    }

    /**
     * @dev Deploys a new instance of Avatar contract
     */
    function newAvatar() external returns (address) {
        return address(new Avatar(pool, comptroller));
        // TODO Accounting in Registry to maintain that the Avatar is created by the BProtocol
    }
}