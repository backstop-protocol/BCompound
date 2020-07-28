pragma solidity 0.5.16;

import { Avatar } from "./avatar/Avatar.sol";

/**
 * @dev Registry contract to maintain Compound addresses and other details.
 */
contract Registry {

    // Compound Contracts
    address public comptroller;
    address public comp;
    address public cEther;
    address public priceOracle;

    // BProtocol Contracts
    address public pool;
    address public bComptroller;

    // User => avatar
    mapping (address => address) public avatars;

    event NewAvatar(address indexed avatar, address owner);

    constructor(
        address _comptroller,
        address _comp,
        address _cEther,
        address _priceOracle,
        address _pool,
        address _bComptroller
    )
        public
    {
        comptroller = _comptroller;
        comp = _comp;
        cEther = _cEther;
        priceOracle = _priceOracle;
        pool = _pool;
        bComptroller = _bComptroller;
    }

    function newAvatar() external returns (address) {
        return _newAvatar(msg.sender);
    }

    function newAvatarOnBehalfOf(address user) external returns (address) {
        return _newAvatar(user);
    }

    /**
     * @dev Get the user's avatar if exists otherwise create one for him
     * @param user Address of the user
     * @return The existing/new Avatar contract address
     */
    function getAvatar(address user) external returns (address) {
        address avatar = avatars[user];
        if(avatar == address(0)) {
            avatar = _newAvatar(user);
        }
        return avatar;
    }

    /**
     * @dev Create a new Avatar contract for the given user
     * @param user Address of the user
     * @return The address of the newly deployed Avatar contract
     */
    function _newAvatar(address user) internal returns (address) {
        require(!isAvatarExistFor(user), "avatar-already-exits-for-user");
        address avatar = _deployNewAvatar(user);
        avatars[user] = avatar;
        emit NewAvatar(avatar, user);
        return avatar;
    }

    /**
     * @dev Deploys a new instance of Avatar contract
     * @param user Owner address of Avatar contract
     * @return Returns the address of the newly deployed Avatar contract
     */
    function _deployNewAvatar(address user) internal returns (address) {
        return address(new Avatar(user, pool, bComptroller, comptroller, comp, cEther));
    }

    function isAvatarExistFor(address user) public view returns (bool) {
        return avatars[user] != address(0);
    }
}