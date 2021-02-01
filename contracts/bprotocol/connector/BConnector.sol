pragma solidity 0.5.16;

import { IBTokenScore } from "../scoring/IBTokenScore.sol";

/**
 * @notice B.Protocol Compound connector contract, which is used by Jar contract
 */
contract BConnector {

    IBTokenScore public score;

    constructor(address _score) public {
        score = IBTokenScore(_score);
    }

    function getUserScore(address user, address cToken) external view returns (uint256) {
        uint debtScore = score.getDebtScore(user, cToken, now, 0);
        uint collScore = score.getCollScore(user, cToken, now, 0);
        return add_(debtScore, collScore, "overflow");
    }

    function getGlobalScore(address cToken) external view returns (uint256) {
        uint debtScore = score.getDebtGlobalScore(cToken, now, 0);
        uint collScore = score.getCollGlobalScore(cToken, now, 0);
        return add_(debtScore, collScore, "overflow");
    }

    function add_(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }
}