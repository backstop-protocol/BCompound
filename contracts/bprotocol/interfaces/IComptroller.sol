pragma solidity 0.5.16;

interface IComptroller {

    function oracle() external returns (address);

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cToken) external returns (uint);
    function getAssetsIn(address account) external view returns (address[] memory);

    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external returns (uint);
}
