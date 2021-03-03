require("ts-node/register");

module.exports = {
  plugins: ["solidity-coverage"],

  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 1250000000000,
      gasPrice: 1,
      network_id: "*",
      disableConfirmationListener: true,
    },
    coverage: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 1, // <-- Use this low gas price
      disableConfirmationListener: true,
    },
  },

  compilers: {
    solc: {
      version: "0.5.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200, // Optimize for how many times you intend to run the code
        },
      },
    },
  },
};
