pragma solidity 0.5.16;

import { Avatar } from "./avatar/Avatar.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

/**
 * @dev Registry contract to maintain Compound addresses and other details.
 */
contract Registry is Ownable {

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

    function _newAvatar(address user) internal returns (address) {
        require(!isAvatarExistFor(user), "Avatar already exits for user");
        address avatar = _deployNewAvatar();
        avatars[user] = avatar;
        return avatar;
    }

    /**
     * @dev Deploys a new instance of Avatar contract
     */
    function _deployNewAvatar() internal returns (address) {
        return address(new Avatar(pool, bComptroller, comptroller, comp, cEther));
    }

    function isAvatarExistFor(address user) public view returns (bool) {
        return avatars[user] != address(0);
    }
}