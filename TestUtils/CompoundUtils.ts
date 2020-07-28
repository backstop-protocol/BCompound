//import * as compound from "../compound-protocol/networks/development.json";

export class CompoundUtils {
    public compound = require("../compound-protocol/networks/development.json");

    public getComptroller(): string {
        return this.compound.Contracts.Comptroller;
    }

    public getPriceOracle(): string {
        return this.compound.Contracts.PriceOracle;
    }

    public getComp(): string {
        return this.compound.Contracts.COMP;
    }

    public getContracts(key: string): string {
        return this.compound.Contracts[key];
    }
}
