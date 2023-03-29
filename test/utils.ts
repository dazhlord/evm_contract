import { BigNumber } from "ethers";

// https://docs.chain.link/data-feeds/price-feeds/addresses#Goerli%20Testnet
export const CHAINLINK_AGGREGATORS = {
  BSC_MAINNET_AGGREGATOR_ETH_USD: "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
};

export const A_DAY_IN_SECONDS = 86400;

export function bn(v: number): BigNumber {
  return BigNumber.from(v);
}
