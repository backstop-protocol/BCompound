pragma solidity 0.5.16;

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

/**
 * @dev Registry contract to maintain Compound addresses and other details.
 */
contract Registry is Ownable {

    // Compound Contracts
    address public comptroller;
    address public priceOracle;

    constructor(address _comptroller, address _priceOracle) public {
        require(_comptroller != address(0), "Comptroller address is zero");
        require(_priceOracle != address(0), "PriceOracle address is zero");

        comptroller = _comptroller;
        priceOracle = _priceOracle;
    }

    /*
    function updateComptroller(address newComptroller) external onlyOwner {
        require(newComptroller != address(0), "NewComptroller address is zero");
        require(newComptroller != comptroller, "Comptroller address is same as existing");

        comptroller = newComptroller;
    }
    */

    /*
    function updatePriceOracle(address newPriceOracle) external onlyOwner {
        require(newPriceOracle != address(0), "NewPriceOracle address is zero");
        require(newPriceOracle != priceOracle, "PriceOracle address is same as existing");

        priceOracle = newPriceOracle;
    }
    */

}