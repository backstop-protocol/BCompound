pragma solidity 0.5.16;

interface IBComptroller {

    function isCTokenSupported(address cToken) external view returns (bool);

    function isBTokenSupported(address bToken) external view returns (bool);
}