pragma solidity 0.5.16;

interface IBTokenScore {
    function start() external view returns (uint);
    function spin() external;

    function getDebtScore(address user, address cToken, uint256 time) external view returns (uint);
    function getCollScore(address user, address cToken, uint256 time) external view returns (uint);

    function getDebtGlobalScore(address cToken, uint256 time) external view returns (uint);
    function getCollGlobalScore(address cToken, uint256 time) external view returns (uint);

    function endTime() external view returns(uint);
}