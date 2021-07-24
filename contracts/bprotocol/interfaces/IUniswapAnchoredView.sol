pragma experimental ABIEncoderV2;
pragma solidity 0.5.16;

interface IUniswapAnchoredView {
    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external;
    function price(string calldata symbol) external view returns (uint);
    function getUnderlyingPrice(address cToken) external view returns (uint);
}