import * as t from "../types/index";
import { buildComptrollerImpl } from "compound-protocol/scenario/src/Builder/ComptrollerImplBuilder";
import { CompoundUtils } from "./CompoundUtils";

const shell = require("shelljs");

const Pool: t.PoolContract = artifacts.require("Pool");
const BComptroller: t.BComptrollerContract = artifacts.require("BComptroller");
const Registry: t.RegistryContract = artifacts.require("Registry");
const BToken: t.BTokenContract = artifacts.require("BToken");
const Avatar: t.AvatarContract = artifacts.require("Avatar");

// BProtocol Class to store all BProtocol deployed contracts
export class BProtocol {
    public pool!: t.PoolInstance;
    public bComptroller!: t.BComptrollerInstance;
    public registry!: t.RegistryInstance;
    public bTokens: Map<string, t.BTokenInstance> = new Map();
}

// BProtocol System Engine to manage and deploy BProtocol contracts
export class BProtocolEngine {
    public bProtocol!: BProtocol;
    private compoundUtil = new CompoundUtils();

    // Deploy Compound contracts
    public async deployCompound() {
        const deployCommand = "npm run deploy-compound";

        console.log("Executing command:" + deployCommand);
        const log = shell.exec(deployCommand, { async: false });
    }

    // Deploy BProtocol contracts
    public async deployBProtocol(): Promise<BProtocol> {
        this.bProtocol = new BProtocol();
        const _bProtocol = this.bProtocol;
        _bProtocol.pool = await this.deployPool();
        _bProtocol.bComptroller = await this.deployBComptroller();
        _bProtocol.registry = await this.deployRegistry();

        await _bProtocol.bComptroller.setRegistry(_bProtocol.registry.address);

        // Deploy BToken for cETH
        await this.deployNewBToken(this.compoundUtil.getContracts("cETH"));

        // console.log("Pool: " + _bProtocol.pool.address);
        // console.log("BComptroller: " + _bProtocol.bComptroller.address);
        // console.log("Registry: " + _bProtocol.registry.address);

        return this.bProtocol;
    }

    // Deploy Pool contract
    private async deployPool(): Promise<t.PoolInstance> {
        return await Pool.new();
    }

    // Deploy BComptroller contract
    private async deployBComptroller(): Promise<t.BComptrollerInstance> {
        return await BComptroller.new(this.bProtocol.pool.address);
    }

    // Deploy Registry contract
    private async deployRegistry(): Promise<t.RegistryInstance> {
        const comptroller = this.compoundUtil.getComptroller();
        const comp = this.compoundUtil.getComp();
        const cETH = this.compoundUtil.getContracts("cETH");
        const priceOracle = this.compoundUtil.getPriceOracle();
        const pool = this.bProtocol.pool.address;
        const bComptroller = this.bProtocol.bComptroller.address;
        return await Registry.new(comptroller, comp, cETH, priceOracle, pool, bComptroller);
    }

    public getBProtocol(): BProtocol {
        return this.bProtocol;
    }

    // Child Contract Creation
    // ========================

    // Deploy BToken
    public async deployNewBToken(cToken: string): Promise<t.BTokenInstance> {
        const bToken_addr = await this.bProtocol.bComptroller.newBToken.call(cToken);
        await this.bProtocol.bComptroller.newBToken(cToken);
        const bToken: t.BTokenInstance = await BToken.at(bToken_addr);
        this.bProtocol.bTokens.set(cToken, bToken);
        return bToken;
    }

    public async deployNewAvatar(_from: string): Promise<t.AvatarInstance> {
        const avatar_addr = await this.bProtocol.registry.newAvatar.call({ from: _from });
        await this.bProtocol.registry.newAvatar({ from: _from });
        const avatar: t.AvatarInstance = await Avatar.at(avatar_addr);
        return avatar;
    }
}
