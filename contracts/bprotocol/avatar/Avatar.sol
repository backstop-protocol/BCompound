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
        AvatarBase(
            _pool,
            _bComptroller,
            _comptroller,
            _comp,
            _cETH
        )
    {
    }

    /**
     * @dev Mint cETH using ETH and enter market on Compound
     */
    function mint(ICEther cEther) public payable {
        super.mint(cEther);
        require(enterMarket(address(cEther)) == 0, "enterMarket failed");
    }

    /**
     * @dev Mint cToken for ERC20 and enter market on Compound
     */
    function mint(ICErc20 cToken, uint256 mintAmount) public returns (uint256) {
        uint256 result = super.mint(cToken, mintAmount);
        require(enterMarket(address(cToken)) == 0, "enterMarket failed");
        return result;
    }
}