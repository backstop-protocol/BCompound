pragma solidity 0.5.16;

import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICToken } from "../interfaces/CTokenInterfaces.sol";
import { IComptroller } from "../interfaces/IComptroller.sol";

import { Exponential } from "../lib/Exponential.sol";

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AvatarBase is Exponential {
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
    uint256 public remainingLiquidationAmount;
    // Liquidation cToken
    ICToken public liquidationCToken;

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
        internal
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

    function _isCEther(ICToken cToken) internal view returns (bool) {
        return address(cToken) == address(cETH);
    }
}