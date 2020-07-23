pragma solidity 0.5.16;

import { IAvatarFactory } from "./interfaces/IAvatarFactory.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

/**
 * @dev Registry contract to maintain Compound addresses and other details.
 */
contract Registry is Ownable {

    // Compound Contracts
    address public comptroller;
    // CEther contract address
    address public cEther;
    address public priceOracle;

    // BProtocol Contracts
    IAvatarFactory public avatarFactory;

    // User => avatar
    mapping (address => address) public avatars;

    constructor(
        address _comptroller,
        address _cEther,
        address _priceOracle,
        address _avatarFactory
    )
        public
    {
        require(_comptroller != address(0), "Comptroller address is zero");
        require(_priceOracle != address(0), "PriceOracle address is zero");

        comptroller = _comptroller;
        cEther = _cEther;
        priceOracle = _priceOracle;
        avatarFactory = IAvatarFactory(_avatarFactory);
    }

    function newAvatar() external returns (address) {
        require(!isAvatarExistFor(msg.sender), "Avatar already exits for user");
        address avatar = avatarFactory.newAvatar();
        avatars[msg.sender] = avatar;
        return avatar;
    }

    function isAvatarExistFor(address user) public view returns (bool) {
        return avatars[user] != address(0);
    }
}