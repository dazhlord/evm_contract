import { useEffect, useState } from "react";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import Layout from "../../components/Layout";
import { ChainlinkAdapter__factory } from "../../config/typechain-types";
import { useSelectedChain } from "../../hooks/useSelectedChain";

const CreateChainlinkOracle = () => {
  const chainMetadata = useSelectedChain();
  const [chainlinkOracle, setChainlinkOracle] = useState<string>("");
  useEffect(() => {
    if (chainMetadata) setChainlinkOracle(chainMetadata.defaultChainlinkOracle);
  }, [chainMetadata]);

  const chainlinkAdapterAddress = chainMetadata?.programs.chainlinkAdapter;

  const { config } = usePrepareContractWrite({
    address: `0x${chainlinkAdapterAddress}`,
    chainId: chainMetadata?.chainID,
    abi: ChainlinkAdapter__factory.abi,
    functionName: "insertOracle",
    args: [`0x${chainlinkOracle}`],
  });

  const { data, write } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onCreateButtonClick = () => {
    write?.();
  };

  return (
    <Layout pageTitle="create chainlink oracle">
      <input type="text" value={chainlinkOracle} onChange={(e) => setChainlinkOracle(e.target.value)} />
      <button
        onClick={(e) => {
          e.preventDefault();
          onCreateButtonClick();
        }}
        disabled={!write}
      >
        {isLoading ? "loading" : "Create"}
      </button>

      {isSuccess && (
        <div>
          Successfully submitted tx!
          {data?.hash}
        </div>
      )}
      <br />
      <br />
      <a href="https://docs.chain.link/data-feeds/price-feeds/addresses">chainlink list</a>
    </Layout>
  );
};

export default CreateChainlinkOracle;
