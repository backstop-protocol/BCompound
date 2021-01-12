pragma solidity 0.5.16;

import { AbsComptroller } from "./AbsComptroller.sol";
import { AbsCToken } from "./AbsCToken.sol";
import { ICToken, ICEther, ICErc20 } from "../interfaces/CTokenInterfaces.sol";
import { IComp } from "../interfaces/IComp.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title An Avatar contract deployed per account. The contract holds cTokens and directly interacts
 *        with Compound finance.
 * @author Smart Future Labs Ltd.
 */
contract Avatar is AbsComptroller, AbsCToken {

    // @NOTICE: NO CONSTRUCTOR AS ITS USED AS AN IMPLEMENTATION CONTRACT FOR PROXY

    /**
     * @dev Initialize the contract variables
     * @param _registry Registry contract address
     */
    function initialize(address _registry, address comp, address compVoter) external {
        _initAvatarBase(_registry);
        IComp(comp).delegate(compVoter);
    }

    //override
    /**
     * @dev Mint cETH using ETH and enter market on Compound
     * @notice onlyBToken can call this function, as `super.mint()` is protected with `onlyBToken` modifier
     */
    function mint() public payable {
        super.mint();
        ICEther cEther = ICEther(registry.cEther());
        require(_enterMarket(address(cEther)) == 0, "enterMarket-failed");
    }

    //override
    /**
     * @dev Mint cToken for ERC20 and enter market on Compound
     * @notice onlyBToken can call this function, as `super.mint()` is protected with `onlyBToken` modifier
     */
    function mint(ICErc20 cToken, uint256 mintAmount) public returns (uint256) {
        require(_enterMarket(address(cToken)) == 0, "enterMarket-failed");
        IERC20 underlying = cToken.underlying();
        underlying.safeApprove(address(cToken), mintAmount);
        uint256 result = super.mint(cToken, mintAmount);
        return result;
    }

    // EMERGENCY FUNCTIONS
    function resetApprove(IERC20 token, address spender) external onlyAvatarOwner {
        // NOTICE: not enclosing in require()
        token.approve(spender, 0);
    }

    function transferERC20(address token, uint256 amount) external onlyAvatarOwner {
        // ensure that token should not be a cToken, this is to protect user Score manipulation
        require(ICToken(token).isCToken() == false, "Avatar: cToken-not-allowed");

        address owner = registry.ownerOf(address(this));
        IERC20 erc20 = IERC20(token);
        // NOTICE: not enclosing in require()
        erc20.transfer(owner, amount);
    }

    function transferETH(uint256 amount) external onlyAvatarOwner {
        address owner = registry.ownerOf(address(this));
        address payable ownerPayable = address(uint160(owner));
        ownerPayable.transfer(amount);
    }
}
