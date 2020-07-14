pragma solidity 0.5.16;

interface IComptroller {

    // FROM ComptrollerLensInterface.sol
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (address);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (address[] memory);
    function claimComp(address) external;
    function compAccrued(address) external view returns (uint);


    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cToken) external returns (uint);

    function mintAllowed(address cToken, address minter, uint mintAmount) external returns (uint);
    function borrowAllowed(address cToken, address borrower, uint borrowAmount) external returns (uint);
}