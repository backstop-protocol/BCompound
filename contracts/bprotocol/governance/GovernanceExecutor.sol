pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

contract GovernanceExecutor is Ownable {

    IRegistry public registry;
    uint public delay;
    mapping(address => uint) public requests;
    address public governance;

    event RequestPoolUpgrade(address indexed pool);
    event PoolUpgraded(address indexed pool);

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
        requests[pool] = now;
        emit RequestPoolUpgrade(pool);
    }

    /**
     * @dev Drop upgrade pool request
     * @param pool Address of pool contract
     */
    function dropUpgradePool(address pool) external onlyOwner {
        delete requests[pool];
    }

    /**
     * @dev Execute pool contract upgrade after delay
     * @param pool Address of the new pool contract
     */
    function execUpgradePool(address pool) external {
        uint reqTime = requests[pool];
        require(reqTime != 0, "request-not-valid");
        require(now >= add(reqTime, delay), "delay-not-over");

        delete requests[pool];
        registry.setPool(pool);
        emit PoolUpgraded(pool);
    }

    // TODO registry has few more onlyOwner functions
    // setScore()
    // setWhitelistAvatarCall()

    function add(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "overflow");
        return c;
    }
}