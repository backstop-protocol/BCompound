pragma solidity 0.5.16;


interface IRegistry {

    function cEther() external returns (address);

    function avatars(address user) external view returns (address);
    function isAvatarExist(address avatar) external view returns (bool);
    function isAvatarExistFor(address user) external view returns (bool);
    function userOf(address avatar) external view returns (address);
    function avatarOf(address user) external view returns (address);
    function newAvatar() external returns (address);
    function getAvatar(address user) external returns (address);
}