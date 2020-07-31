import * as t from "../../types/index";

import { BProtocolEngine, BProtocol } from "../../TestUtils/BProtocolEngine";
import { CompoundUtils } from "../../TestUtils/CompoundUtils";
import { toWei } from "web3-utils";
import BN from "bn.js";
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers");

const DetailedErc20: t.DetailedErc20Contract = artifacts.require("DetailedERC20");
const CEther: t.CEtherContract = artifacts.require("CEther");
const CErc20: t.CErc20Contract = artifacts.require("CErc20");
const Comptroller: t.ComptrollerContract = artifacts.require("Comptroller");
const PriceOracle: t.PriceOracleContract = artifacts.require("PriceOracle");

const chai = require("chai");
const expect = chai.expect;
const ZERO = new BN(0);

contract("Pool performs liquidation", async (accounts) => {
    let bProtocol: BProtocol;

    const user1 = accounts[1];
    const user2 = accounts[2];

    const engine = new BProtocolEngine(accounts);
    const compound = new CompoundUtils();

    // Compound Contracts
    let comptroller: t.ComptrollerInstance;

    // BToken Contracts
    let bETH: t.BEtherInstance;
    let bZRX: t.BErc20Instance;

    // Avatar Contracts
    let avatarUser1: t.AvatarInstance;
    let avatarUser2: t.AvatarInstance;

    // CTokens
    let cETH_addr: string;
    let cETH: t.CEtherInstance;
    let cZRX_addr: string;
    let cZRX: t.CErc20Instance;

    // ZRX
    let ZRX: t.DetailedErc20Instance;
    let ONE_ZRX: BN;
    let HUNDRED_ZRX: BN;

    async function init() {
        cETH_addr = compound.getContracts("cETH");
        cETH = await CEther.at(cETH_addr);
        cZRX_addr = compound.getContracts("cZRX");
        cZRX = await CErc20.at(cZRX_addr);

        ZRX = await DetailedErc20.at(compound.getContracts("ZRX"));
        const decimals_ZRX = await ZRX.decimals();
        ONE_ZRX = new BN(10).pow(new BN(decimals_ZRX));
        HUNDRED_ZRX = ONE_ZRX.mul(new BN(100));
    }

    before(async () => {
        // Initialize variables
        await init();

        // Deploy Compound
        // await engine.deployCompound();

        // Deploy BProtocol contracts
        bProtocol = await engine.deployBProtocol();
        comptroller = bProtocol.compound.comptroller;
    });

    it("1. should deploy BToken Contracts for cETH & cZRX", async () => {
        // BToken cETH
        bETH = await engine.deployNewBEther("cETH");
        expect(bETH.address).to.be.not.equal(ZERO_ADDRESS);

        // BToken cZRX
        bZRX = await engine.deployNewBErc20("cZRX");
        expect(bZRX.address).to.be.not.equal(ZERO_ADDRESS);
    });

    it("2. should deploy Avatar Contracts for User-1 and User-2", async () => {
        // Create Avatar for User1
        avatarUser1 = await engine.deployNewAvatar(user1);
        await avatarUser1.enableCToken(cZRX_addr);
        expect(avatarUser1.address).to.be.not.equal(ZERO_ADDRESS);

        // Create Avatar for User2
        avatarUser2 = await engine.deployNewAvatar(user2);
        await avatarUser2.enableCToken(cZRX_addr);
        expect(avatarUser2.address).to.be.not.equal(ZERO_ADDRESS);
    });

    it("3. User-1 should mint cETH with ETH", async () => {
        const balanceBefore = await cETH.balanceOf(avatarUser1.address);
        await bETH.mint({ from: user1, value: toWei("1", "ether") });
        const balanceAfter = await cETH.balanceOf(avatarUser1.address);
        expect(balanceAfter).to.be.bignumber.gt(balanceBefore);

        await bProtocol.bComptroller.enterMarket(cETH_addr, { from: user1 });
        const isAvatar1_has_ETH_membership = await comptroller.checkMembership(
            avatarUser1.address,
            cETH_addr,
        );
        expect(isAvatar1_has_ETH_membership).to.be.equal(true);
    });

    it("4. User-2 should mint cZRX with ZRX", async () => {
        await ZRX.approve(bZRX.address, HUNDRED_ZRX, { from: user2 });
        const balanceBefore = await cZRX.balanceOf(avatarUser2.address);
        await bZRX.mint(HUNDRED_ZRX, { from: user2 });
        const balanceAfter = await cZRX.balanceOf(avatarUser2.address);
        expect(balanceAfter).to.be.bignumber.gt(balanceBefore);
    });

    it("5. should validate setup ", async () => {
        // Validate ETH Market
        const ethMarket = await comptroller.markets(cETH_addr);
        expect(ethMarket["isListed"]).to.be.equal(true);
        expect(ethMarket["collateralFactorMantissa"]).to.be.bignumber.not.equal(ZERO);

        // Validate ZRX Market
        const zrxMarket = await comptroller.markets(cZRX_addr);
        expect(zrxMarket["isListed"]).to.be.equal(true);
        expect(zrxMarket["collateralFactorMantissa"]).to.be.bignumber.not.equal(ZERO);

        const isZRX_BorrowPaused = await comptroller.borrowGuardianPaused(cZRX_addr);
        expect(isZRX_BorrowPaused).to.be.equal(false);

        // Validate Avatar1 ZRX membership
        const isAvatar1_has_ZRX_membership = await comptroller.checkMembership(
            avatarUser1.address,
            cZRX_addr,
        );
        expect(isAvatar1_has_ZRX_membership).to.be.equal(false);

        // Validate ZRX token rate
        const priceOracle = bProtocol.compound.priceOracle;
        const priceZRX = await priceOracle.getUnderlyingPrice(cZRX_addr);
        expect(priceZRX).to.be.bignumber.not.equal(ZERO);

        // Validate ETH token rate
        const priceETH = await priceOracle.getUnderlyingPrice(cETH_addr);
        expect(priceETH).to.be.bignumber.not.equal(ZERO);

        // Validate User-1 account liquidity
        let result = await comptroller.getAccountLiquidity(avatarUser1.address);
        let liquidity = result[1];
        let shortFall = result[2];
        expect(liquidity).to.be.bignumber.gt(ZERO);
        expect(shortFall).to.be.bignumber.equal(ZERO);

        // Validate User-2 account liquidity
        result = await comptroller.getAccountLiquidity(avatarUser2.address);
        liquidity = result[1];
        shortFall = result[2];
        expect(liquidity).to.be.bignumber.equal(ZERO);
        expect(shortFall).to.be.bignumber.equal(ZERO);
    });

    it("6. should update ZRX token price", async () => {
        const priceZRX = await bProtocol.compound.priceOracle.getUnderlyingPrice(cZRX_addr);

        // ETH price is Oracle is always set to 1e18, represents full 1 ETH rate
        // Assume ETH rate is $100, hence 1e18 represents $100 = 1 ETH rate
        // =>> 1 ETH rate in contract = 1e18, (represents $100)
        // Assume 1 ZRX rate is $1
        // =>> 1 ZRX rate in contract = 1e18 / 100 = 1e16, (represents $1)
        const PRICE_ONE_ETH_IN_CONTRACT = new BN(10).pow(new BN(18));
        const ONE_ETH_RATE_IN_USD = new BN(100); // $100
        const ONE_ZRX_RATE_IN_USD = new BN(1); // $1

        // DIVISOR = 100 / 1 = 100
        const DIVISOR = ONE_ETH_RATE_IN_USD.div(ONE_ZRX_RATE_IN_USD);

        // PRICE_ONE_ZRX_IN_CONTRACT = 1e18 / 100 = 1e16
        const PRICE_ONE_ZRX_IN_CONTRACT = PRICE_ONE_ETH_IN_CONTRACT.div(DIVISOR);
        // TODO set price in oracle
        //bProtocol.compound.comptroller.set;
    });

    it("7. User-1 should borrow ZRX", async () => {
        const FIFTY_ZRX = ONE_ZRX.mul(new BN(50));
        await bZRX.borrow(ONE_ZRX, { from: user1 });
    });

    it("8. Pool should topup");

    it("9. Pool should liquidate");
});
