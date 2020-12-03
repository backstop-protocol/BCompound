pragma solidity 0.5.16;

import { BErc20 } from "./btoken/BErc20.sol";
import { BEther } from "./btoken/BEther.sol";
import { IRegistry } from "./interfaces/IRegistry.sol";
import { IAvatar } from "./interfaces/IAvatar.sol";
import { CTokenInterface } from "./interfaces/CTokenInterfaces.sol";

contract BComptroller {

    IRegistry public registry;

    // CToken => BToken
    mapping(address => address) public c2b;

    // BToken => CToken
    mapping(address => address) public b2c;

    event NewBToken(address indexed cToken, address bToken);

    /**
     * @dev Registry address set only one time
     * @param _registry Address of the registry contract
     */
    function setRegistry(address _registry) public {
        require(address(registry) == address(0), "registry-is-already-set");
        registry = IRegistry(_registry);
    }

    function newBToken(address cToken) external returns (address) {
        // FIXME ensure that the cToken is supported on Compound
        require(c2b[cToken] == address(0), "BComptroller: BToken-already-exists");
        require(CTokenInterface(cToken).isCToken(), "BComptroller: not-a-CToken");
        bool is_cETH = cToken == registry.cEther();
        address bToken;
        if(is_cETH) {
            bToken = address(new BEther(address(registry), cToken));
        } else {
            bToken = address(new BErc20(address(registry), cToken));
        }

        c2b[cToken] = bToken;
        b2c[bToken] = cToken;
        emit NewBToken(cToken, bToken);
        return bToken;
    }

    function isBToken(address bToken) public view returns (bool) {
        return b2c[bToken] != address(0);
    }

    function enterMarket(address cToken) external returns (uint256) {
        IAvatar avatar = IAvatar(registry.getAvatar(msg.sender));
        return avatar.enterMarket(cToken);
    }
}