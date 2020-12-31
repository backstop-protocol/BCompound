pragma solidity 0.5.16;

import { Avatar } from "./avatar/Avatar.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

/**
 * @dev Registry contract to maintain Compound, BProtocol and avatar address.
 */
contract Registry is Ownable {

    // Compound Contracts
    address public comptroller;
    address public comp;
    address public cEther;

    // BProtocol Contracts
    address public pool;
    address public bComptroller;
    address public score;

    // Owner => Avatar
    mapping (address => address) public avatarOf;

    // Avatar => Owner
    mapping (address => address) public ownerOf;

    // An Avatar can have multiple Delegatee
    // Avatar => Delegatee => bool
    mapping (address => mapping(address => bool)) public delegate;

    // dummy caller, for safer delegate and execute
    DummyCaller public dummyCaller;

    event NewAvatar(address indexed avatar, address owner);
    event Delegate(address indexed delegator, address avatar, address delegatee);
    event RevokeDelegate(address indexed delegator, address avatar, address delegatee);
    event NewPool(address oldPool, address newPool);
    event NewScore(address oldScore, address newScore);

    constructor(
        address _comptroller,
        address _comp,
        address _cEther,
        address _pool,
        address _bComptroller,
        address _score
    )
        public
    {
        comptroller = _comptroller;
        comp = _comp;
        cEther = _cEther;
        pool = _pool;
        bComptroller = _bComptroller;
        score = _score;

        dummyCaller = new DummyCaller();
    }

    function setPool(address newPool) external onlyOwner {
        require(newPool != address(0), "Registry: pool-address-is-zero");
        address oldPool = pool;
        pool = newPool;
        emit NewPool(oldPool, newPool);
    }

    function setScore(address newScore) external onlyOwner {
        require(newScore != address(0), "Registry: score-address-is-zero");
        address oldScore = score;
        score = newScore;
        emit NewScore(oldScore, newScore);
    }

    function newAvatar() external returns (address) {
        return _newAvatar(msg.sender);
    }

    function getAvatar(address _owner) public returns (address) {
        require(_owner != address(0), "Registry: owner-address-is-zero");
        address _avatar = avatarOf[_owner];
        if(_avatar == address(0)) {
            _avatar = _newAvatar(_owner);
        }
        return _avatar;
    }

    function delegateAvatar(address delegatee) public {
        require(delegatee != address(0), "Registry: delegatee-address-is-zero");
        address _avatar = avatarOf[msg.sender];
        require(_avatar != address(0), "Registry: avatar-not-found");

        delegate[_avatar][delegatee] = true;
        emit Delegate(msg.sender, _avatar, delegatee);
    }

    function revokeDelegateAvatar(address delegatee) public {
        address _avatar = avatarOf[msg.sender];
        require(_avatar != address(0), "Registry: avatar-not-found");
        require(delegate[_avatar][delegatee], "Registry: not-delegated");

        delegate[_avatar][delegatee] = false;
        emit RevokeDelegate(msg.sender, _avatar, delegatee);
    }

    function delegateAndExecuteOnce(address delegatee, address payable target, bytes calldata data) external payable {
        // make sure there is an avatar
        getAvatar(msg.sender);
        delegateAvatar(delegatee);
        dummyCaller.execute.value(msg.value)(target, data);
        revokeDelegateAvatar(delegatee);
    }

    function _newAvatar(address _owner) internal returns (address) {
        require(avatarOf[_owner] == address(0), "Registry: avatar-exits-for-owner");
        // _owner should not be an avatar address
        require(ownerOf[_owner] == address(0), "Registry: cannot-create-an-avatar-of-avatar");
        address _avatar = address(new Avatar(bComptroller, comptroller, comp, cEther, address(this)));
        avatarOf[_owner] = _avatar;
        ownerOf[_avatar] = _owner;
        emit NewAvatar(_avatar, _owner);
        return _avatar;
    }

    function doesAvatarExist(address _avatar) public view returns (bool) {
        return ownerOf[_avatar] != address(0);
    }

    function doesAvatarExistFor(address _owner) public view returns (bool) {
        return avatarOf[_owner] != address(0);
    }
}

contract DummyCaller {
    function execute(address target, bytes calldata data) external payable {
        (bool succ, bytes memory err) = target.call.value(msg.value)(data);
        require(succ, string(err));
    }
}
