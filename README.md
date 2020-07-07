If the submodule `compound-protocol` is not updated, run this command to get the updated submodule code.

    git submodule update --init

Install the dependencies required for `compound-demo` and `compound-protocol`

    npm install

Command to compile the `compound-demo` and `compound-protocol` contracts

    npm run compile

Run Ganache with the defined configs. These configs are required by `compound-protocol`

    npm run ganache

Deploy Compound Contracts on ganache. This command will not stop automatically. You need to kill this with [Ctrl+C] once deployment is done.

    npm run deploy-compound

Execute tests

    truffle test

# NEW COMMANDS

    npm install
    npx buidler compile
