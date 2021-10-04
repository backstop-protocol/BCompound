module.exports = async function fetchPrices(now) {
  // mainnet prices taken
  // ZRX price is actually = 1.605584, but increased 10% (0.1605584) = 1.605584 + 0.1605584 = 1.7661424
  return [now, { eth: 1617.45, zrx: 1.7661424, bat: 0.4, usdt: 1.0, wbtc: 39202.8 }];
};
