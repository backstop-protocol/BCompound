pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICEther } from "./interfaces/CTokenInterfaces.sol";
import { PriceOracle } from "./interfaces/CTokenInterfaces.sol";
import { IComptroller } from "./interfaces/IComptroller.sol";
import { IRegistry } from "./interfaces/IRegistry.sol";

import { CarefulMath } from "./lib/CarefulMath.sol";

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Avatar is CarefulMath {
    using SafeERC20 for IERC20;

    bool public topped = false;
    address public pool;
    IComptroller public comptroller;
    address public bToken;
    address public bComptroller;

    // topup details
    uint256 public toppedUpAmount;
    ICToken public toppedUpCToken;


    modifier onlyPool() {
        require(msg.sender == pool, "Only pool is authorized");
        _;
    }

    modifier onlyBToken() {
        require(msg.sender == bToken, "Only BToken is authorized");
        _;
    }

    modifier onlyBComptroller() {
        require(msg.sender == bComptroller, "Only BComptroller is authorized");
        _;
    }

    modifier onlyAllowed() {
        //TODO
        require(true, "");
        _;
    }

    constructor(address _pool, address _comptroller) public {
        require(_pool != address(0), "Pool address is zero");
        require(_comptroller != address(0), "Comptroller address is zero");

        pool = _pool;
        comptroller = IComptroller(_comptroller);
    }

    // ADMIN FUNCTIONS
    // ===============
    function enableCToken(ICToken cToken) external onlyAllowed {
        approveInfinite(cToken);
    }

    function approveInfinite(ICToken cToken) internal {
        // TODO validate the cToken present on the Compound
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeApprove(address(cToken), 0);
        underlying.safeApprove(address(cToken), uint(-1));
    }

    // CEther
    // ======
    function mint(ICEther cEther) external payable onlyBToken {
        cEther.mint.value(msg.value)();
    }

    // CToken
    // ======
    function mint(ICToken cToken, address user, uint256 mintAmount) external onlyBToken returns (uint256) {
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), mintAmount);

        require(cToken.mint(mintAmount) == 0, "Mint failed");
        return 0;
    }

    function redeem(ICToken cToken, address user, uint256 redeemTokens) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, redeemedAmount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function redeemUnderlying(ICToken cToken, address user, uint256 redeemAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, redeemedAmount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function borrow(ICToken cToken, address user, uint borrowAmount) external onlyBToken returns (uint256) {
        require(cToken.borrow(borrowAmount) == 0, "Borrow failed");
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, borrowedAmount);
        require(canUntop(), "Cannot untop");
        return 0;
    }

    function repayBorrow(ICToken cToken, address user, uint repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), amountToRepay);
        require(cToken.repayBorrow(amountToRepay) == 0, "RepayBorrow failed");
        return 0;
    }

    function repayBorrowBehalf(ICToken cToken, address user, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
        require(borrower != address(this), "Borrower and Avatar cannot be same");
        //TODO ensure that the `borrower` is not an Avatar contract
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(borrower);
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), amountToRepay);
        return cToken.repayBorrowBehalf(borrower, amountToRepay);
        //If the borrower is another Avatar on BProtocol, we need to call untop for it??
    }



    // Comptroller
    // ===========
    function enterMarkets(address[] calldata cTokens) external onlyBComptroller returns (uint256[] memory) {
        return comptroller.enterMarkets(cTokens);
    }

    function exitMarket(address cToken) external onlyBComptroller returns (uint256) {
        comptroller.exitMarket(cToken);
        require(canUntop(), "Cannot untop");
    }

    // Topup / Untop
    // =============
    function topup(ICToken cToken, uint256 topupAmount) external onlyPool {
        _topup(cToken, topupAmount);
    }

    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     */
    function _topup(ICToken cToken, uint256 topupAmount) internal {
        // when already topped
        if(topped) return;

        // TODO Below verification will be moved to Pool Contract
        // 1. Check if topup required
        // 1.1 When the users debt is 5% close to the its collateral requirement

        // 2. Repay borrows from Pool to topup
        // 2.1 Store which tokens is topped up
        //address[] memory assets = registry.comptroller().getAssetsIn(address(this));
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(pool, address(this), topupAmount);
        cToken.repayBorrow(topupAmount);

        // Store Topped up details
        toppedUpCToken = cToken;
        toppedUpAmount = topupAmount;
        topped = true;
    }

    function untop() external onlyPool {
        _untop();
    }

    function canUntop() internal returns (bool) {
        return comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
    }

    /**
     * @dev Untop the borrowed position of this Avatar by borrowing from Compound and transferring
     *      it to the pool.
     * @notice Only Pool contract allowed to call the untop.
     */
    function _untop() internal {
        // when already untopped
        if(!topped) return;

        require(canUntop(), "Cannot untop");

        
        // 1. Check if untop required
        // 2. Borrow from Compound and send tokens to Pool
            // 2.1 Borrow only topped up token
        
        // Udpdate storage for toppedUp details
        toppedUpCToken = ICToken(0);
        toppedUpAmount = 0;
        topped = false;
    }

    // Helper Functions
    // ================
    function getUserDebtAndCollateralNormalized() public returns(uint debtValue, uint maxBorrowPowerValue) {
        MathError mErr;
        PriceOracle priceOracle = PriceOracle(comptroller.oracle());
        address[] memory assets = comptroller.getAssetsIn(address(this));
        debtValue = 0;
        for(uint256 i = 0; i < assets.length; i++) {
            ICToken cToken = ICToken(assets[i]);
            uint256 price = priceOracle.getUnderlyingPrice(cToken);
            require(price > 0, "Invalid price");
            debtValue += cToken.borrowBalanceCurrent(address(this)) * price;
        }

        (uint err, uint liquidity,uint shortfall) = comptroller.getAccountLiquidity(address(this));
        require(err == 0, "comp.getAccountLiquidity failed");
        if(liquidity > 0) {
            (mErr, maxBorrowPowerValue) = addUInt(debtValue, liquidity);
            require(mErr == MathError.NO_ERROR, "Add error");
        }
        else {
            (mErr, maxBorrowPowerValue) = subUInt(debtValue, shortfall);
            require(mErr == MathError.NO_ERROR, "Sub error");
        }
    }

}