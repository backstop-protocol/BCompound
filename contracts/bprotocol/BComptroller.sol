pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

contract BComptroller {

    address public registry;

    // CToken => BToken
    mapping(address => address) public cToken_bTokenMap;

    // BToken => CToken
    mapping(address => address) public bToken_cTokenMap;

    constructor(address _registry) public {
        registry = _registry;
    }

    function newBToken(address cToken) external {
        require(isCTokenSupported(cToken), "A BToken with given CToken exists");
        address bToken = address(new BToken(registry, cToken));
        cToken_bTokenMap[cToken] = bToken;
        bToken_cTokenMap[bToken] = cToken;
    }

    function isCTokenSupported(address cToken) public view returns (bool) {
        return cToken_bTokenMap[cToken] != address(0);
    }

    function isBTokenSupported(address bToken) public view returns (bool) {
        return bToken_cTokenMap[bToken] != address(0);
    }
}