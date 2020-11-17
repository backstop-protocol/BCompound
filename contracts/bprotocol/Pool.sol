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

    // avatar => TopupInfo
    mapping(address => TopupInfo) public topped;

    struct TopupInfo {
        address toppedBy;   // member who toppedUp
        uint expire;        // after expire time, other member can topup
        address underlying; // underlying token address
        uint amount;        // amount of underlying tokens toppedUp
    }

    event MemberDeposit(address indexed member, address underlying, uint amount);
    event MemberWithdraw(address indexed member, address underlying, uint amount);
    event MemberToppedUp(address indexed member, address avatar, address cToken, uint amount);
    event MemberUntopped(address indexed member, address avatar);
    event MemberBite(address indexed member, address avatar, address cToken, uint amount);
    event ProfitParamsChanged(uint numerator, uint denominator);
    event MembersSet(address[] members);

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
        emit MembersSet(members_);
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

    function withdraw(address underlying, uint amount) external {
        if(_isETH(underlying)) {
            balance[msg.sender][ETH_ADDR] = sub_(balance[msg.sender][ETH_ADDR], amount);
            msg.sender.transfer(amount);
        } else {
            balance[msg.sender][underlying] = sub_(balance[msg.sender][underlying], amount);
            IERC20(underlying).safeTransfer(msg.sender, amount);
        }
        emit MemberWithdraw(msg.sender, underlying, amount);
    }

    function topup(address avatar, address cToken, uint amount, bool resetApprove) external onlyMember {
        address toppedBy = topped[avatar].toppedBy;
        require(toppedBy == address(0), "pool: already-topped");
        require(amount > 0, "pool: amount-is-zero");
        // TODO who is intitled to topup
        // TODO if avatar already topped by other member and its passed 10 mins,
        // TODO do untop before current member topup

        // if already topped, untop before
        if(toppedBy != address(0)) _untop(avatar);

        address underlying;
        if(_isCEther(cToken)) {
            underlying = ETH_ADDR;
            ICushionCEther(avatar).topup.value(amount)();
        } else {
            underlying = address(ICErc20(cToken).underlying());
            if(resetApprove) IERC20(underlying).safeApprove(avatar, 0);
            IERC20(underlying).safeApprove(avatar, amount);
            ICushionCErc20(avatar).topup(cToken, amount);
        }
        balance[msg.sender][underlying] = sub_(balance[msg.sender][underlying], amount);
        topped[avatar] = TopupInfo({
                toppedBy: msg.sender,
                expire: now + 10 minutes,
                underlying: underlying,
                amount: amount
            });

        emit MemberToppedUp(msg.sender, avatar, cToken, amount);
    }

    function uptop(address avatar) external {
        require(topped[avatar].toppedBy == msg.sender, "pool: not-member-who-topped");
        _untop(avatar);
    }

    function _untop(address avatar) internal {
        TopupInfo memory ti = topped[avatar];
        balance[ti.toppedBy][ti.underlying] = add_(balance[ti.toppedBy][ti.underlying], ti.amount);
        ICushion(avatar).untop();
        delete topped[avatar];
        emit MemberUntopped(ti.toppedBy, avatar);
    }

    function liquidateBorrow(address avatar, address collCToken, address debtCToken, uint underlyingAmountToLiquidate) external {
        TopupInfo memory ti = topped[avatar];
        require(msg.sender == ti.toppedBy, "pool: member-not-allowed");

        // TODO add more logic

        IAvatar(avatar).liquidateBorrow(debtCToken, underlyingAmountToLiquidate, collCToken);
        // TODO pool received tokens, send portion to Jar
        // TODO need to know liquidatedAmount


        delete topped[avatar];
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

    function _isCEther(address addr) internal view returns (bool) {
        return addr == cEther;
    }
}