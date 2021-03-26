
## Testing with Bot

Testing of the Bot requires four different terminal sessions.

### Load BCompound snapshot

Load BCompound contracts snapshot in first CLI session:

`$ FILE=bcompound npm run load-snapshot`

Ensure that ganache started before starting the following command.

### Start open-oracle-reporter

Open second CLI and run the below command to start the open-oracle-reporter. The prices this command use it configured in `scripts/FakeOraclePrice.js`. You can modify this file to change the token prices that you want bot to post to the oracle contract.

`$ npm run start-price-reporter`

### Run bot

Open third CLI session and run the bot using the below command:

#### Set coinbase API keys as environment variables
You need to set the coinbase API keys to fetch the mainnet prices. You can configure these as environment variables.

`$ export COINBASE_SECRET="<coinbase_secret>"`
`$ export COINBASE_APIKEY="<coinbase_apikey>"`
`$ export COINBASE_PHRASE="<coinbase_phrase>"`

Command to start the bot:

`$ npx truffle exec test/bot/bot.js`

Ensure that after running the bot you must wait for the output `listening for blocks...` in the CLI then only start the bot-test (given below).

### Run bot test

Open fourth CLI session and run the below command to start the bot test:

`npx hardhat test test/bot/testBot.ts`