pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { IBTokenScore } from "../scoring/IBTokenScore.sol";

/**
 * @notice B.Protocol Compound connector contract, which is used by Jar contract
 */
contract JarConnector {

    IBTokenScore public score;
    IRegistry registry;
    address[] public cTokens;

    constructor(address[] memory _cTokens) public {
        cTokens = _cTokens;
    }

    function setRegistry(address _registry) public {
        require(_registry == address(0), "registry-already-set");
        registry = IRegistry(_registry);
        score = IBTokenScore(registry.score());
    }

    function getUserScore(bytes32 user) external view returns (uint) {
        return _getTotalUserScore(toUser(user), now, 0);
    }

    function getGlobalScore() external view returns (uint) {
        return _getTotalGlobalScore(now, 0);
    }

    function _getTotalUserScore(address user, uint time, uint spinStart) internal view returns (uint256) {
        uint totalScore = 0;
        for(uint i = 0; i < cTokens.length; i++) {
            uint debtScore = score.getDebtScore(user, cTokens[i], time, spinStart);
            uint collScore = score.getCollScore(user, cTokens[i], time, spinStart);
            totalScore = add_(add_(totalScore, debtScore), collScore);
        }
        return totalScore;
    }

    function _getTotalGlobalScore(uint time, uint spinStart) internal view returns (uint256) {
        uint totalScore = 0;
        for(uint i = 0; i < cTokens.length; i++) {
            uint debtScore = score.getDebtGlobalScore(cTokens[i], time, spinStart);
            uint collScore = score.getCollGlobalScore(cTokens[i], time, spinStart);
            totalScore = add_(add_(totalScore, debtScore), collScore);
        }
        return totalScore;
    }

    function add_(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "overflow");
        return c;
    }

    function toUser(bytes32 user) public pure returns (address) {
        // Following the way described in
        // the warning section https://solidity.readthedocs.io/en/v0.5.16/types.html#address

        // Extract left most 20 bytes from `bytes32` type and convert to `address` type
        return address(uint160(bytes20(user)));
    }
}