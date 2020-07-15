pragma solidity 0.5.16;

import { Avatar } from "./Avatar.sol";

/**
 * @title Factory contract to create new Avatar contracts
 * @author Smart Future Labs Ltd.
 */
contract AvatarFactory {

    address public pool;
    address public bComptroller;
    address public comptroller;
    address public comp;

    constructor(
        address _pool,
        address _bComptroller,
        address _comptroller,
        address _comp
    )
        public
    {
        require(_pool != address(0), "Pool address is zero");
        require(_bComptroller != address(0), "BComptroller address is zero");
        require(_comptroller != address(0), "Comptroller address is zero");
        require(_comp != address(0), "Comp address is zero");

        pool = _pool;
        comptroller = _comptroller;
    }

    /**
     * @dev Deploys a new instance of Avatar contract
     */
    function newAvatar() external returns (address) {
        return address(new Avatar(pool, bComptroller, comptroller, comp));
        // TODO Accounting in Registry to maintain that the Avatar is created by the BProtocol
    }
}