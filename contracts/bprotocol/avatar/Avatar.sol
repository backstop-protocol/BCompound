pragma solidity 0.5.16;

import { AvatarBase } from "./AvatarBase.sol";
import { AbsComptroller } from "./AbsComptroller.sol";
import { AbsCToken } from "./AbsCToken.sol";
import { AbsTopUntop } from "./AbsTopUntop.sol";

/**
 * @title An Avatar contract deployed per account. The contract holds cTokens and directly interacts
 *        with Compound finance.
 * @author Smart Future Labs Ltd.
 */
contract Avatar is AbsComptroller, AbsCToken, AbsTopUntop {

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
}