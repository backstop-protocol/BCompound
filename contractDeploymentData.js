//const Liquidator = artifacts.require("FakePriceOracle.sol")
const Liquidator = artifacts.require("Backstop.sol")

const byteCode = Liquidator._json.bytecode
const abi = Liquidator._json.abi
const contract = new web3.eth.Contract(abi)
const txInput = contract.deploy({
          data : byteCode,
          arguments : [
              "0x1f5d7f3caac149fe41b8bd62a3673fe6ec0ab73b", // comp
              "0x3f630bd0e2a56af31ca152d1ac59436ee8fbe169" // fake price

                        ]
                      }).encodeABI()
console.log(txInput)

console.log(JSON.stringify(abi))
