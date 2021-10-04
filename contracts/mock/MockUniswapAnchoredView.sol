pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";

contract MockUniswapAnchoredView {
    // cToken => uint
    mapping(address => uint) public prices;
    // symbol => cToken
    mapping(string => address) public symbolToCTokens;
    // cToken => symbol
    mapping(address => string) public cTokenToSymbol;
    // cToken => decimals
    mapping(address => uint) public cTokenDecimals;

    constructor(string[] memory symbols, address[] memory cTokens, uint[] memory decimals) public {

        for (uint i = 0; i < symbols.length; i++) {
            string memory symbol = symbols[i];
            address cToken = cTokens[i];
            uint decimal = decimals[i];
            symbolToCTokens[symbol] = cToken;
            cTokenToSymbol[cToken] = symbol;
            cTokenDecimals[cToken] = decimal;
        }

    }

    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external {

        for (uint i = 0; i < messages.length; i++) {
            (address source, uint64 timestamp, string memory key, uint64 value) = decodeMessage(messages[i], signatures[i]);

            console.log("source", source);
            console.log("timestamp", timestamp);
            console.log("key", key);
            console.log("value", value);
            address cToken = symbolToCTokens[key];
            // signed `value` is in USD upto 6 decimal places
            // hence, `value` already have 6 decimals
            // For example: USDT which has 6 decimal tokens:
            // oracle price will be `decimalToIncrease` = (36 - `value`-decimals - tokenDecimals)
            // `decimalToIncrease` = 36 - 6 - 6
            // `decimalToIncrease` = 30 - 6 = 24 decimals to add more in value
            // fixed 30 which is derived from 36 - `value`-decimals = 36 - 6 = 30
            uint decimalToIncrease = 1 * 10**(30 - cTokenDecimals[cToken]); // 1e(30-decimals)
            uint convertedValue = value * decimalToIncrease;
            console.log("convertedValue", convertedValue);
            setPrice(cToken, convertedValue);
        }

        // custom code below
        //require(source != address(0), "invalid signature");
        //prices[source][key] = value;
    }

    // Directly set the prices
    function setPrice(address cToken, uint newPrice) public {
        prices[cToken] = newPrice;
    }

    function getUnderlyingPrice(address cToken) external view returns (uint) {
        return prices[cToken];
    }

    function decodeMessage(bytes memory message, bytes memory signature) internal pure returns (address, uint64, string memory, uint64) {
        // Recover the source address
        address source = source(message, signature);

        // Decode the message and check the kind
        (string memory kind, uint64 timestamp, string memory key, uint64 value) = abi.decode(message, (string, uint64, string, uint64));
        require(keccak256(abi.encodePacked(kind)) == keccak256(abi.encodePacked("prices")), "Kind of data must be 'prices'");
        return (source, timestamp, key, value);
    }

    function source(bytes memory message, bytes memory signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = abi.decode(signature, (bytes32, bytes32, uint8));
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(message)));
        return ecrecover(hash, v, r, s);
    }
}