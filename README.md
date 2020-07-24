If the submodule `compound-protocol` is not updated, run this command to get the updated submodule code.

    git submodule update --init

Install the dependencies required for `compound-demo` and `compound-protocol`

    npm install

Command to compile the `compound-demo` and `compound-protocol` contracts

    npm run compile

Run Buidler EVM

    npx buidler node

Deploy Compound Contracts on ganache. This command will not stop automatically. You need to kill this with [Ctrl+C] once deployment is done.

    npm run deploy-compound

Execute tests

    npx buidler test

Deploy Contracts

    npx buidler run scripts/deploy.js
