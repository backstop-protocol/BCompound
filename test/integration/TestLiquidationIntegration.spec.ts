import * as t from "../../types/index";

import { BProtocolEngine, BProtocol } from "../../TestUtils/BProtocolEngine";
import { CompoundUtils } from "../../TestUtils/CompoundUtils";
import { toWei } from "web3-utils";

const ERC20: t.Erc20Contract = artifacts.require("ERC20");

contract("Liquidation Integration Test", async (accounts) => {
    const engine = new BProtocolEngine(accounts);
    const compound = new CompoundUtils();
    let bProtocol: BProtocol;

    before(async () => {
        // Deploy Compound
        // await engine.deployCompound();

        // Deploy BProtocol contracts
        bProtocol = await engine.deployBProtocol();
    });

    it("should allow pool to liquidate", async () => {
        const user1 = accounts[1];
        const user2 = accounts[2];

        const cETH_addr = compound.getContracts("cETH");
        const cZRX_addr = compound.getContracts("cZRX");

        // ERC20 tokens
        const ZRX = await ERC20.at(compound.getContracts("ZRX"));

        // BToken cETH
        const bETH: t.BTokenInstance = await engine.deployNewBToken("cETH");
        console.log("BToken cETH: " + bETH.address);

        // Create BToken for cZRX
        const bZRX = await engine.deployNewBToken("cZRX");
        console.log("BToken cZRX: " + bZRX.address);

        // ================
        // AVATAR CREATION
        // ================
        // Create Avatar for User1
        const avatarUser1 = await engine.deployNewAvatar(user1);
        await avatarUser1.enableCToken(cZRX_addr);
        console.log("Avatar User1: " + avatarUser1.address);

        // Create Avatar for User2
        const avatarUser2 = await engine.deployNewAvatar(user2);
        await avatarUser2.enableCToken(cZRX_addr);
        console.log("Avatar User2: " + avatarUser2.address);

        // =======
        // MINT
        // =======
        // User1 mints cETH with ETH
        // await bETH.methods["mint()"].sendTransaction({ from: user1, value: toWei("1", "ether") });

        // User2 mints cZRX with ZRX
        await ZRX.approve(bZRX.address, 1000, { from: user2 });
        await bZRX.methods["mint(uint256)"].sendTransaction(1000, { from: user2 });

        // ========
        // BORROW
        // ========

        // ========
        // TOPUP
        // ========

        // ===========
        // LIQUIDATE
        // ===========
    });
});
