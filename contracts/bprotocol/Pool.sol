pragma solidity 0.5.16;

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IRegistry } from "./interfaces/IRegistry.sol";
import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICErc20, ICEther } from "./interfaces/CTokenInterfaces.sol";
import {
    IAvatar,
    IAvatarCErc20,
    IAvatarCEther,
    ICushion,
    ICushionCEther,
    ICushionCErc20
    } from "./interfaces/IAvatar.sol";
import { IComptroller } from "./interfaces/IComptroller.sol";
import { IBComptroller } from "./interfaces/IBComptroller.sol";

import { Exponential } from "./lib/Exponential.sol";

/**
 * @title Pool contract to manage the pool of member's fund
 */
contract Pool is Exponential, Ownable {
    using SafeERC20 for IERC20;
    address internal constant ETH_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    IComptroller public comptroller;
    IBComptroller public bComptroller;
    IRegistry public registry;
    address public jar;
    address public cEther;
    address[] public members;
    // member share profit params
    uint public shareNumerator;
    uint public shareDenominator;
    // member => underlaying => amount
    mapping(address => mapping(address => uint)) public balance;
    // avatar => TopupInfo
    mapping(address => TopupInfo) public topped;

    // address is ctoken
    mapping(address => uint) public minSharingThreshold; // debt above this size will be shared
    uint public minTopupBps = 250; // 2.5%
    uint public holdingTime = 5 hours; // after 5 hours, someone else can topup instead
    uint public selectionDuration = 60 minutes;  // member selection duration for round robin, default 10 mins

    struct MemberTopupInfo {
        address member;   // member who toppedUp
        uint expire;        // after expire time, other member can topup. relevant only if small
        uint amountTopped;  // amount of underlying tokens toppedUp
        uint amountLiquidated; // how much was already liquidated
    }

    struct TopupInfo {
        mapping(address => MemberTopupInfo) memberInfo; // info per member

        uint    debtToLiquidatePerMember; // total debt avail to liquidate
        address ctoken;          // underlying debt ctoken address
    }

    function getDebtTopupInfo(address avatar, address ctoken) public /* view */ returns(uint minDebt, bool isSmall){
        uint debt = ICToken(ctoken).borrowBalanceCurrent(avatar);
        minDebt = mul_(debt, minTopupBps) / 10000;
        isSmall = debt < minSharingThreshold[ctoken];
    }

    function untop(address avatar, uint underlyingAmount) public {
        _untop(msg.sender, avatar, underlyingAmount);
    }

    function _untopOnBehalf(address member, address avatar, uint underlyingAmount) internal {
        _untop(member, avatar, underlyingAmount);
    }

    function _untop(address member, address avatar, uint underlyingAmount) internal {
        require(underlyingAmount > 0, "topup: 0-amount");

        TopupInfo storage info = topped[avatar];

        MemberTopupInfo storage memberInfo = info.memberInfo[member];
        require(memberInfo.amountTopped == underlyingAmount, "untop: amount-too-big");
        (uint minTopup,) = getDebtTopupInfo(avatar, info.ctoken);
        require(memberInfo.amountTopped == underlyingAmount ||
                sub_(memberInfo.amountTopped, underlyingAmount) >= minTopup,
                "untop: invalid-amount");

        if(ICushion(avatar).toppedUpAmount() > 0) ICushion(avatar).untop(memberInfo.amountTopped);
        address underlying = _getUnderlying(info.ctoken);
        balance[memberInfo.member][underlying] = add_(balance[memberInfo.member][underlying], underlyingAmount);

        memberInfo.amountTopped = 0;
        memberInfo.expire = 0;
    }

    function smallTopupWinner(address avatar) public view returns(address) {
        uint chosen = uint(keccak256(abi.encodePacked(avatar, now / selectionDuration))) % members.length;
        return members[chosen];
    }

    function topup(address avatar, address cToken, uint amount, bool resetApprove) external onlyMember {
        (uint minDebt, bool small) = getDebtTopupInfo(avatar, cToken);

        address underlying = _getUnderlying(cToken);
        uint memberBalance = balance[msg.sender][underlying];

        require(memberBalance >= amount, "topup: insufficient balance");
        require(ICushion(avatar).remainingLiquidationAmount() == 0, "topup: cannot-topup-in-liquidation");

        uint realCushion = ICushion(avatar).toppedUpAmount();
        TopupInfo storage info = topped[avatar];
        for(uint i = 0 ; i < members.length ; i++) {
            address member = members[i];
            if(info.memberInfo[member].amountTopped > 0) {
                if(realCushion == 0) {
                  _untopOnBehalf(member, avatar, amount);
                  // now it is 0 topup
                  continue;
                }
                if(member == msg.sender) continue;
                if(! small) continue; // can share
                require(info.memberInfo[member].expire < now, "topup: other-member-topped");
            }
        }

        require(add_(amount, info.memberInfo[msg.sender].amountTopped) >= minDebt, "topup: amount-small");
        if(small && info.memberInfo[msg.sender].expire >= now) {
          // check it is member turn
          require(smallTopupWinner(avatar) == msg.sender, "topup: not-your-turn");
        }

        // topup is valid
        balance[msg.sender][underlying] = sub_(memberBalance, amount);
        if(small && (info.memberInfo[msg.sender].expire) >= now) {
          info.memberInfo[msg.sender].expire = add_(now, holdingTime);
        }

        info.memberInfo[msg.sender].amountTopped = add_(info.memberInfo[msg.sender].amountTopped, amount);
        info.memberInfo[msg.sender].amountLiquidated = 0;
        info.debtToLiquidatePerMember = 0;

        if(_isCEther(cToken)) {
            ICushionCEther(avatar).topup.value(amount)();
        } else {
            if(resetApprove) IERC20(underlying).safeApprove(avatar, 0);
            IERC20(underlying).safeApprove(avatar, amount);
            ICushionCErc20(avatar).topup(cToken, amount);
        }
    }


    event MemberDeposit(address indexed member, address underlying, uint amount);
    event MemberWithdraw(address indexed member, address underlying, uint amount);
    event MemberToppedUp(address indexed member, address avatar, address cToken, uint amount);
    event MemberUntopped(address indexed member, address avatar);
    event MemberBite(address indexed member, address avatar, address cTokenDebt, address cTokenCollateral, uint underlyingAmtToLiquidate);
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

    constructor(address _jar) public {
        jar = _jar;
    }

    function setRegistry(address _registry) public {
        require(address(registry) == address(0), "Pool: registry-already-set");
        registry = IRegistry(_registry);
        comptroller = IComptroller(registry.comptroller());
        bComptroller = IBComptroller(registry.bComptroller());
        cEther = registry.cEther();
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

    function liquidateBorrow(
        address bToken,
        address borrower,
        address bTokenCollateral,
        address bTokenDebt,
        uint underlyingAmtToLiquidate,
        uint amtToRepayOnCompound, // use off-chain call Avatar.calcAmountToLiquidate()
        bool resetApprove
    ) external {
        address avatar = registry.avatarOf(borrower);
        TopupInfo storage info = topped[avatar];
        uint debtToLiquidatePerMember = info.debtToLiquidatePerMember;

        bool memberToppedUp = false;
        uint debtToLiquidate = info.debtToLiquidatePerMember;
        if(debtToLiquidate == 0) {
          uint numMembers = 0;
          for(uint i = 0 ; i < members.length ; i++) {
            if(info.memberInfo[members[i]].amountTopped > 0) {
              numMembers++;
              if(members[i] == msg.sender) memberToppedUp = true;
            }
          }
          debtToLiquidate = ICushion(avatar).getMaxLiquidationAmount(cTokenDebt) / numMembers;
          info.debtToLiquidatePerMember = debtToLiquidate;
        }

        require(memberToppedUp, "liquidateBorrow: member-didnt-topup");

        MemberTopupInfo storage memberInfo = info.memberInfo[msg.sender];

        require(add_(memberInfo.amountLiquidated, underlyingAmtToLiquidate) <= debtToLiquidatePerMember,
                "liquidateBorrow: amount-too-big");

        uint cbalanceBefore = IERC20(cTokenCollateral).balanceOf(address(this));
        address debtUnderlying = _getUnderlying(cTokenDebt);

        if(_isCEther(cTokenDebt)) {
            // sending `underlyingAmtToLiquidate` ETH to Avatar
            // Avatar will split into `amtToRepayOnCompound` and `amtToDeductFromTopup`
            // Avatar will send back `amtToDeductFromTopup` ETH back to Pool contract
            ICEther(bToken).liquidateBorrow.value(underlyingAmtToLiquidate)(borrower, cTokenCollateral);
        } else {
            if(resetApprove) IERC20(debtUnderlying).safeApprove(avatar, 0);
            IERC20(debtUnderlying).safeApprove(avatar, amtToRepayOnCompound);
            uint err = 0;
            err = ICErc20(bToken).liquidateBorrow(borrower, underlyingAmtToLiquidate, cTokenCollateral);
            require(err == 0, "Pool: liquidateBorrow-failed");
        }

        uint seizedTokens = sub_(IERC20(cTokenCollateral).balanceOf(address(this)), cbalanceBefore);

        balance[msg.sender][debtUnderlying] = sub_(balance[msg.sender][debtUnderlying], amtToRepayOnCompound);

        // Block of code to avoid stack too deep error
        {
            uint memberShare = div_(mul_(seizedTokens, shareNumerator), shareDenominator);
            uint jarShare = sub_(seizedTokens, memberShare);

            IERC20(cTokenCollateral).safeTransfer(msg.sender, memberShare);
            IERC20(cTokenCollateral).safeTransfer(jar, jarShare);
        }
        
        memberInfo.amountLiquidated = add_(memberInfo.amountLiquidated, underlyingAmtToLiquidate);
        memberInfo.amountTopped = sub_(memberInfo.amountTopped, sub_(underlyingAmtToLiquidate, amtToRepayOnCompound));

        // TODO - if it is not possible to delete a strucutre with mapping, then reset debt per member
        bool stillToppedUp = IAvatar(avatar).toppedUpAmount() > 0;
        if(! stillToppedUp) delete topped[avatar];
        emit MemberBite(msg.sender, avatar, cTokenDebt, cTokenCollateral, underlyingAmtToLiquidate);
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
