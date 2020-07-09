pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICEther } from "./interfaces/CTokenInterfaces.sol";
import { PriceOracle } from "./interfaces/CTokenInterfaces.sol";
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
        require(msg.sender == bToken, "Only BToken is authorized");
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

    // OPEN FUNCTIONS
    // ===============
    /**
     * @dev Anyone allowed to enable a CToken on Avatar
     * @param cToken CToken address to enable
     */
    function enableCToken(ICToken cToken) external {
        // 1. Validate cToken supported on the Compound
        require(comptroller.mintAllowed(address(cToken), address(this), 0) == 0, "CToken not supported");
        // 2. Initiate inifinite approval
        IERC20 underlying = IERC20(cToken.underlying());
        // 2.1 De-approve any previous approvals, before approving again
        underlying.safeApprove(address(cToken), 0);
        // 2.3 Initiate inifinite approval
        underlying.safeApprove(address(cToken), uint256(-1));
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
        return cToken.mint(mintAmount);
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

    function borrow(ICToken cToken, address user, uint256 borrowAmount) external onlyBToken returns (uint256) {
        require(cToken.borrow(borrowAmount) == 0, "Borrow failed");
        IERC20 underlying = IERC20(cToken.underlying());
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(user, borrowedAmount);
        require(canUntop(), "Cannot untop");
        return 0;
    }

    function repayBorrow(ICToken cToken, address user, uint256 repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), amountToRepay);
        return cToken.repayBorrow(amountToRepay);
    }

    function repayBorrowBehalf(ICToken cToken, address user, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
        require(borrower != address(this), "Borrower and Avatar cannot be same");
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(borrower);
        }

        IERC20 underlying = IERC20(cToken.underlying());
        underlying.safeTransferFrom(user, address(this), amountToRepay);
        return cToken.repayBorrowBehalf(borrower, amountToRepay);
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

        // 1. Check if untop allowed
        require(canUntop(), "Cannot untop");

        // 2. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "Borrow failed");

        // 3. Transfer borrowed amount to Pool contract
        IERC20 underlying = IERC20(toppedUpCToken.underlying());
        underlying.safeTransfer(pool, underlying.balanceOf(address(this)));

        // 4. Udpdate storage for toppedUp details
        toppedUpCToken = ICToken(0); // FIXME Might not need to reset (avoid gas consumption)
        toppedUpAmount = 0; // FIXME Might not need to reset (avoid gas consumption)
        topped = false;

        return true;
    }

    // Helper Functions
    // ================
    function getUserDebtAndCollateralNormalized() public returns(uint256 debtValue, uint256 maxBorrowPowerValue) {
        MathError mErr;
        uint256 borrowBalanceValue;
        PriceOracle priceOracle = PriceOracle(comptroller.oracle());
        address[] memory assets = comptroller.getAssetsIn(address(this));
        debtValue = 0;
        for(uint256 i = 0; i < assets.length; i++) {
            ICToken cToken = ICToken(assets[i]);
            uint256 price = priceOracle.getUnderlyingPrice(cToken);
            require(price > 0, "Invalid price");
            uint256 borrowBalanceCurrent = cToken.borrowBalanceCurrent(address(this));
            (mErr, borrowBalanceValue) = mulUInt(borrowBalanceCurrent, price);
            require(mErr == MathError.NO_ERROR, "Mul error");
            (mErr, debtValue) = addUInt(debtValue, borrowBalanceValue);
            require(mErr == MathError.NO_ERROR, "Add error");
        }

        (uint256 err, uint256 liquidity,uint256 shortfall) = comptroller.getAccountLiquidity(address(this));
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