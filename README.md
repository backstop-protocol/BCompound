Get the latest submodules:

    git submodule update --init --recursive

Install the dependencies required for `BCompound` and `compound-protocol`. Below command requires `npm` and `yarn` (compound-protocol uses yarn) installed:

    npm install

Compiles the `BCompound` and `compound-protocol` contracts:

    npx hardhat compile

Generate TypeChain typings:

    npx hardhat typechain

Run Hardhat EVM (in separate shell window):

    npx hardhat node

The tests automaticallt deploys Compound Contracts on ganache / hardhat-HRE. Below command requires `solc` command installed, if not installed, run `sudo snap install solc` (only for ubuntu). The `solc` version should be `0.5.16`. You can use `solc-select` (https://github.com/crytic/solc-select):

    npx hardhat test

Deploy Contracts on Kovan / Mainnet:

    npx hardhat run scripts/deploy.js

Instructions to test with truffle

    npx  ganache-cli  -l 1250000000000 --allowUnlimitedContractSize -a 20 -q -e 100000000000000

    npm run deploy-compound

    npx truffle test