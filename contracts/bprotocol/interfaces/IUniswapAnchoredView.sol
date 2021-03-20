pragma experimental ABIEncoderV2;
pragma solidity 0.5.16;

interface IUniswapAnchoredView {
    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external;
}