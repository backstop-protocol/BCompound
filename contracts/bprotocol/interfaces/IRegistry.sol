pragma solidity 0.5.16;


interface IRegistry {

    function cEther() external returns (address);

    function avatars(address user) external returns (address);
    function isAvatarExistFor(address user) external view returns (bool);
    function newAvatar() external returns (address);
}