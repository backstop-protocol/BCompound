pragma solidity 0.5.16;

interface IBTokenScore {
    function getDebtScore(address user, address cToken, uint256 time, uint256 spinStart) external view returns (uint);
    function getCollScore(address user, address cToken, uint256 time, uint256 spinStart) external view returns (uint);

    function getDebtGlobalScore(address cToken, uint256 time, uint256 spinStart) external view returns (uint);
    function getCollGlobalScore(address cToken, uint256 time, uint256 spinStart) external view returns (uint);
}