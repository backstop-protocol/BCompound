pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICEther } from "./interfaces/CTokenInterfaces.sol";
import { IPriceOracle } from "./interfaces/CTokenInterfaces.sol";
import { IComptroller } from "./interfaces/IComptroller.sol";
import { IRegistry } from "./interfaces/IRegistry.sol";

import { Exponential } from "./lib/Exponential.sol";

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title An Avatar contract deployed per account. The contract holds cTokens and directly interacts
 *        with Compound finance.
 * @author Smart Future Labs Ltd.
 */
contract Avatar is Exponential {
    using SafeERC20 for IERC20;

    address public pool;
    address public bComptroller;
    IComptroller public comptroller;
    IERC20 public comp;

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

    /**
     * @dev Constructor
     * @param _pool Pool contract address
     * @param _bComptroller BComptroller contract address
     * @param _comptroller Compound finance Comptroller contract address
     * @param _comp Compound finance COMP token contract address
     */
    constructor(
        address _pool,
        address _bComptroller,
        address _comptroller,
        address _comp
    )
        public
    {
        pool = _pool;
        bComptroller = _bComptroller;
        comptroller = IComptroller(_comptroller);
        comp = IERC20(_comp);
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
        IERC20 underlying = cToken.underlying();
        // 2.1 De-approve any previous approvals, before approving again
        underlying.safeApprove(address(cToken), 0);
        // 2.3 Initiate inifinite approval
        underlying.safeApprove(address(cToken), uint256(-1));
    }

    // FIXME Need to add modifier to protect the function call
    function disableCToken(ICToken cToken) public {
        IERC20 underlying = cToken.underlying();
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
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        return cToken.mint(mintAmount);
    }

    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);
        IERC20 underlying = cToken.underlying();
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        require(_canUntop(), "Cannot untop");
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        IERC20 underlying = cToken.underlying();
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        require(_canUntop(), "Cannot untop");
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        IERC20 underlying = cToken.underlying();
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, borrowedAmount);
        require(_canUntop(), "Cannot untop");
        return result;
    }

    function repayBorrow(ICToken cToken, uint256 repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        return cToken.repayBorrow(amountToRepay);
    }

    function repayBorrowBehalf(ICToken cToken, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
        require(borrower != address(this), "Borrower and Avatar cannot be same");
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(borrower);
        }

        IERC20 underlying = cToken.underlying();
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
        require(_canUntop(), "Cannot untop");
        disableCToken(cToken);
    }

    function claimComp() external onlyBComptroller {
        comptroller.claimComp(address(this));
        comp.safeTransfer(msg.sender, comp.balanceOf(address(this)));
    }

    function claimComp(address[] calldata cTokens) external onlyBComptroller {
        comptroller.claimComp(address(this), cTokens);
        comp.safeTransfer(msg.sender, comp.balanceOf(address(this)));
    }

    // Topup / Untop
    // =============
    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     * @param cToken CToken address to use to RepayBorrows
     * @param topupAmount Amount of tokens to Topup
     */
    function topup(ICToken cToken, uint256 topupAmount) external onlyPool {
        // when already topped
        if(topped) return;

        // 1. Transfer funds from the Pool contract
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(pool, address(this), topupAmount);

        // 2. Repay borrows from Pool to topup
        require(cToken.repayBorrow(topupAmount) == 0, "RepayBorrow failed");

        // 3. Store Topped-up details
        toppedUpCToken = cToken;
        toppedUpAmount = topupAmount;
        topped = true;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function _canUntop() internal returns (bool) {
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
    function untop() external onlyPool {
        // when already untopped
        if(!topped) return;

        // 1. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "Borrow failed");

        // 2. Transfer borrowed amount to Pool contract
        IERC20 underlying = toppedUpCToken.underlying();
        underlying.safeTransfer(pool, underlying.balanceOf(address(this)));

        // 3. Udpdate storage for toppedUp details
        _resetTopupStorage();
    }

    function _resetTopupStorage() internal {
        toppedUpCToken = ICToken(0); // FIXME Might not need to reset (avoid gas consumption)
        toppedUpAmount = 0; // FIXME Might not need to reset (avoid gas consumption)
        topped = false;
    }

    // Helper Functions
    // ================
    function getUserDebtAndCollateralNormalized() public returns(uint256 debtInETH, uint256 maxBorrowPowerInETH) {
        IPriceOracle priceOracle = IPriceOracle(comptroller.oracle());
        address[] memory assets = comptroller.getAssetsIn(address(this));
        debtInETH = 0;
        for(uint256 i = 0; i < assets.length; i++) {
            ICToken cToken = ICToken(assets[i]);
            uint256 price = priceOracle.getUnderlyingPrice(cToken);
            require(price > 0, "Invalid price");
            uint256 borrowBalanceCurrent = cToken.borrowBalanceCurrent(address(this));
            uint256 borrowBalanceValue = mul_(borrowBalanceCurrent, price);
            debtInETH = add_(debtInETH, borrowBalanceValue);
        }

        (uint256 err, uint256 liquidity,uint256 shortfall) = comptroller.getAccountLiquidity(address(this));
        require(err == 0, "comp.getAccountLiquidity failed");
        if(liquidity > 0) {
            maxBorrowPowerInETH = add_(debtInETH, liquidity);
        }
        else {
            maxBorrowPowerInETH = sub_(debtInETH, shortfall);
        }
    }

    // LIQUIDATION
    // ============
    /**
     * @dev Returns the status if this Avatar's debt can be liquidated
     * @return `true` when this Avatar can be liquidated, `false` otherwise
     */
    function canLiquidate() public returns (bool) {
        return !_canUntop();
    }

    function liquidateBorrow(ICToken cTokenDebt, uint256 underlyingAmtToLiquidate, ICToken cTokenCollateral) external onlyPool {
        // 1. Can liquidate?
        require(canLiquidate(), "Cannot liquidate");

        // 2. Is cToken == toppedUpCToken: then only perform liquidation considering `toppedUpAmount`
        require(topped && cTokenDebt == toppedUpCToken, "Not allowed to liquidate with given cToken debt");

        IERC20 underlying = toppedUpCToken.underlying();
        address avatar = address(this);
        uint256 avatarDebt = cTokenDebt.borrowBalanceCurrent(avatar);
        // `toppedUpAmount` is also called poolDebt;
        uint256 totalDebt = add_(avatarDebt, toppedUpAmount);

        // maxLiquidationAmount = closeFactorMantissa * totalDedt / 1e18;
        uint maxLiquidationAmount = mulTrucate(comptroller.closeFactorMantissa(), totalDebt);

        // 3. `underlayingAmtToLiquidate` is under limit
        require(underlyingAmtToLiquidate <= maxLiquidationAmount, "liquidateBorrow: underlyingAmtToLiquidate is too big");

        // 4. Liquidator perform repayBorrow
        if(toppedUpAmount < underlyingAmtToLiquidate) {
            uint256 repayAmount = sub_(underlyingAmtToLiquidate, toppedUpAmount);
            underlying.safeTransferFrom(msg.sender, address(this), repayAmount);
            require(cTokenDebt.repayBorrow(repayAmount) == 0, "liquidateBorrow: repayBorrow failed");
            toppedUpAmount = 0;
        }
        else {
            toppedUpAmount = sub_(toppedUpAmount, underlyingAmtToLiquidate);
        }

        // 5. Calculate premium and transfer to Liquidator
        // underlyingValue = underlyingAmtToLiquidate * cTokenDebtPrice
        IPriceOracle priceOracle = IPriceOracle(comptroller.oracle());
        uint underlyingValue = mul_(underlyingAmtToLiquidate, priceOracle.getUnderlyingPrice(cTokenDebt));
        // collateralAmount = (underlyingValue * 1e18) / (cTokenCollPrice * cTokenExchangeRate)
        uint collateralAmount = mul_(underlyingValue, 1e18) /
            mul_(priceOracle.getUnderlyingPrice(cTokenCollateral), cTokenCollateral.exchangeRateCurrent());
        // permiumAmount = collateralAmount * liquidationIncentive / 1e18
        uint permiumAmount = mulTrucate(collateralAmount, comptroller.liquidationIncentiveMantissa());

        // 6. Transfer permiumAmount to liquidator
        require(cTokenCollateral.transfer(msg.sender, permiumAmount), "Collateral cToken transfer failed");

        // 7. Reset topped up storage
        if(toppedUpAmount == 0) _resetTopupStorage();
    }

    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transfer(dst, amount);
        require(_canUntop(), "Cannot untop");
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);
        require(_canUntop(), "Cannot untop");
        return result;
    }

    function approve(ICToken cToken, address spender, uint256 amount) public onlyBToken returns (bool) {
        return cToken.approve(spender, amount);
    }

}