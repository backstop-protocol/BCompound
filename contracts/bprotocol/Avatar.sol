pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICEther } from "./interfaces/CTokenInterfaces.sol";
import { IPriceOracle } from "./interfaces/CTokenInterfaces.sol";
import { IComptroller } from "./interfaces/IComptroller.sol";
import { IRegistry } from "./interfaces/IRegistry.sol";

import { CarefulMath } from "./lib/CarefulMath.sol";

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title An Avatar contract deployed per account. The contract holds cTokens and directly interacts
 *        with Compound finance.
 * @author Smart Future Labs Ltd.
 */
contract Avatar is CarefulMath {
    using SafeERC20 for IERC20;

    address public pool;
    address public bToken;
    address public bComptroller;
    IComptroller public comptroller;

    // Storage for topup details
    uint256 public toppedUpAmount;
    ICToken public toppedUpCToken;
    bool public topped = false;

    modifier onlyPool() {
        require(msg.sender == pool, "Only pool is authorized");
        _;
    }

    modifier onlyBToken() {
        require(isValidBToken(msg.sender), "Only BToken is authorized");
        _;
    }

    modifier onlyBComptroller() {
        require(msg.sender == bComptroller, "Only BComptroller is authorized");
        _;
    }

    constructor(
        address _pool,
        address _bToken,
        address _bComptroller,
        address _comptroller
    )
        public
    {
        pool = _pool;
        bToken = _bToken;
        bComptroller = _bComptroller;
        comptroller = IComptroller(_comptroller);
    }

    function isValidBToken(address bToken) internal view returns (bool) {
        // TODO Write the implementation
        return true;
    }

    // OPEN FUNCTIONS
    // ===============
    /**
     * @dev Anyone allowed to enable a CToken on Avatar
     * @param cToken CToken address to enable
     */
    function enableCToken(ICToken cToken) public {
        // 1. Validate cToken supported on the Compound
        (bool isListed,) = comptroller.markets(address(cToken));
        require(isListed, "CToken not supported");

        // 2. Initiate inifinite approval
        IERC20 underlying = IERC20(cToken.underlying());
        // 2.1 De-approve any previous approvals, before approving again
        underlying.safeApprove(address(cToken), 0);
        // 2.3 Initiate inifinite approval
        underlying.safeApprove(address(cToken), uint256(-1));
    }

    // TODO Need to add modifier to protect the function call
    function disableCToken(ICToken cToken) public {
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeApprove(address(cToken), 0);
    }

    // CEther
    // ======
    function mint(ICEther cEther) external payable onlyBToken {
        cEther.mint.value(msg.value)();
    }

    // CToken
    // ======
    function mint(ICToken cToken, uint256 mintAmount) external onlyBToken returns (uint256) {
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        return cToken.mint(mintAmount);
    }

    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, borrowedAmount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function repayBorrow(ICToken cToken, uint256 repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        return cToken.repayBorrow(amountToRepay);
    }

    function repayBorrowBehalf(ICToken cToken, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
        require(borrower != address(this), "Borrower and Avatar cannot be same");
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(borrower);
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        return cToken.repayBorrowBehalf(borrower, amountToRepay);
    }

    // Comptroller
    // ===========
    function enterMarkets(address[] calldata cTokens) external onlyBComptroller returns (uint256[] memory) {
        for(uint256 i = 0; i < cTokens.length; i++) {
            enableCToken(ICToken(cTokens[i]));
        }
        return comptroller.enterMarkets(cTokens);
    }

    function exitMarket(ICToken cToken) external onlyBComptroller returns (uint256) {
        comptroller.exitMarket(address(cToken));
        require(canUntop(), "Cannot untop");
        disableCToken(cToken);
    }

    // Topup / Untop
    // =============
    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     * @param cToken CToken address to use to RepayBorrows
     * @param topupAmount Amount of tokens to Topup
     * @return `true` if success, `false` otherwise.
     */
    function topup(ICToken cToken, uint256 topupAmount) external onlyPool returns (bool) {
        // when already topped
        if(topped) return false;

        // 1. Transfer funds from the Pool contract
        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(pool, address(this), topupAmount);

        // 2. Repay borrows from Pool to topup
        require(cToken.repayBorrow(topupAmount) == 0, "RepayBorrow failed");

        // 3. Store Topped-up details
        toppedUpCToken = cToken;
        toppedUpAmount = topupAmount;
        topped = true;

        return true;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function canUntop() internal returns (bool) {
        // When not topped up, just return true
        if(!topped) return true;
        return comptroller.borrowAllowed(address(toppedUpCToken), address(this), toppedUpAmount) == 0;
    }

    /**
     * @dev Untop the borrowed position of this Avatar by borrowing from Compound and transferring
     *      it to the pool.
     * @notice Only Pool contract allowed to call the untop.
     * @return `true` if success, `false` otherwise.
     */
    function untop() external onlyPool returns (bool) {
        // when already untopped
        if(!topped) return false;

        // 1. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "Borrow failed");

        // 2. Transfer borrowed amount to Pool contract
        IERC20 underlying = IERC20(toppedUpCToken.underlying());
        underlying.safeTransfer(pool, underlying.balanceOf(address(this)));

        // 3. Udpdate storage for toppedUp details
        toppedUpCToken = ICToken(0); // FIXME Might not need to reset (avoid gas consumption)
        toppedUpAmount = 0; // FIXME Might not need to reset (avoid gas consumption)
        topped = false;

        return true;
    }

    // Helper Functions
    // ================
    function getUserDebtAndCollateralNormalized() public returns(uint256 debtInETH, uint256 maxBorrowPowerInETH) {
        MathError mErr;
        uint256 borrowBalanceValue;
        IPriceOracle priceOracle = IPriceOracle(comptroller.oracle());
        address[] memory assets = comptroller.getAssetsIn(address(this));
        debtInETH = 0;
        for(uint256 i = 0; i < assets.length; i++) {
            ICToken cToken = ICToken(assets[i]);
            uint256 price = priceOracle.getUnderlyingPrice(cToken);
            require(price > 0, "Invalid price");
            uint256 borrowBalanceCurrent = cToken.borrowBalanceCurrent(address(this));
            (mErr, borrowBalanceValue) = mulUInt(borrowBalanceCurrent, price);
            require(mErr == MathError.NO_ERROR, "Mul error");
            (mErr, debtInETH) = addUInt(debtInETH, borrowBalanceValue);
            require(mErr == MathError.NO_ERROR, "Add error");
        }

        (uint256 err, uint256 liquidity,uint256 shortfall) = comptroller.getAccountLiquidity(address(this));
        require(err == 0, "comp.getAccountLiquidity failed");
        if(liquidity > 0) {
            (mErr, maxBorrowPowerInETH) = addUInt(debtInETH, liquidity);
            require(mErr == MathError.NO_ERROR, "Add error");
        }
        else {
            (mErr, maxBorrowPowerInETH) = subUInt(debtInETH, shortfall);
            require(mErr == MathError.NO_ERROR, "Sub error");
        }
    }

    // LIQUIDATION
    // ============
    /**
     * @dev Returns the status if this Avatar's debt can be liquidated
     * @return `true` when this Avatar can be liquidated, `false` otherwise
     */
    function canLiquidate() public returns (bool) {
        MathError mErr;
        uint256 toppedUpInETH = 0;

        (uint debtInETH, uint maxBorrowPowerInETH) = getUserDebtAndCollateralNormalized();

        if (topped) {
            IPriceOracle priceOracle = IPriceOracle(comptroller.oracle());
            uint256 price = priceOracle.getUnderlyingPrice(toppedUpCToken);

            // toppedUpInETH = toppedUpAmount * price
            (mErr, toppedUpInETH) = mulUInt(toppedUpAmount, price);
            require(mErr == MathError.NO_ERROR, "Mul error");

            // totalDebtInETH = debtInETH + toppedUpInETH
            uint256 totalDebtInETH;
            (mErr, totalDebtInETH) = addUInt(debtInETH, toppedUpInETH);
            require(mErr == MathError.NO_ERROR, "Add error");

            return totalDebtInETH >= maxBorrowPowerInETH;
        } else {
            return debtInETH >= maxBorrowPowerInETH;
        }
    }

    function liquidateBorrow(ICToken cToken, uint256 underlyingAmtToLiquidate, address collateralToken) external onlyPool {
        // 1. Can liquidate?
        require(canLiquidate(), "Cannot liquidate");

        // 2. Is cToken == toppedUpCToken: then only perform liquidation considering `toppedUpAmount`
        require(cToken == toppedUpCToken, "Not allowed to liquidate with given cToken debt");
    
        IERC20 underlying = IERC20(toppedUpCToken.underlying());
        address avatar = address(this);
        uint256 debt = cToken.borrowBalanceCurrent(avatar);

        
    }

    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transfer(dst, amount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);
        require(canUntop(), "Cannot untop");
        return result;
    }

    function approve(ICToken cToken, address spender, uint256 amount) public onlyBToken returns (bool) {
        return cToken.approve(spender, amount);
    }

}