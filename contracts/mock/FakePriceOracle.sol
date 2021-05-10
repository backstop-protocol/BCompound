pragma experimental ABIEncoderV2;
pragma solidity ^0.5.16;

contract FakePriceOracle {
    mapping(address=>uint) prices;

    function setPrice(address cToken, uint newPrice) external {
        prices[cToken] = newPrice;
    }

    function getUnderlyingPrice(address cToken) external view returns (uint) {
        return prices[cToken];
    }

    // uniswap oracle mock functionallity

    bytes32 public lastMsgData;
    mapping(string => address) symbol2Token;

    function setSymbol(string calldata symbol, address cToken) external {
        symbol2Token[symbol] = cToken;
    }


    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external returns(bytes32) {
        lastMsgData = keccak256(msg.data);
        return lastMsgData;
    }

    function price(string calldata symbol) external view returns(uint) {
        return FakePriceOracle(this).getUnderlyingPrice(symbol2Token[symbol]);
    }
}
