import * as compound from "../compound-protocol/networks/development.json";

export class CompoundUtils {
    public getComptroller(): string {
        return compound.Contracts.Comptroller;
    }

    public getPriceOracle(): string {
        return compound.Contracts.PriceOracle;
    }

    public getComp(): string {
        return compound.Contracts.COMP;
    }

    public getContracts(key: string): string {
        return compound.Contracts[key];
    }
}
