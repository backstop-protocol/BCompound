pragma solidity 0.5.16;

import { BErc20 } from "./btoken/BErc20.sol";
import { BEther } from "./btoken/BEther.sol";
import { Registry } from "./Registry.sol";
import { BComptroller } from "./BComptroller.sol";
import { ICToken, ICErc20, ICEther } from "./interfaces/CTokenInterfaces.sol";
import { Exponential } from "./lib/Exponential.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// user will give an allowance to this contract, and also delegate his B account
contract Import is Exponential {
    using SafeERC20 for IERC20;

    address constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    Registry public registry;
    BComptroller public bComptroller;
    address public cETH;
    address public bETH;

    constructor(Registry _registery, BComptroller _bComptroller) public {
        require(_registery != Registry(0), "registry-0");
        require(_bComptroller != BComptroller(0), "registry-0");

        registry = _registery;
        bComptroller = _bComptroller;

        cETH = registry.cEther();
        bETH = bComptroller.c2b(cETH);
    }

    function repayAllDebt(address[] memory cTokenDebt,
                          address[] memory debtUnderlying,
                          uint[] memory originalDebt,
                          address account) internal {
        // repay all debt
        originalDebt = new uint[](cTokenDebt.length);

        for(uint i = 0 ; i < cTokenDebt.length ; i++) {
          address cDebt = cTokenDebt[i];
          uint debt = originalDebt[i];
          if(debtUnderlying[i] == ETH) {
            ICEther(cDebt).repayBorrowBehalf.value(debt)(account);
          }
          else {
            IERC20(debtUnderlying[i]).safeApprove(address(cDebt), debt);
            require(0 == ICErc20(cDebt).repayBorrowBehalf(account, debt), "repay-failed");
          }
        }
    }

    function redeemAndDepositCollateral(address[] memory cTokenCollateral,
                                        address[] memory collateralUnderlying,
                                        address account,
                                        address avatar) internal {

        for(uint i = 0 ; i < cTokenCollateral.length ; i++) {
          ICToken cColl = ICToken(cTokenCollateral[i]);
          uint collBalance = cColl.balanceOf(account);
          IERC20(address(cColl)).safeTransferFrom(account, address(this), collBalance);
          require(0 == cColl.redeem(collBalance), "redeem-failed");

          address bColl = bComptroller.c2b(cTokenCollateral[i]);
          if(collateralUnderlying[i] == ETH) {
            BEther(bColl).mintOnAvatar.value(address(this).balance)(avatar);
          }
          else {
            IERC20 token = IERC20(collateralUnderlying[i]);
            uint tokenBalance = token.balanceOf(address(this));
            token.safeApprove(bColl, tokenBalance);
            require(0 == BErc20(bColl).mintOnAvatar(avatar, tokenBalance), "mint-failed");
          }

          // token to cToken exchange rate might change by some epsilon
          uint newCBalance = BErc20(bColl).balanceOf(address(this));
          require(BErc20(bColl).transfer(account, newCBalance), "transfer-failed");
        }
    }

    function borrowDebtOnB(address[] memory cTokenDebt,
                           address[] memory debtUnderlying,
                           uint[]    memory originalDebt,
                           address avatar) internal {
        for(uint i = 0 ; i < cTokenDebt.length ; i++) {
          uint debt = originalDebt[i];
          address bTokenDebt = bComptroller.c2b(cTokenDebt[i]);
          if(debtUnderlying[i] == ETH) {
            BEther(bTokenDebt).borrowOnAvatar(avatar, debt);
          }
          else {
            BErc20(bTokenDebt).borrowOnAvatar(avatar, debt);
          }
        }
    }

    // this is safe only if the owner of the compound account is an EOA
    function importAccount(address[] calldata cTokenCollateral,
                           address[] calldata collateralUnderlying,
                           address[] calldata cTokenDebt,
                           address[] calldata debtUnderlying,
                           uint      ethFlashLoan) external {

        require(cTokenCollateral.length == collateralUnderlying.length, "collateral-length-missmatch");
        require(cTokenDebt.length == debtUnderlying.length, "debt-length-missmatch");
        for(uint i = 0 ; i < cTokenCollateral.length ; i++) {
          require(cTokenCollateral[i] != cETH, "ETH-should-not-be-input-collateral");
        }
        // check that flashloan return is not 1% bigger than current balance

        address account = tx.origin;
        address avatar = registry.getAvatar(account);

        uint cOriginalCEthBalance = ICEther(cETH).balanceOf(address(this));
        ICEther(cETH).mint.value(address(this).balance)();
        if(cOriginalCEthBalance > 0) {
          ICEther(cETH).redeem(cOriginalCEthBalance);
          BEther(bETH).mintOnAvatar.value(address(this).balance)(avatar);
        }

        uint[] memory originalDebt = new uint[](cTokenDebt.length);

        for(uint i = 0 ; i < cTokenDebt.length ; i++) {
          originalDebt[i] = ICToken(cTokenDebt[i]).borrowBalanceCurrent(account);
        }

        // redeem all non ETH collateral, deposit it in B
        redeemAndDepositCollateral(cTokenCollateral,
                                   collateralUnderlying,
                                   account,
                                   avatar);

        // borrow the original debt, plus the flash loan fees
        borrowDebtOnB(cTokenDebt,
                      debtUnderlying,
                      originalDebt,
                      avatar);

        // repay all debt
        repayAllDebt(cTokenDebt, debtUnderlying, originalDebt, account);

        ICEther(cETH).redeem(ICEther(cETH).balanceOf(address(this)));
        if(address(this).balance < ethFlashLoan) {
          BEther(bETH).borrowOnAvatar(avatar, ethFlashLoan - address(this).balance);
        }

        msg.sender.transfer(address(this).balance);
    }

    // accept ETH transfers
    function() external payable {}
}

contract FlashLoanLike {
    function borrow(address _token, uint _amount, bytes calldata _data) external;
}

// user will call this contract
// this contract will be upgraded over time, depending on available flash loan
// sources
contract FlashLoanImport {
    using SafeERC20 for IERC20;
    address constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function flashImport(address[] calldata cTokenCollateral,
                         address[] calldata collateralUnderlying,
                         address[] calldata cTokenDebt,
                         address[] calldata debtUnderlying,
                         address payable importer,
                         uint            ethAmountToFlashBorrow,
                         address payable flash) external {
        require(cTokenDebt.length == debtUnderlying.length, "debt-length-missmatch");

        if(address(this).balance < ethAmountToFlashBorrow) {
          // this will invoke a recursive call
          return FlashLoanLike(flash).borrow(ETH, ethAmountToFlashBorrow, msg.data);
        }

        // now balance is sufficient
        importer.transfer(ethAmountToFlashBorrow);

        Import(importer).importAccount(cTokenCollateral,
                                       collateralUnderlying,
                                       cTokenDebt,
                                       debtUnderlying,
                                       ethAmountToFlashBorrow);

        flash.transfer(ethAmountToFlashBorrow);
    }

    // accept ETH transfers
    function() external payable {}
}

contract FlashLoanStub {
    function borrow(address /*_token*/, uint256 _amount, bytes calldata _data) external {
      (bool succ, ) = msg.sender.call.value(_amount)("");
      require(succ, "eth-transfer-failed");
      (succ, ) = msg.sender.call(_data);
      require(succ, "flash-call-failed");
    }

    function() external payable {}
}
