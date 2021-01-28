pragma solidity 0.5.16;

import { ScoringMachine } from "../../../user-rating/contracts/score/ScoringMachine.sol";
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IComptroller } from "../interfaces/IComptroller.sol";
import { Exponential } from "../lib/Exponential.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { IBToken } from "../interfaces/IBToken.sol";
import { IBComptroller } from "../interfaces/IBComptroller.sol";

contract BTokenScore is ScoringMachine, Exponential {

    IRegistry public registry;
    IComptroller public comptroller;
    string private constant parent = "BTokenScore";
    uint public expiry;

    // cToken => uint (supplyMultiplier)
    mapping(address => uint) public supplyMultiplier;
    // cToken => uint (borrowMultiplier)
    mapping(address => uint) public borrowMultiplier;

    // cToken => LastIndex{supplyIndex, borrowIndex}
    mapping(address => LastIndex) public lastIndex;
    struct LastIndex {
        uint224 supplyIndex;
        uint224 borrowIndex;
    }

    modifier onlyAvatar() {
        require(registry.doesAvatarExist(msg.sender), "Score: not-an-avatar");
        _;
    }

    constructor(
        address[] memory cTokens,
        uint[] memory sMultipliers,
        uint[] memory bMultipliers
    ) public {
        expiry = now + (6 * 4 weeks); // 6 months
        for(uint i = 0; i < cTokens.length; i++) {
            require(cTokens[i] != address(0), "cToken-address-is-zero");
            require(sMultipliers[i] > 0, "supply-multiplier-is-zero");
            require(bMultipliers[i] > 0, "borrow-multiplier-is-zero");

            supplyMultiplier[cTokens[i]] = sMultipliers[i];
            borrowMultiplier[cTokens[i]] = bMultipliers[i];
            updateIndex(cTokens[i]);
        }
    }

    function setRegistry(address _registry) public onlyOwner {
        require(address(registry) == address(0), "Score: registry-already-set");
        registry = IRegistry(_registry);
        comptroller = IComptroller(registry.comptroller());
    }

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

    function slashedDebtAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "slashed-debt", cToken));
    }

    function slashedCollAsset(address cToken) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, "slashed-coll", cToken));
    }

    // Update Score
    // =============
    function updateDebtScore(address _avatar, address cToken, int256 amount) external onlyAvatar {
        updateScore(user(_avatar), debtAsset(cToken), amount, now);
    }

    function updateCollScore(address _avatar, address cToken, int256 amount) external onlyAvatar {
        updateScore(user(_avatar), collAsset(cToken), amount, now);
    }

    function mul_(uint score, uint multiplier, uint224 index) internal pure returns (uint) {
        return mul_(mul_(score, multiplier), index);
    }

    function updateIndex(address cToken) public {
        require(expiry < now, "expired");
        uint224 supplyIndex;
        uint224 borrowIndex;
        (supplyIndex,) = comptroller.compSupplyState(cToken);
        (borrowIndex,) = comptroller.compBorrowState(cToken);
        lastIndex[cToken].supplyIndex = supplyIndex;
        lastIndex[cToken].borrowIndex = borrowIndex;
    }

    function _getDeltaSupplyIndex(address cToken) internal returns (uint224 deltaSupplyIndex) {
        uint224 currSupplyIndex;
        (currSupplyIndex,) = comptroller.compSupplyState(cToken);
        uint deltaSupplyIndexForCToken = sub_(uint(currSupplyIndex), uint(lastIndex[cToken].supplyIndex));

        // NOTICE: supplyIndex takes cToken.totalSupply() which is in cToken quantity
        // We need the index normalized to underlying token quantity
        uint exchangeRate = ICToken(cToken).exchangeRateCurrent();
        deltaSupplyIndex = safe224(div_(deltaSupplyIndexForCToken, exchangeRate), "index-exceeds-224-bits");
    }

    function _getDeltaBorrowIndex(address cToken) internal returns (uint224 deltaBorrowIndex) {
        uint224 currBorrowIndex;
        (currBorrowIndex,) = comptroller.compBorrowState(cToken);
        deltaBorrowIndex = safe224(
            sub_(uint(currBorrowIndex), uint(lastIndex[cToken].borrowIndex)),
            "unable-to-cast-to-uint224"
        );
        // NOTICE: borrowIndex is already normalized to underlying token quantity
    }

    function slashedScore(address _avatar, address cToken) external {
        IBComptroller bComptroller = IBComptroller(registry.bComptroller());
        address _user = registry.ownerOf(_avatar);
        IBToken bToken = IBToken(bComptroller.c2b(cToken));

        uint time = sub(start, 30 days);
        if(time < start) time = start;

        // Slash debtScore
        uint borrowBal_B = bToken.borrowBalanceCurrent(_user);
        uint borrowBal_Score = getCurrentBalance(user(_avatar), debtAsset(cToken));
        if(borrowBal_B < borrowBal_Score) {
            int256 debtRating = int256(sub(borrowBal_Score, borrowBal_B));
            updateScore(user(_avatar), debtAsset(cToken), (debtRating * -1), time);
            updateScore(user(_avatar), slashedDebtAsset(cToken), debtRating, time);
        }

        // Slash collScore
        uint collBal_B = bToken.balanceOfUnderlying(_user);
        uint collBal_Score = getCurrentBalance(user(_avatar), collAsset(cToken));
        if(collBal_B < collBal_Score) {
            int256 collRating = int256(sub(collBal_Score, collBal_B));
            updateScore(user(_avatar), collAsset(cToken), (collRating * -1), time);
            updateScore(user(_avatar), slashedCollAsset(cToken), collRating, time);
        }
    }

    // Get Score
    // ==========
    function getDebtScore(address _avatar, address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(user(_avatar), debtAsset(cToken), time, spinStart, 0);
        return mul_(score, borrowMultiplier[cToken], deltaBorrowIndex);
    }

    function getDebtGlobalScore(address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(GLOBAL_USER, debtAsset(cToken), time, spinStart, 0);
        return mul_(score, borrowMultiplier[cToken], deltaBorrowIndex);
    }

    function getCollScore(address _avatar, address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(user(_avatar), collAsset(cToken), time, spinStart, 0);
        return mul_(score, supplyMultiplier[cToken], deltaSupplyIndex);
    }

    function getCollGlobalScore(address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(GLOBAL_USER, collAsset(cToken), time, spinStart, 0);
        return mul_(score, supplyMultiplier[cToken], deltaSupplyIndex);
    }

    function getSlashedCollScore(address _avatar, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_avatar), slashedCollAsset(cToken), time, spinStart, 0);
    }

    function getSlashedCollGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, slashedCollAsset(cToken), time, spinStart, 0);
    }

    function getSlashedDebtScore(address _avatar, address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(user(_avatar), slashedDebtAsset(cToken), time, spinStart, 0);
    }

    function getSlashedDebtGlobalScore(address cToken, uint256 time, uint256 spinStart) public view returns (uint) {
        return getScore(GLOBAL_USER, slashedDebtAsset(cToken), time, spinStart, 0);
    }
}