import { useAppStore } from "../store/useAppStore";
import SUPPORTED_CHAINS from "../config/supported-chains.json";

type ChainMetadata = {
  chainID: number;
  description: string;
  programs: {
    chainlinkAdapter: string;
    digitalPayoffPool: string;
    tradePool: string;
  };
  defaultChainlinkOracle: string;
  defaultCollateral: string;
};

export function useSelectedChain(): ChainMetadata | undefined {
  const selectedChainID = useAppStore((s) => s.selectedChainID);
  return SUPPORTED_CHAINS.find((c) => c.chainID === selectedChainID);
}
