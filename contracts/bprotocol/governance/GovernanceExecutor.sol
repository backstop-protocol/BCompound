pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

contract GovernanceExecutor is Ownable {

    IRegistry public registry;
    address public governance;

    event PoolUpgraded(address indexed pool);
    event ScoreUpgraded(address indexed score);
    event WhitelistCallUpdated(address indexed target, bytes4 functionSig, bool list);

    constructor(address registry_) public {
        registry = IRegistry(registry_);
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

    function setPool(address pool) external onlyOwner {
        registry.setPool(pool);
        emit PoolUpgraded(pool);
    }

    function setScore(address score) external onlyOwner {
        registry.setScore(score);
        emit ScoreUpgraded(score);
    }

    function setWhitelistCall(address target, bytes4 functionSig, bool list) external onlyOwner {
        registry.setWhitelistAvatarCall(target, functionSig, list);
        emit WhitelistCallUpdated(target, functionSig, list);        
    }
}