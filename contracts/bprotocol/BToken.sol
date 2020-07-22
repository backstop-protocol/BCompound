pragma solidity 0.5.16;

/**
 * @dev BToken is BProtocol token contract which represents the Compound's CToken
 */
contract BToken {

    // Compoun's CToken this BToken contract is tied to
    address public cToken;

    constructor(address _cToken) public {
        cToken = _cToken;
    }

    // CEther


    // CErc20

}