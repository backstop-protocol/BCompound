pragma solidity 0.5.16;

import { AvatarBase } from "./AvatarBase.sol";
import { AbsComptroller } from "./AbsComptroller.sol";
import { AbsCToken } from "./AbsCToken.sol";

import { ICEther } from "../interfaces/CTokenInterfaces.sol";
import { ICErc20 } from "../interfaces/CTokenInterfaces.sol";

/**
 * @title An Avatar contract deployed per account. The contract holds cTokens and directly interacts
 *        with Compound finance.
 * @author Smart Future Labs Ltd.
 */
contract Avatar is AbsComptroller, AbsCToken {

    /**
     * @dev Constructor
     * @param _bComptroller BComptroller contract address
     * @param _comptroller Compound finance Comptroller contract address
     * @param _comp Compound finance COMP token contract address
     * @param _cETH cETH contract address
     * @param _registry Registry contract address
     */
    constructor(
        address _bComptroller,
        address _comptroller,
        address _comp,
        address _cETH,
        address _registry
    )
        public
        AvatarBase(
            _bComptroller,
            _comptroller,
            _comp,
            _cETH,
            _registry
        )
    {
    }

    //override
    /**
     * @dev Mint cETH using ETH and enter market on Compound
     * @notice onlyBToken can call this function, as `super.mint()` is protected with `onlyBToken` modifier
     */
    function mint() public payable {
        super.mint();
        require(_enterMarket(address(cETH)) == 0, "enterMarket-failed");
    }

    //override
    /**
     * @dev Mint cToken for ERC20 and enter market on Compound
     * @notice onlyBToken can call this function, as `super.mint()` is protected with `onlyBToken` modifier
     */
    function mint(ICErc20 cToken, uint256 mintAmount) public returns (uint256) {
        require(_enterMarket(address(cToken)) == 0, "enterMarket-failed");
        uint256 result = super.mint(cToken, mintAmount);
        return result;
    }
}