pragma solidity 0.5.16;

interface IAvatarFactory {
    function newAvatar() external returns (address);
}