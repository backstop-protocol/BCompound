pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

contract GovernanceExecutor is Ownable {

    IRegistry public registry;
    uint public delay;
    // newPoolAddr => requestTime
    mapping(address => uint) public poolRequests;
    // target => function => list => requestTime
    mapping(address => mapping(bytes4 => mapping(bool => uint))) whitelistRequests;
    address public governance;

    event RequestPoolUpgrade(address indexed pool);
    event PoolUpgraded(address indexed pool);

    event RequestWhitelistUpgrade(address indexed target, bytes4 functionSig, bool list);
    event WhitelistUpgraded(address indexed target, bytes4 functionSig, bool list);

    constructor(address registry_, uint delay_) public {
        registry = IRegistry(registry_);
        delay = delay_;
    }

    /**
     * @dev Sets governance address
     * @param governance_ Address of the governance
     */
    function setGovernance(address governance_) external onlyOwner {
        require(governance == address(0), "governance-already-set");
        governance = governance_;
    }

    /**
     * @dev Transfer admin of BCdpManager
     * @param owner New admin address
     */
    function doTransferAdmin(address owner) external {
        require(msg.sender == governance, "unauthorized");
        registry.transferOwnership(owner);
    }

    /**
     * @dev Request pool contract upgrade
     * @param pool Address of new pool contract
     */
    function reqUpgradePool(address pool) external onlyOwner {
        poolRequests[pool] = now;
        emit RequestPoolUpgrade(pool);
    }

    /**
     * @dev Drop upgrade pool request
     * @param pool Address of pool contract
     */
    function dropUpgradePool(address pool) external onlyOwner {
        delete poolRequests[pool];
    }

    /**
     * @dev Execute pool contract upgrade after delay
     * @param pool Address of the new pool contract
     */
    function execUpgradePool(address pool) external {
        uint reqTime = poolRequests[pool];
        require(reqTime != 0, "request-not-valid");
        require(now >= add(reqTime, delay), "delay-not-over");

        delete poolRequests[pool];
        registry.setPool(pool);
        emit PoolUpgraded(pool);
    }

    /**
     * @dev Request whitelist upgrade
     * @param target Address of new whitelisted contract
     */
    function reqUpgradeWhitelist(address target, bytes4 functionSig, bool list) external onlyOwner {
        whitelistRequests[target][functionSig][list] = now;
        emit RequestWhitelistUpgrade(target, functionSig, list);
    }

    /**
     * @dev Drop upgrade whitelist request
     * @param target Address of new whitelisted contract
     */
    function dropUpgradeWhitelist(address target, bytes4 functionSig, bool list) external onlyOwner {
        delete whitelistRequests[target][functionSig][list];
    }

    /**
     * @dev Execute pool contract upgrade after delay
     * @param target Address of the new whitelisted contract
     */
    function execUpgradeWhitelist(address target, bytes4 functionSig, bool list) external {
        uint reqTime = whitelistRequests[target][functionSig][list];
        require(reqTime != 0, "request-not-valid");
        require(now >= add(reqTime, delay), "delay-not-over");

        delete whitelistRequests[target][functionSig][list];
        registry.setWhitelistAvatarCall(target, functionSig, list);
        emit WhitelistUpgraded(target, functionSig, list);
    }

    function add(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "overflow");
        return c;
    }
}