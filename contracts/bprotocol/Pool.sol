pragma solidity 0.5.16;

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
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
    address public jar;
    // member selection duration for round robin, default 60 mins
    uint public selectionDuration = 60 minutes;
    // member share profit params
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
    event SelectionDurationChanged(uint oldDuration, uint newDuration);

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

    constructor(address cEther_, address jar_) public {
        cEther = cEther_;
        jar = jar_;
    }

    /**
     * @dev Fallback function to receive ETH from Avatar
     */
    function() external payable {}

    function setProfitParams(uint numerator, uint denominator) external onlyOwner {
        require(numerator < denominator, "pool: invalid-profit-params");
        shareNumerator = numerator;
        shareDenominator = denominator;
        emit ProfitParamsChanged(numerator, denominator);
    }

    function setSelectionDuration(uint newDuration) external onlyOwner {
        require(newDuration > 0, "pool: selection-duration-is-zero");
        uint oldDuration = selectionDuration;
        selectionDuration = newDuration;
        emit SelectionDurationChanged(oldDuration, newDuration);
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

    function removeElement(address[] memory array, uint index) internal pure returns(address[] memory newArray) {
        if(index >= array.length) {
            newArray = array;
        }
        else {
            newArray = new address[](array.length - 1);
            for(uint i = 0 ; i < array.length ; i++) {
                if(i == index) continue;
                if(i < index) newArray[i] = array[i];
                else newArray[i-1] = array[i];
            }
        }
    }

    function chooseMember(address avatar, address underlying, address[] memory candidates) public view returns(address winner) {
        if(candidates.length == 0) return address(0);
        // A bit of randomness to choose winner. We don't need pure randomness, its ok even if a
        // liquidator can predict his winning in the future.
        // round-robin selection for member per avatar per selectionDuration mins.
        uint chosen = uint(keccak256(abi.encodePacked(avatar, now / selectionDuration))) % candidates.length;
        address possibleWinner = candidates[chosen];
        if(balance[possibleWinner][underlying] == 0) return chooseMember(avatar, underlying, removeElement(candidates, chosen));

        winner = possibleWinner;
    }

    function topup(address avatar, address cToken, uint amount, bool resetApprove) external onlyMember {
        uint expire = topped[avatar].expire;
        // allow next topup after expire
        require(now > expire, "pool: not-expired");
        require(amount > 0, "pool: amount-is-zero");
        address underlying = _getUnderlying(cToken);
        address winner = chooseMember(avatar, underlying, members);
        require(msg.sender == winner, "pool: not-winner");

        // if already topped-up, untop now
        address toppedBy = topped[avatar].toppedBy;
        if(toppedBy != address(0)) _untop(avatar);

        if(_isCEther(cToken)) {
            ICushionCEther(avatar).topup.value(amount)();
        } else {
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

    function liquidateBorrow(address avatar, address collCToken, address debtCToken, uint underlyingAmtToLiquidate) external {
        TopupInfo memory ti = topped[avatar];
        require(msg.sender == ti.toppedBy, "pool: member-not-allowed");

        // read the latest toppedUpAmount from Avatar, as partial liquidation is possible
        uint toppedUpAmount = IAvatar(avatar).toppedUpAmount();
        uint repayAmount = sub_(underlyingAmtToLiquidate, toppedUpAmount);
        uint eth = 0;
        if(toppedUpAmount < underlyingAmtToLiquidate) {
            if(_isCEther(debtCToken)) {
                eth = repayAmount;
            } else {
                IERC20(ti.underlying).safeApprove(avatar, repayAmount);
            }
            balance[ti.toppedBy][ti.underlying] = sub_(balance[ti.toppedBy][ti.underlying], repayAmount);
        }

        uint seizedTokens = IAvatar(avatar).liquidateBorrow.value(eth)(debtCToken, underlyingAmtToLiquidate, collCToken);

        uint memberShare = div_(mul_(seizedTokens, shareNumerator), shareDenominator);
        uint jarShare = sub_(seizedTokens, memberShare);

        ICToken(collCToken).transfer(ti.toppedBy, memberShare);
        ICToken(collCToken).transfer(jar, jarShare);

        bool stillToppedUp = IAvatar(avatar).toppedUpAmount() > 0;
        if(! stillToppedUp) delete topped[avatar];
        emit MemberBite(ti.toppedBy, avatar, debtCToken, underlyingAmtToLiquidate);
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

    function _getUnderlying(address cToken) internal view returns (address underlying) {
        if(_isCEther(cToken)) {
            underlying = ETH_ADDR;
        } else {
            underlying = address(ICErc20(cToken).underlying());
        }
    }
}