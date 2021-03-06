pragma solidity 0.5.16;

import { ScoringMachine } from "../../../user-rating/contracts/score/ScoringMachine.sol";
import { IRegistry } from "../interfaces/IRegistry.sol";
import { IComptroller } from "../interfaces/IComptroller.sol";
import { Exponential } from "../lib/Exponential.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { IBToken } from "../interfaces/IBToken.sol";
import { IAvatar } from "../interfaces/IAvatar.sol";
import { IBComptroller } from "../interfaces/IBComptroller.sol";

contract BScore is ScoringMachine, Exponential {

    IRegistry public registry;
    IComptroller public comptroller;
    string private constant parent = "BScore";
    uint public startDate;
    uint public endDate;

    // cToken => uint (supplyMultiplier)
    mapping(address => uint) public supplyMultiplier;
    // cToken => uint (borrowMultiplier)
    mapping(address => uint) public borrowMultiplier;

    // cToken => Snapshot{exchangeRate, supplyIndex, borrowIndex}
    mapping(address => Snapshot) public snapshot;
    mapping(address => Snapshot) public initialSnapshot;

    struct Snapshot {
        uint exchangeRate;
        uint224 supplyIndex;
        uint224 borrowIndex;
    }

    modifier onlyAvatar() {
        require(registry.doesAvatarExist(msg.sender), "Score: not-an-avatar");
        require(! IAvatar(msg.sender).quit(), "Score: avatar-quit");        
        _;
    }

    constructor(
        address _registry,
        uint _startDate,
        uint _endDate,
        address[] memory cTokens,
        uint[] memory sMultipliers,
        uint[] memory bMultipliers
    ) public {
        require(_endDate > now, "Score: end-date-not-in-future");

        registry = IRegistry(_registry);
        comptroller = IComptroller(registry.comptroller());

        startDate = _startDate;
        endDate = _endDate;
        for(uint i = 0; i < cTokens.length; i++) {
            require(cTokens[i] != address(0), "Score: cToken-address-is-zero");
            require(sMultipliers[i] > 0, "Score: supply-multiplier-is-zero");
            require(bMultipliers[i] > 0, "Score: borrow-multiplier-is-zero");

            supplyMultiplier[cTokens[i]] = sMultipliers[i];
            borrowMultiplier[cTokens[i]] = bMultipliers[i];
        }

        _updateIndex(cTokens, true);        
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

    function updateIndex(address[] calldata cTokens) external {
        _updateIndex(cTokens, false);        
    }

    function _updateIndex(address[] memory cTokens, bool init) internal {
        require(endDate > now, "Score: expired");
        for(uint i = 0 ; i < cTokens.length ; i++) {
            address cToken = cTokens[i];
            uint224 supplyIndex;
            uint224 borrowIndex;
            uint currExchangeRate = ICToken(cToken).exchangeRateCurrent();
            (supplyIndex,) = comptroller.compSupplyState(cToken);
            (borrowIndex,) = comptroller.compBorrowState(cToken);

            if(init) {
                initialSnapshot[cToken].exchangeRate = currExchangeRate;
                initialSnapshot[cToken].supplyIndex = supplyIndex;
                initialSnapshot[cToken].borrowIndex = borrowIndex;
            }
            else {
                snapshot[cToken].exchangeRate = currExchangeRate;
                snapshot[cToken].supplyIndex = supplyIndex;
                snapshot[cToken].borrowIndex = borrowIndex;
            }
        }
    }

    function _getDeltaSupplyIndex(address cToken) internal view returns (uint224 deltaSupplyIndex) {
        uint224 currSupplyIndex = snapshot[cToken].supplyIndex;
        uint deltaSupplyIndexForCToken = sub_(uint(currSupplyIndex), uint(initialSnapshot[cToken].supplyIndex));

        // NOTICE: supplyIndex takes cToken.totalSupply() which is in cToken quantity
        // We need the index normalized to underlying token quantity
        uint currExchangeRate = snapshot[cToken].exchangeRate;
        uint scaledIndex = mul_(deltaSupplyIndexForCToken, expScale);
        uint deltaSupplyIndexInUint = div_(scaledIndex, currExchangeRate);

        deltaSupplyIndex = safe224(deltaSupplyIndexInUint, "index-exceeds-224-bits");
    }

    function _getDeltaBorrowIndex(address cToken) internal view returns (uint224 deltaBorrowIndex) {
        uint224 currBorrowIndex = snapshot[cToken].borrowIndex;
        deltaBorrowIndex = safe224(
            sub_(uint(currBorrowIndex), uint(initialSnapshot[cToken].borrowIndex)),
            "unable-to-cast-to-uint224"
        );
        // NOTICE: borrowIndex is already normalized to underlying token quantity
    }

    function slashScore(address _user, address cToken) external {
        IBComptroller bComptroller = IBComptroller(registry.bComptroller());
        address _avatar = registry.avatarOf(_user);
        bool quit = IAvatar(_avatar).quit();
        IBToken bToken = IBToken(bComptroller.c2b(cToken));

        uint time = sub(start, 1 days);
        if(time < start) time = start;

        // Slash debtScore
        uint borrowBalB = quit ? 0 : bToken.borrowBalanceCurrent(_user);
        uint borrowBalScore = getCurrentBalance(user(_avatar), debtAsset(cToken));
        if(borrowBalB < borrowBalScore) {
            int256 debtRating = int256(sub(borrowBalScore, borrowBalB));
            updateScore(user(_avatar), debtAsset(cToken), (debtRating * -1), time);
        }

        // Slash collScore
        uint collBalB = quit ? 0 : bToken.balanceOfUnderlying(_user);
        uint collBalScore = getCurrentBalance(user(_avatar), collAsset(cToken));
        if(collBalB < collBalScore) {
            int256 collRating = int256(sub(collBalScore, collBalB));
            updateScore(user(_avatar), collAsset(cToken), (collRating * -1), time);
        }
    }

    // Get Score
    // ==========
    function getDebtScore(address _user, address cToken, uint256 time) public view returns (uint) {
        uint currTime = time > endDate ? endDate : time;
        address avatar = registry.avatarOf(_user);
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(user(avatar), debtAsset(cToken), currTime, startDate, 0);
        // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
        return mul_(div_(mul_(borrowMultiplier[cToken], deltaBorrowIndex), expScale), score);
    }

    function getDebtGlobalScore(address cToken, uint256 time) public view returns (uint) {
        uint currTime = time > endDate ? endDate : time;
        uint224 deltaBorrowIndex = _getDeltaBorrowIndex(cToken);
        uint score = getScore(GLOBAL_USER, debtAsset(cToken), currTime, startDate, 0);
        // (borrowMultiplier[cToken] * deltaBorrowIndex / 1e18) * score
        return mul_(div_(mul_(borrowMultiplier[cToken], deltaBorrowIndex), expScale), score);
    }

    function getCollScore(address _user, address cToken, uint256 time) public view returns (uint) {
        uint currTime = time > endDate ? endDate : time;
        address avatar = registry.avatarOf(_user);
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(user(avatar), collAsset(cToken), currTime, startDate, 0);
        // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
        return mul_(div_(mul_(supplyMultiplier[cToken], deltaSupplyIndex), expScale), score);
    }

    function getCollGlobalScore(address cToken, uint256 time) public view returns (uint) {
        uint currTime = time > endDate ? endDate : time;
        uint224 deltaSupplyIndex = _getDeltaSupplyIndex(cToken);
        uint score = getScore(GLOBAL_USER, collAsset(cToken), currTime, startDate, 0);
        // (supplyMultiplier[cToken] * deltaSupplyIndex / 1e18) * score
        return mul_(div_(mul_(supplyMultiplier[cToken], deltaSupplyIndex), expScale), score);
    }
}