//import * as compound from "../compound-protocol/networks/development.json";

export class CompoundUtils {
    public compound: any;

    private loanJson() {
        this.compound = require("../compound-protocol/networks/development.json");
    }

    public getComptroller(): string {
        this.loanJson();
        return this.compound.Contracts.Comptroller;
    }

    public getPriceOracle(): string {
        this.loanJson();
        return this.compound.Contracts.PriceOracle;
    }

    public getComp(): string {
        this.loanJson();
        return this.compound.Contracts.COMP;
    }

    public getContracts(key: string): string {
        this.loanJson();
        return this.compound.Contracts[key];
    }
}
