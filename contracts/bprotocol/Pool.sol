pragma solidity 0.5.16;

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ICErc20 } from "./interfaces/CTokenInterfaces.sol";
import { IAvatar, ICushion, ICushionCEther, ICushionCErc20 } from "./interfaces/IAvatar.sol";

import { Exponential } from "./lib/Exponential.sol";

/**
 * @title Pool contract to manage the pool of member's fund
 */
contract Pool is Exponential, Ownable {
    using SafeERC20 for IERC20;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public cEther;
    address[] public members;
    uint public shareNumerator;
    uint public shareDenominator;
    // member => underlaying => amount
    mapping(address => mapping(address => uint)) public balance;

    // avatar => debtCToken => TopupInfo
    mapping(address => mapping(address => TopupInfo)) public topped;

    struct TopupInfo {
        address toppedBy; // member who toppedUp
        uint timeout; // after timeout toppedBy cannot bite
    }

    event MemberDeposit(address indexed member, address underlying, uint amount);
    event MemberWithdrew(address indexed member, address underlying, uint amount);
    event MemberToppedUp(address indexed member, address avatar, address cToken, uint amount);
    event MemberUntopped(address indexed member, address avatar);
    event MemberBite(address indexed member, address avatar, address cToken, uint amount);
    event ProfitParamsChanged(uint numerator, uint denominator);

    modifier onlyMember() {
        bool member = false;
        for(uint i = 0 ; i < members.length ; i++) {
            if(members[i] == msg.sender) {
                member = true;
                break;
            }
        }
        require(member, "pool: not-member");
        _;
    }

    constructor(address cEther_) public {
        cEther = cEther_;
    }

    /**
     * @dev Fallback function to receive ETH from Avatar
     */
    function() external payable {}

    function setProfitParams(uint numerator, uint denominator) external onlyOwner {
        require(numerator < denominator, "invalid-profit-params");
        shareNumerator = numerator;
        shareDenominator = denominator;
        emit ProfitParamsChanged(numerator, denominator);
    }


    function setMembers(address[] calldata members_) external onlyOwner {
        members = members_;
    }

    function deposit() external payable onlyMember {
        balance[msg.sender][ETH_ADDR] = add_(balance[msg.sender][ETH_ADDR], msg.value);
        emit MemberDeposit(msg.sender, ETH_ADDR, msg.value);
    }

    function deposit(address underlying, uint amount) external onlyMember {
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);
        balance[msg.sender][underlying] = add_(balance[msg.sender][underlying], amount);
        emit MemberDeposit(msg.sender, underlying, amount);
    }

    function withdraw(uint amount) external {
        balance[msg.sender][ETH_ADDR] = sub_(balance[msg.sender][ETH_ADDR], amount);
        msg.sender.transfer(amount);
        emit MemberWithdrew(msg.sender, ETH_ADDR, amount);
    }

    function withdraw(address underlying, uint amount) external {
        balance[msg.sender][underlying] = sub_(balance[msg.sender][underlying], amount);
        IERC20(underlying).safeTransfer(msg.sender, amount);
        emit MemberWithdrew(msg.sender, underlying, amount);
    }

    function topup(address avatar, address cToken, uint amount) external onlyMember {
        require(topped[avatar][cToken].toppedBy == address(0), "pool: already-topped");

        IERC20 underlying = ICErc20(cToken).underlying();
        underlying.safeApprove(avatar, 0);
        underlying.safeApprove(avatar, amount);
        ICushionCErc20(avatar).topup(cToken, amount);
        topped[avatar][cToken] = TopupInfo({toppedBy: msg.sender, timeout: now + 10 minutes});

        emit MemberToppedUp(msg.sender, avatar, cToken, amount);
    }

    function topup(address avatar, uint amount) external onlyMember {
        require(topped[avatar][cEther].toppedBy == address(0), "pool: already-topped");
        ICushionCEther(avatar).topup.value(amount)();
        emit MemberToppedUp(msg.sender, avatar, cEther, amount);
    }

    function uptop(address avatar, address cToken) external onlyMember {
        require(topped[avatar][cToken].toppedBy != address(0), "pool: not-topped");
        ICushion(avatar).untop();
        delete topped[avatar][cToken];
        emit MemberUntopped(msg.sender, avatar);
    }

    function liquidateBorrow(address avatar, address collCToken, address debtCToken, uint underlyingAmountToLiquidate) external onlyMember {
        TopupInfo memory ti = topped[avatar][debtCToken];
        // toppedBy member can only allow bite for next 10 mins
        bool memberWhoToppedUp = ti.toppedBy == msg.sender && now <= ti.timeout;
        // other members can allow bite after 10 mins
        bool otherMember = ti.toppedBy != msg.sender && now > ti.timeout;
        require(memberWhoToppedUp || otherMember, "pool: member-not-allowed");

        // TODO add more logic

        IAvatar(avatar).liquidateBorrow(debtCToken, underlyingAmountToLiquidate, collCToken);
        // TODO pool received tokens, send portion to Jar
        // TODO need to know liquidatedAmount


        delete topped[avatar][debtCToken];
        emit MemberBite(msg.sender, avatar, debtCToken, underlyingAmountToLiquidate); // TODO
    }

    function membersLength() external view returns (uint) {
        return members.length;
    }

    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function _isETH(address addr) internal pure returns (bool) {
        return addr == ETH_ADDR;
    }
}