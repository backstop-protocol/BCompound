import * as t from "../../types/index";

import { BProtocolEngine, BProtocol } from "../../TestUtils/BProtocolEngine";
import { CompoundUtils } from "../../TestUtils/CompoundUtils";

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

        // BToken cETH
        const bETH: t.BTokenInstance = await engine.deployNewBToken("cETH");

        // Create BToken for cZRX
        const bZRX = await engine.deployNewBToken("cZRX");

        // Create Avatar for User1
        const avatarUser1 = await engine.deployNewAvatar(user1);
        console.log("Avatar User1: " + avatarUser1.address);

        // Create Avatar for User2
        const avatarUser2 = await engine.deployNewAvatar(user2);
        console.log("Avatar User2: " + avatarUser2.address);

        // User1 mints cETH with ETH
        await bETH.methods["mint()"].call({ from: user1 });

        // User2 mints cZRX with ZRX
        // await bZRX.mint;

        console.log("BToken cETH: " + bETH.address);
        console.log("BToken cZRX: " + bZRX.address);
    });
});
