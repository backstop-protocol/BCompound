Run Ganache

    ganache-cli --gasLimit 20000000 --gasPrice 20000 --defaultBalanceEther 1000000000 --allowUnlimitedContractSize true

Deploy Compound Contracts
Ensure that `yarn` has been executed before in the folder `compound-protocol`.

    npm run deploy-compound

Compile

    truffle compile
    truffle compile --contracts_directory compound-protocol/tests
