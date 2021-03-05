## Play Ground for BCompound

To play with the BCompound setup in local environment. Play Ground uses Ganache snapshots to load the state in Ganache.

## Snapshots

There are two snapshots present in the snapshot folder.
- `snapshot/bcompound.zip` : Used for playground
- `snapshot/coverage.zip` : Used for executing code coverage

## Commands

To load the `bcompound` snapshot with Ganache, run the following commands:

`$ FILE=bcompound npm run load-snapshot`

Above command will loan start an instance of Ganache and loads `snapshot/bcompound.zip` snapshot into it. You don't need to start Ganache explicitly.

Run the PlayGroup test: After loading the snapshot in Ganache. Run the below command from another CLI window:

`$ npx hardhat test test/playground/PlayGround.ts`

The above command will load the already deployed Compound and BProtocol contracts present in the snapshot and execute the tests present in `test/playground/PlayGround.ts` file.
You can write the new tests in this file and run above command to execute these tests.