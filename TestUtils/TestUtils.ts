import * as t from "../types/index";

const shell = require("shelljs");

export class TestUtils {
    public async deployCompound() {
        const deployCommand = "npm run deploy-compound";

        console.log("Executing command:" + deployCommand);
        const log = shell.exec(deployCommand, { async: false });
        
    }
}
