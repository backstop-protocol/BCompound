pragma solidity 0.5.16;

import { ScoringMachine } from "../../../user-rating/contracts/score/ScoringMachine.sol";

contract BTokenScore is ScoringMachine {

    string private constant parent = "BTokenScore";

    // Create Asset ID
    // ================
    function user(address _user) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, _user));
    }

    function debtAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "debt", cToken));
    }

    function collAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "coll", cToken));
    }

    function slashedAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "slashed-debt", cToken));
    }

    function slasherAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "slasher-debt", cToken));
    }

    // Update Score
    // =============
    function updateDebtScore(address _user, address cToken, int256 amount) internal {
        updateScore(user(_user), debtAsset(cToken), amount, now);
    }

    function updateCollScore(address _user, address cToken, int256 amount) internal {
        updateScore(user(_user), collAsset(cToken), amount, now);
    }

    function slashedScore(address _user, address cToken, int256 amount) external onlyOwner {
        updateScore(user(_user), slashedAsset(cToken), amount, now);
    }

    function slasherScore(address _user, address cToken, int256 amount) external onlyOwner {
        updateScore(user(_user), slasherAsset(cToken), amount, now);
    }

    // Get Score
    // ==========
    function getDebtScore(address _user, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_user), debtAsset(cToken), time, spinStart, 0);
    }

    function getDebtGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, debtAsset(cToken), time, spinStart, 0);
    }

    function getCollScore(address _user, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_user), collAsset(cToken), time, spinStart, 0);
    }

    function getCollGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, collAsset(cToken), time, spinStart, 0);
    }

    function getSlashedScore(address _user, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_user), slashedAsset(cToken), time, spinStart, 0);
    }

    function getSlashedGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, slashedAsset(cToken), time, spinStart, 0);
    }

    function getSlasherScore(address _user, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_user), slasherAsset(cToken), time, spinStart, 0);
    }

    function getSlasherGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, slasherAsset(cToken), time, spinStart, 0);
    }

    // Utility function
    function toInt256(uint256 value) internal pure returns (int256) {
        int256 result = int256(value);
        require(result >= 0, "Cast from uint to int failed");
        return result;
    }
}