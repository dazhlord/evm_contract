import { BigNumber } from "ethers";

// https://docs.chain.link/data-feeds/price-feeds/addresses#Goerli%20Testnet
export const CHAINLINK_AGGREGATORS = {
  GOERLI_AGGREGATOR_ETH_USD: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
};

export const A_DAY_IN_SECONDS = 86400;

export function bn(v: number): BigNumber {
  return BigNumber.from(v);
}
