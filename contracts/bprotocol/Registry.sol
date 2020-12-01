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
    address public score;
    address public jar;

    // Owner => Avatar
    mapping (address => address) public ownerToAvatar;

    // Avatar => Owner
    mapping (address => address) public avatarToOwner;

    // An Avatar can have multiple Delegatee
    // Avatar => Delegatee => bool
    mapping (address => mapping(address => bool)) public isAvatarHasDelegatee;

    event NewAvatar(address indexed avatar, address owner);
    event AvatarTransferOwnership(address indexed avatar, address oldOwner, address newOwner);
    event Delegate(address indexed delegator, address avatar, address delegatee);
    event RevokeDelegate(address indexed delegator, address avatar, address delegatee);

    constructor(
        address _comptroller,
        address _comp,
        address _cEther,
        address _priceOracle,
        address _pool,
        address _bComptroller,
        address _score,
        address _jar
    )
        public
    {
        comptroller = _comptroller;
        comp = _comp;
        cEther = _cEther;
        priceOracle = _priceOracle;
        pool = _pool;
        bComptroller = _bComptroller;
        score = _score;
        jar = _jar;
    }

    function newAvatar() external returns (address) {
        return _newAvatar(msg.sender);
    }

    function newAvatarOnBehalfOf(address owner) external returns (address) {
        return _newAvatar(owner);
    }

    /**
     * @dev Get the owner's avatar if exists otherwise create one for him
     * @param owner Address of the owner
     * @return The existing/new Avatar contract address
     */
    function getAvatar(address owner) external returns (address) {
        address avatar = ownerToAvatar[owner];
        if(avatar == address(0)) {
            avatar = _newAvatar(owner);
        }
        return avatar;
    }

    function transferAvatarOwnership(address newOwner) external {
        require(newOwner != address(0), "Registry: newOwner-is-zero-address");
        address avatar = ownerToAvatar[msg.sender];
        require(avatar != address(0), "Registry: avatar-not-found");

        delete ownerToAvatar[msg.sender];
        delete avatarToOwner[avatar];

        ownerToAvatar[newOwner] = avatar;
        avatarToOwner[avatar] = newOwner;
        emit AvatarTransferOwnership(avatar, msg.sender, newOwner);
    }

    function delegateAvatar(address delegatee) external {
        address avatar = ownerToAvatar[msg.sender];
        require(avatar != address(0), "Registry: avatar-not-found");

        isAvatarHasDelegatee[avatar][delegatee] = true;
        emit Delegate(msg.sender, avatar, delegatee);
    }

    function revokeDelegateAvatar(address delegatee) external {
        address avatar = ownerToAvatar[msg.sender];
        require(avatar != address(0), "Registry: avatar-not-found");
        require(isAvatarHasDelegatee[avatar][delegatee], "Registry: not-delegated");

        isAvatarHasDelegatee[avatar][delegatee] = false;
        emit RevokeDelegate(msg.sender, avatar, delegatee);
    }

    /**
     * @dev Create a new Avatar contract for the given owner
     * @param owner Address of the owner
     * @return The address of the newly deployed Avatar contract
     */
    function _newAvatar(address owner) internal returns (address) {
        require(!isAvatarExistFor(owner), "avatar-already-exits-for-owner");
        address avatar = address(new Avatar(bComptroller, comptroller, comp, cEther, address(this)));
        ownerToAvatar[owner] = avatar;
        avatarToOwner[avatar] = owner;
        emit NewAvatar(avatar, owner);
        return avatar;
    }

    function isAvatarExist(address avatar) public view returns (bool) {
        return avatarToOwner[avatar] != address(0);
    }

    function isAvatarExistFor(address owner) public view returns (bool) {
        return ownerToAvatar[owner] != address(0);
    }

    function ownerOf(address avatar) public view returns (address) {
        return avatarToOwner[avatar];
    }

    function avatarOf(address owner) public view returns (address) {
        return ownerToAvatar[owner];
    }
}