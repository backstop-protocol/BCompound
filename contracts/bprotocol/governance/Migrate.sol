pragma solidity 0.5.16;

import { IRegistry } from "../interfaces/IRegistry.sol";
import { GovernanceExecutor } from "./GovernanceExecutor.sol";
import { JarConnector } from "../connector/JarConnector.sol";
import { Exponential } from "../lib/Exponential.sol";

contract Migrate is Exponential {

    event NewProposal(uint indexed proposalId, address newOwner);
    event Voted(uint indexed proposalId, address user, uint score);
    event VoteCancelled(uint indexed proposalId, address user, uint score);
    event Queued(uint indexed proposalId);
    event Executed(uint indexed proposalId);

    struct Proposal {
        uint forVotes;
        uint eta;
        address newOwner;
        mapping (address => mapping(address => bool)) voted; // user => cToken => voted
    }

    uint public constant DELAY = 2 days;

    JarConnector public jarConnector;
    IRegistry public registry;
    GovernanceExecutor public executor;

    Proposal[] public proposals;

    constructor(
        JarConnector jarConnector_,
        IRegistry registry_,
        GovernanceExecutor executor_
    ) public {
        jarConnector = jarConnector_;
        registry = registry_;
        executor = executor_;
    }

    function propose(address newOwner) external returns (uint) {
        require(jarConnector.round() > 2, "six-months-not-passed");
        require(newOwner != address(0), "newOwner-cannot-be-zero");

        Proposal memory proposal = Proposal({
            forVotes: 0,
            eta: 0,
            newOwner: newOwner
        });

        uint proposalId = sub_(proposals.push(proposal), uint(1));
        emit NewProposal(proposalId, newOwner);

        return proposalId;
    }

    function vote(uint proposalId, address cToken) external {
        address user = msg.sender;
        Proposal storage proposal = proposals[proposalId];
        require(proposal.newOwner != address(0), "proposal-not-exist");
        require(! proposal.voted[user][cToken], "already-voted");
        require(registry.doesAvatarExistFor(user), "avatar-does-not-exist");

        uint score = jarConnector.getUserScore(user, cToken);
        proposal.forVotes = add_(proposal.forVotes, score);
        proposal.voted[user][cToken] = true;

        emit Voted(proposalId, user, score);
    }

    function cancelVote(uint proposalId, address cToken) external {
        address user = msg.sender;
        Proposal storage proposal = proposals[proposalId];
        require(proposal.newOwner != address(0), "proposal-not-exist");
        require(proposal.voted[user][cToken], "not-voted");
        require(registry.doesAvatarExistFor(user), "avatar-does-not-exist");

        uint score = jarConnector.getUserScore(user, cToken);
        proposal.forVotes = sub_(proposal.forVotes, score);
        proposal.voted[user][cToken] = false;

        emit VoteCancelled(proposalId, user, score);
    }

    function queueProposal(uint proposalId, address cToken) external {
        uint quorum = add_(jarConnector.getGlobalScore(cToken) / 2, uint(1)); // 50%
        Proposal storage proposal = proposals[proposalId];
        require(proposal.eta == 0, "already-queued");
        require(proposal.newOwner != address(0), "proposal-not-exist");
        require(proposal.forVotes >= quorum, "quorum-not-passed");

        proposal.eta = now + DELAY;

        emit Queued(proposalId);
    }

    function executeProposal(uint proposalId) external {
        Proposal memory proposal = proposals[proposalId];
        require(proposal.eta > 0, "proposal-not-queued");
        require(now >= proposal.eta, "delay-not-over");

        executor.doTransferAdmin(proposal.newOwner);

        emit Executed(proposalId);
    }
}