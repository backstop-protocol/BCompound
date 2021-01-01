pragma solidity 0.5.16;

import { AvatarBase } from "./AvatarBase.sol";

import { IPriceOracle } from "../interfaces/CTokenInterfaces.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { IBToken } from "../interfaces/IBToken.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Abstract Comptroller contract for Avatar
 */
contract AbsComptroller is AvatarBase {

    function enterMarket(address bToken) external onlyBComptroller returns (uint256) {
        address cToken = IBToken(bToken).cToken();
        return _enterMarket(cToken);
    }

    function _enterMarket(address cToken) internal postPoolOp(false) returns (uint256) {
        address[] memory cTokens = new address[](1);
        cTokens[0] = cToken;
        return _enterMarkets(cTokens)[0];
    }

    function enterMarkets(address[] calldata bTokens) external onlyBComptroller returns (uint256[] memory) {
        address[] memory cTokens = new address[](bTokens.length);
        for(uint256 i = 0; i < bTokens.length; i++) {
            cTokens[i] = IBToken(bTokens[i]).cToken();
        }
        return _enterMarkets(cTokens);
    }

    function _enterMarkets(address[] memory cTokens) internal postPoolOp(false) returns (uint256[] memory) {
        uint256[] memory result = comptroller.enterMarkets(cTokens);
        for(uint256 i = 0; i < result.length; i++) {
            require(result[i] == 0, "AbsComptroller: enter-markets-failed");
        }
        return result;
    }

    function exitMarket(IBToken bToken) external onlyBComptroller postPoolOp(true) returns (uint256) {
        address cToken = bToken.cToken();
        uint result = comptroller.exitMarket(cToken);
        _disableCToken(cToken);
        return result;
    }

    function _disableCToken(address cToken) internal {
        ICToken(cToken).underlying().safeApprove(cToken, 0);
    }

    function claimComp() external onlyBComptroller {
        comptroller.claimComp(address(this));
        transferCOMP();
    }

    function claimComp(address[] calldata bTokens) external onlyBComptroller {
        address[] memory cTokens = new address[](bTokens.length);
        for(uint256 i = 0; i < bTokens.length; i++) {
            cTokens[i] = IBToken(bTokens[i]).cToken();
        }
        comptroller.claimComp(address(this), cTokens);
        transferCOMP();
    }

    function claimComp(
        address[] calldata bTokens,
        bool borrowers,
        bool suppliers
    )
        external
        onlyBComptroller
    {
        address[] memory cTokens = new address[](bTokens.length);
        for(uint256 i = 0; i < bTokens.length; i++) {
            cTokens[i] = IBToken(bTokens[i]).cToken();
        }

        address[] memory holders = new address[](1);
        holders[0] = address(this);
        comptroller.claimComp(holders, cTokens, borrowers, suppliers);

        transferCOMP();
    }

    function transferCOMP() public {
        address owner = registry.ownerOf(address(this));
        comp.safeTransfer(owner, comp.balanceOf(address(this)));
    }

    function getAccountLiquidity(address oracle) external view returns (uint err, uint liquidity, uint shortFall) {
        return _getAccountLiquidity(oracle);
    }

    function getAccountLiquidity() external view returns (uint err, uint liquidity, uint shortFall) {
        return _getAccountLiquidity(comptroller.oracle());
    }

    function _getAccountLiquidity(address oracle) internal view returns (uint err, uint liquidity, uint shortFall) {
        // If not topped up, get the account liquidity from Comptroller
        (err, liquidity, shortFall) = comptroller.getAccountLiquidity(address(this));
        if(!isToppedUp()) {
            return (err, liquidity, shortFall);
        }
        require(err == 0, "Error-in-getting-account-liquidity");

        uint256 price = IPriceOracle(oracle).getUnderlyingPrice(toppedUpCToken);
        uint256 toppedUpAmtInETH = mulTrucate(toppedUpAmount, price);

        // liquidity = 0 and shortFall = 0
        if(liquidity == toppedUpAmtInETH) return(0, 0, 0);

        // when shortFall = 0
        if(shortFall == 0 && liquidity > 0) {
            if(liquidity > toppedUpAmtInETH) {
                liquidity = sub_(liquidity, toppedUpAmtInETH);
            } else {
                shortFall = sub_(toppedUpAmtInETH, liquidity);
                liquidity = 0;
            }
        } else if(liquidity == 0 && shortFall > 0) { // We can just check for `liquidity == 0`, to cover both of the following cases
            shortFall = add_(shortFall, toppedUpAmtInETH);
        } else {
            // Handling case when compound returned liquidity = 0 and shortFall = 0
            shortFall = add_(shortFall, toppedUpAmtInETH);
            // FIXME We can combine last two `else` block, as calculation is same??
        }
    }
}