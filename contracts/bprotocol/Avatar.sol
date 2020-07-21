pragma solidity 0.5.16;

import { ICToken } from "./interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "./interfaces/CTokenInterfaces.sol";
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
    ICEther public cETH;

    /** Storage for topup details */
    // Topped up cToken
    ICToken public toppedUpCToken;
    // Topped up amount of tokens
    uint256 public toppedUpAmount;
    // Remaining max amount available for liquidation
    uint256 remainingLiquidationAmount;

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
     * @param _cETH cETH contract address
     */
    constructor(
        address _pool,
        address _bComptroller,
        address _comptroller,
        address _comp,
        address _cETH
    )
        public
    {
        pool = _pool;
        bComptroller = _bComptroller;
        comptroller = IComptroller(_comptroller);
        comp = IERC20(_comp);
        cETH = ICEther(_cETH);
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

    function _disableCToken(ICToken cToken) internal {
        IERC20 underlying = cToken.underlying();
        underlying.safeApprove(address(cToken), 0);
    }

    // CEther
    // ======
    function mint(ICEther cEther) external payable onlyBToken {
        cEther.mint.value(msg.value)();
        _softReevaluate();
    }

    function repayBorrow() external payable onlyBToken {
        cETH.repayBorrow.value(msg.value)();
        _softReevaluate();
    }

    function repayBorrowBehalf(address borrower) external payable onlyBToken {
        cETH.repayBorrowBehalf.value(msg.value)(borrower);
    }

    // CToken
    // ======
    function mint(ICErc20 cToken, uint256 mintAmount) external onlyBToken returns (uint256) {
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 result = cToken.mint(mintAmount);
        _softReevaluate();
        return result;
    }

    function redeem(ICToken cToken, uint256 redeemTokens) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeem(redeemTokens);
        IERC20 underlying = cToken.underlying();
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        _hardReevaluate();
        return result;
    }

    function redeemUnderlying(ICToken cToken, uint256 redeemAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.redeemUnderlying(redeemAmount);
        IERC20 underlying = cToken.underlying();
        uint256 redeemedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, redeemedAmount);
        _hardReevaluate();
        return result;
    }

    function borrow(ICToken cToken, uint256 borrowAmount) external onlyBToken returns (uint256) {
        uint256 result = cToken.borrow(borrowAmount);
        IERC20 underlying = cToken.underlying();
        uint256 borrowedAmount = underlying.balanceOf(address(this));
        underlying.safeTransfer(msg.sender, borrowedAmount);
        _hardReevaluate();
        return result;
    }

    function repayBorrow(ICErc20 cToken, uint256 repayAmount) external onlyBToken returns (uint256) {
        uint256 amountToRepay = repayAmount;
        if(repayAmount == uint(-1)) {
            amountToRepay = cToken.borrowBalanceCurrent(address(this));
        }

        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(msg.sender, address(this), amountToRepay);
        uint256 result = cToken.repayBorrow(amountToRepay);
        _softReevaluate();
        return result;
    }

    function repayBorrowBehalf(ICErc20 cToken, address borrower, uint256 repayAmount) external onlyBToken returns (uint256) {
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
        uint256[] memory result = comptroller.enterMarkets(cTokens);
        _softReevaluate();
        return result;
    }

    function exitMarket(ICToken cToken) external onlyBComptroller returns (uint256) {
        comptroller.exitMarket(address(cToken));
        _disableCToken(cToken);
        _hardReevaluate();
    }

    function getAccountLiquidity() external view returns (uint err, uint liquidity, uint shortFall) {
        // If not topped up, get the account liquidity from Comptroller
        (err, liquidity, shortFall) = comptroller.getAccountLiquidity(address(this));
        if(!_isToppedUp()) {
            return (err, liquidity, shortFall);
        }
        require(err == 0, "Error in getting account liquidity");

        IPriceOracle priceOracle = IPriceOracle(comptroller.oracle());
        uint256 price = priceOracle.getUnderlyingPrice(cETH);
        uint256 toppedUpAmtInETH = mulTrucate(toppedUpAmount, price);

        // If topped up
        // when shortFall = 0
        if(shortFall == 0) {
            liquidity = (liquidity > toppedUpAmtInETH)
                ? sub_(liquidity, toppedUpAmtInETH)
                : toppedUpAmtInETH;
            //shotFall = liquidity 
        }

        // when liquidity = 0
        if(liquidity == 0) shortFall = add_(shortFall, toppedUpAmtInETH);
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
     * @dev Topup this avatar by repaying borrowings with ETH
     */
    function topup() external payable onlyPool {
        // when already topped
        if(_isToppedUp()) return;

        // 2. Repay borrows from Pool to topup
        cETH.repayBorrow.value(msg.value)();

        // 3. Store Topped-up details
        _topupAndStoreDetails(cETH, msg.value);
    }

    /**
     * @dev Topup the borrowed position of this Avatar by repaying borrows from the pool
     * @notice Only Pool contract allowed to call the topup.
     * @param cToken CToken address to use to RepayBorrows
     * @param topupAmount Amount of tokens to Topup
     */
    function topup(ICErc20 cToken, uint256 topupAmount) external onlyPool {
        // when already topped
        if(_isToppedUp()) return;

        // 1. Transfer funds from the Pool contract
        IERC20 underlying = cToken.underlying();
        underlying.safeTransferFrom(pool, address(this), topupAmount);

        // 2. Repay borrows from Pool to topup
        require(cToken.repayBorrow(topupAmount) == 0, "RepayBorrow failed");

        // 3. Store Topped-up details
        _topupAndStoreDetails(cToken, topupAmount);
    }

    function _topupAndStoreDetails(ICToken cToken, uint256 topupAmount) internal {
        toppedUpCToken = cToken;
        toppedUpAmount = topupAmount;
    }

    /**
     * @dev Checks if this Avatar can untop the amount.
     * @return `true` if allowed to borrow, `false` otherwise.
     */
    function _canUntop() internal returns (bool) {
        // When not topped up, just return true
        if(!_isToppedUp()) return true;
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
        if(!_isToppedUp()) return;

        // 1. Borrow from Compound and send tokens to Pool
        require(toppedUpCToken.borrow(toppedUpAmount) == 0, "Borrow failed");

        if(address(toppedUpCToken) == address(cETH)) {
            // 2. Send borrowed ETH to Pool contract
            // FIXME Use OpenZeppelin `Address.sendValue`
            msg.sender.transfer(toppedUpAmount);
        } else {
            // 2. Transfer borrowed amount to Pool contract
            IERC20 underlying = toppedUpCToken.underlying();
            underlying.safeTransfer(pool, toppedUpAmount);
        }

        // 3. Udpdate storage for toppedUp details
        _resetTopupStorage();
    }

    function _resetTopupStorage() internal {
        toppedUpCToken = ICToken(0); // FIXME Might not need to reset (avoid gas consumption)
        toppedUpAmount = 0; // FIXME Might not need to reset (avoid gas consumption)
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

    // CToken / CEther
    function liquidateBorrow(
        ICToken cTokenDebt,
        uint256 underlyingAmtToLiquidate,
        ICToken cTokenCollateral
    )
        external payable onlyPool
    {
        // 1. Can liquidate?
        require(canLiquidate(), "Cannot liquidate");

        // 2. Is toppedUp OR partially liquidated
        require(_isToppedUp() || _isPartiallyLiquidated(), "Cannot perform liquidateBorrow");

        address avatar = address(this);
        uint256 avatarDebt = cTokenDebt.borrowBalanceCurrent(avatar);
        // `toppedUpAmount` is also called poolDebt;
        uint256 totalDebt = add_(avatarDebt, toppedUpAmount);

        if(!_isPartiallyLiquidated()) {
            // First time liquidation is performed after topup
            // remainingLiquidationAmount = closeFactorMantissa * totalDedt / 1e18;
            remainingLiquidationAmount = mulTrucate(comptroller.closeFactorMantissa(), totalDebt);
        }

        bool isCEtherDebt = _isCEther(cTokenDebt);
        // 3. `underlayingAmtToLiquidate` is under limit
        uint256 amountToLiquidate = isCEtherDebt ? msg.value : underlyingAmtToLiquidate;
        require(amountToLiquidate <= remainingLiquidationAmount, "liquidateBorrow: amountToLiquidate is too big");

        // 4. Liquidator perform repayBorrow
        uint256 repayAmount = 0;
        if(toppedUpAmount < amountToLiquidate) {
            repayAmount = sub_(amountToLiquidate, toppedUpAmount);

            if(isCEtherDebt) {
                // CEther
                cETH.repayBorrow.value(repayAmount)();
            } else {
                // CErc20
                toppedUpCToken.underlying().safeTransferFrom(msg.sender, address(this), repayAmount);
                require(ICErc20(address(cTokenDebt)).repayBorrow(repayAmount) == 0, "liquidateBorrow: repayBorrow failed");
            }
            toppedUpAmount = 0;
        }
        else {
            // Partially liqudated
            toppedUpAmount = sub_(toppedUpAmount, amountToLiquidate);
            repayAmount = amountToLiquidate;
        }

        // 4.2 Update remaining liquidation amount
        remainingLiquidationAmount = sub_(remainingLiquidationAmount, repayAmount);

        // 5. Calculate premium and transfer to Liquidator
        (uint err, uint seizeTokens) = comptroller.liquidateCalculateSeizeTokens(
            address(cTokenDebt),
            address(cTokenCollateral),
            amountToLiquidate
        );
        require(err == 0, "Error in liquidateCalculateSeizeTokens");

        // 6. Transfer permiumAmount to liquidator
        require(cTokenCollateral.transfer(msg.sender, seizeTokens), "Collateral cToken transfer failed");

        // 7. Reset topped up storage
        if(toppedUpAmount == 0) _resetTopupStorage();

        // 8. Send rest of the ETH back to sender
        // FIXME Need to use OpenZeppelin `Address.sendValue()`
        if(isCEtherDebt) {
            uint256 refundAmount = sub_(amountToLiquidate, repayAmount);
            if(refundAmount > 0) msg.sender.transfer(refundAmount);
        }
    }

    // ERC20
    // ======
    function transfer(ICToken cToken, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transfer(dst, amount);
        _hardReevaluate();
        return result;
    }

    function transferFrom(ICToken cToken, address src, address dst, uint256 amount) public onlyBToken returns (bool) {
        bool result = cToken.transferFrom(src, dst, amount);
        _hardReevaluate();
        return result;
    }

    function approve(ICToken cToken, address spender, uint256 amount) public onlyBToken returns (bool) {
        return cToken.approve(spender, amount);
    }

    /**
     * @dev Fallback to receieve ETH from CEther.borrow()
     */
    // TODO Can add a modifier to allow only cTokens. However, don't see a need for
    // the modifier
    function () external payable {
        // Receive ETH
    }

    /**
     * @dev Hard check to ensure untop is allowed and then reset remaining liquidation amount
     */
    function _hardReevaluate() internal {
        // Check: must allowed untop
        require(_canUntop(), "Cannot untop");
        // When already partially liquidated, reset it to force re-calculation
        if(_isPartiallyLiquidated()) {
            remainingLiquidationAmount = 0;
        }
    }

    /**
     * @dev Soft check and reset remaining liquidation amount
     */
    function _softReevaluate() internal {
        // 1. Pre-condition checks
        // Execute only when partially liquidated, otherwise just return
        if(!_isPartiallyLiquidated()) return;

        // 2. Reset MaxLiquidationSize when can untop
        require(_canUntop(), "Cannot untop");
        // This would enforce the MaxLiquidationSize calaulation again
        remainingLiquidationAmount = 0;
    }

    function _isToppedUp() internal view returns (bool) {
        return toppedUpAmount > 0;
    }

    function _isPartiallyLiquidated() internal view returns (bool) {
        return remainingLiquidationAmount > 0;
    }

    function _isCEther(ICToken cToken) internal view returns (bool) {
        return address(cToken) == address(cETH);
    }


    // 4 getAccountLiquidity calculation

}