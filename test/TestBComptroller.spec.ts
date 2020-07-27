import * as t from "types/index";
import { TestUtils } from "../TestUtils/TestUtils";

const BComptroller: t.BComptrollerContract = artifacts.require("BComptroller");

describe("aaa", async () => {
    before(async () => {
        const testUtils = new TestUtils();
        await testUtils.deployCompound();
    });

    it("should create new BToken", async () => {
        const a = await BComptroller.new();
    });
});
