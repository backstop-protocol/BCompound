export async function takeSnapshot(): Promise<string> {
  const util = require("util");
  const providerSendAsync = util.promisify(getTestProvider().send).bind(getTestProvider());
  const resp = await providerSendAsync({
    jsonrpc: "2.0",
    method: "evm_snapshot",
    params: [],
    id: new Date().getTime(),
  });

  return resp.result;
}

export async function revertToSnapShot(snapshotId: string) {
  const util = require("util");
  const providerSendAsync = util.promisify(getTestProvider().send).bind(getTestProvider());
  const resp = await providerSendAsync({
    jsonrpc: "2.0",
    method: "evm_revert",
    params: [snapshotId],
    id: new Date().getTime(),
  });
}

const Web3 = require("web3");

function getTestProvider() {
  return new Web3.providers.WebsocketProvider("ws://localhost:8545");
}
