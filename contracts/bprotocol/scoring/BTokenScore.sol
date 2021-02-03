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
    uint public endDate;

    // cToken => uint (supplyMultiplier)
    mapping(address => uint) public supplyMultiplier;
    // cToken => uint (borrowMultiplier)
    mapping(address => uint) public borrowMultiplier;

    // cToken => Snapshot{exchangeRate, supplyIndex, borrowIndex}
    mapping(address => Snapshot) public snapshot;
    struct Snapshot {
        uint exchangeRate;
        uint224 supplyIndex;
        uint224 borrowIndex;
    }

    modifier onlyAvatar() {
        require(registry.doesAvatarExist(msg.sender), "Score: not-an-avatar");
        _;
    }

    function init(
        uint _endDate,
        address[] memory cTokens,
        uint[] memory sMultipliers,
        uint[] memory bMultipliers
    ) public {
        require(registry != IRegistry(0), "Score: registry-not-set");
        require(endDate == 0, "Score: already-init");
        endDate = _endDate;
        for(uint i = 0; i < cTokens.length; i++) {
            require(cTokens[i] != address(0), "Score: cToken-address-is-zero");
            require(sMultipliers[i] > 0, "Score: supply-multiplier-is-zero");
            require(bMultipliers[i] > 0, "Score: borrow-multiplier-is-zero");

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
        require(endDate > now, "Score: expired");
        uint224 supplyIndex;
        uint224 borrowIndex;
        uint currExchangeRate = ICToken(cToken).exchangeRateCurrent();
        (supplyIndex,) = comptroller.compSupplyState(cToken);
        (borrowIndex,) = comptroller.compBorrowState(cToken);
        snapshot[cToken].exchangeRate = currExchangeRate;
        snapshot[cToken].supplyIndex = supplyIndex;
        snapshot[cToken].borrowIndex = borrowIndex;
    }

    function _getDeltaSupplyIndex(address cToken) internal returns (uint224 deltaSupplyIndex) {
        uint224 currSupplyIndex;
        (currSupplyIndex,) = comptroller.compSupplyState(cToken);
        uint deltaSupplyIndexForCToken = sub_(uint(currSupplyIndex), uint(snapshot[cToken].supplyIndex));

        // NOTICE: supplyIndex takes cToken.totalSupply() which is in cToken quantity
        // We need the index normalized to underlying token quantity
        uint deltaSupplyIndexInUint;
        uint currExchangeRate = ICToken(cToken).exchangeRateCurrent();
        uint oldExchangeRate = snapshot[cToken].exchangeRate;
        if(currExchangeRate > oldExchangeRate) {
            uint scaledIndex = mul_(deltaSupplyIndexForCToken, expScale);
            deltaSupplyIndexInUint = div_(scaledIndex, currExchangeRate);
        } else {
            deltaSupplyIndexInUint = mul_(deltaSupplyIndexForCToken, currExchangeRate);
        }

        deltaSupplyIndex = safe224(deltaSupplyIndexInUint, "index-exceeds-224-bits");
    }

    function _getDeltaBorrowIndex(address cToken) internal returns (uint224 deltaBorrowIndex) {
        uint224 currBorrowIndex;
        (currBorrowIndex,) = comptroller.compBorrowState(cToken);
        deltaBorrowIndex = safe224(
            sub_(uint(currBorrowIndex), uint(snapshot[cToken].borrowIndex)),
            "unable-to-cast-to-uint224"
        );
        // NOTICE: borrowIndex is already normalized to underlying token quantity
    }

    function slashScore(address _user, address cToken) external {
        IBComptroller bComptroller = IBComptroller(registry.bComptroller());
        address _avatar = registry.avatarOf(_user);
        IBToken bToken = IBToken(bComptroller.c2b(cToken));

        uint time = sub(start, 30 days);
        if(time < start) time = start;

        // Slash debtScore
        uint borrowBalB = bToken.borrowBalanceCurrent(_user);
        uint borrowBalScore = getCurrentBalance(user(_avatar), debtAsset(cToken));
        if(borrowBalB < borrowBalScore) {
            int256 debtRating = int256(sub(borrowBalScore, borrowBalB));
            updateScore(user(_avatar), debtAsset(cToken), (debtRating * -1), time);
        }

        // Slash collScore
        uint collBalB = bToken.balanceOfUnderlying(_user);
        uint collBalScore = getCurrentBalance(user(_avatar), collAsset(cToken));
        if(collBalB < collBalScore) {
            int256 collRating = int256(sub(collBalScore, collBalB));
            updateScore(user(_avatar), collAsset(cToken), (collRating * -1), time);
        }
    }

    // Get Score
    // ==========
    function getDebtScore(address _user, address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        address avatar = registry.avatarOf(_user);
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(user(avatar), debtAsset(cToken), time, spinStart, 0);
        return mul_(score, borrowMultiplier[cToken], deltaBorrowIndex);
    }

    function getDebtGlobalScore(address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(GLOBAL_USER, debtAsset(cToken), time, spinStart, 0);
        return mul_(score, borrowMultiplier[cToken], deltaBorrowIndex);
    }

    function getCollScore(address _user, address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        address avatar = registry.avatarOf(_user);
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(user(avatar), collAsset(cToken), time, spinStart, 0);
        return mul_(score, supplyMultiplier[cToken], deltaSupplyIndex);
    }

    function getCollGlobalScore(address cToken, uint256 time, uint256 spinStart) public returns (uint) {
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(GLOBAL_USER, collAsset(cToken), time, spinStart, 0);
        return mul_(score, supplyMultiplier[cToken], deltaSupplyIndex);
    }
}