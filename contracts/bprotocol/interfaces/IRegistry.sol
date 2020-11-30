pragma solidity 0.5.16;


interface IRegistry {

    // Compound contracts
    function comptroller() external view returns (address);
    function cEther() external view returns (address);

    // B.Protocol contracts
    function score() external view returns (address);
    function pool() external view returns (address);
    function jar() external view returns (address);

    // Avatar functions
    function isAvatarHasDelegatee(address avatar, address delegatee) external view returns (bool);
    function avatars(address user) external view returns (address);
    function isAvatarExist(address avatar) external view returns (bool);
    function isAvatarExistFor(address user) external view returns (bool);
    function userOf(address avatar) external view returns (address);
    function avatarOf(address user) external view returns (address);
    function newAvatar() external returns (address);
    function getAvatar(address user) external returns (address);
}