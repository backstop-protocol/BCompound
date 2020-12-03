If the submodule `compound-protocol` is not updated, run this command to get the updated submodule code.

    git submodule update --init --recursive

Install the dependencies required for `compound-demo` and `compound-protocol`

    npm install

Command to compile the `compound-demo` and `compound-protocol` contracts

    npm run compile

Run Hardhat EVM

    npx hardhat node

Deploy Compound Contracts on ganache. This command will not stop automatically. You need to kill this with [Ctrl+C] once deployment is done.

    npm run deploy-compound

Execute tests

    npx run test

Deploy Contracts

    npx hardhat run scripts/deploy.js
