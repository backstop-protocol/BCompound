pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { IBTokenScore } from "../scoring/IBTokenScore.sol";

/**
 * @notice B.Protocol Compound connector contract, which is used by Jar contract
 */
contract JarConnector {

    IBTokenScore public score;
    IRegistry registry;

    // end of every round
    uint[2] public end;
    // start time of every round
    uint[2] public start;
    // current round
    uint public round;
    address[] public cTokens;
    mapping(address => bool) public cTokenSupported;


    constructor(
        address[] memory _cTokens,
        uint[2] memory _duration
    ) public {
        cTokens = _cTokens;

        for(uint i = 0; i < _cTokens.length; i++) {
            cTokenSupported[_cTokens[i]] = true;
        }

        end[0] = now + _duration[0];
        end[1] = now + _duration[0] + _duration[1];

        round = 0;
    }

    function setRegistry(address _registry) public {
        require(_registry == address(0), "registry-already-set");
        registry = IRegistry(_registry);
        score = IBTokenScore(registry.score());
    }

    // callable by anyone
    function spin() public {
        if(round == 0) {
            round++;
            score.spin();
            start[0] = score.start();
        }
        if(round == 1 && now > end[0]) {
            round++;
            score.spin();
            start[1] = score.start();
        }
        if(round == 2 && now > end[1]) {
            round++;
            // score is not counted anymore, and this must be followed by contract upgrade
            score.spin();
        }
    }

    function getUserScore(address user, address cToken) external view returns (uint) {
        if(round == 0) return 0;

        // Should return 0 score for unsupported ilk
        if( ! cTokenSupported[cToken]) return 0;

        if(round == 1) return 2 * _getTotalUserScore(user, cToken, now, start[0]);

        uint firstRoundScore = 2 * _getTotalUserScore(user, cToken, start[1], start[0]);
        uint time = now;
        if(round > 2) time = end[1];

        return add_(_getTotalUserScore(user, cToken, time, start[1]), firstRoundScore);
    }

    function getGlobalScore(address cToken) external view returns (uint) {
        if(round == 0) return 0;

        if(round == 1) return 2 * _getTotalGlobalScore(cToken, now, start[0]);

        uint firstRoundScore = 2 * _getTotalGlobalScore(cToken, start[1], start[0]);
        uint time = now;
        if(round > 2) time = end[1];

        return add_(_getTotalGlobalScore(cToken, time, start[1]), firstRoundScore);
    }

    function _getTotalUserScore(address user, address cToken, uint time, uint spinStart) internal view returns (uint256) {
        uint debtScore = score.getDebtScore(user, cToken, time, spinStart);
        uint collScore = score.getCollScore(user, cToken, time, spinStart);
        return add_(debtScore, collScore);
    }

    function _getTotalGlobalScore(address cToken, uint time, uint spinStart) internal view returns (uint256) {
        uint debtScore = score.getDebtGlobalScore(cToken, time, spinStart);
        uint collScore = score.getCollGlobalScore(cToken, time, spinStart);
        return add_(debtScore, collScore);
    }

    function add_(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "overflow");
        return c;
    }
}