pragma solidity 0.5.16;

import { BToken } from "./BToken.sol";

contract BComptroller {

    address public registry;
    address public pool;

    // CToken => BToken
    mapping(address => address) public c2b;

    // BToken => CToken
    mapping(address => address) public b2c;

    event NewBToken(address indexed cToken, address bToken);

    constructor(address _pool) public {
        pool = _pool;
    }

    /**
     * @dev Registry address set only one time
     * @param _registry Address of the registry contract
     */
    function setRegistry(address _registry) public {
        require(registry == address(0), "registry-is-already-set");
        registry = _registry;
    }

    function newBToken(address cToken) external returns (address) {
        // FIXME ensure that the cToken is supported on Compound
        require(!isCToken(cToken), "BToken-with-given-CToken-exists");
        address bToken = address(new BToken(registry, cToken, pool));
        c2b[cToken] = bToken;
        b2c[bToken] = cToken;
        emit NewBToken(cToken, bToken);
        return bToken;
    }

    function isCToken(address cToken) public view returns (bool) {
        return c2b[cToken] != address(0);
    }

    function isBToken(address bToken) public view returns (bool) {
        return b2c[bToken] != address(0);
    }
}