import { useState } from "react";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import Layout from "../../components/Layout";
import PROGRAM_ID from "../../config/addresses.json";
import { ChainlinkAdapter__factory } from "../../config/typechain-types";
import { useDebounce } from "use-debounce";

const CreateChainlinkOracle = () => {
  const [chainlinkOracle, setChainlinkOracle] = useState("D4a33860578De61DBAbDc8BFdb98FD742fA7028e");
  const debouncedChainlinkOracle = useDebounce(chainlinkOracle, 500);

  const { config } = usePrepareContractWrite({
    address: `0x${PROGRAM_ID.chainlinkAdapter}`,
    abi: ChainlinkAdapter__factory.abi,
    functionName: "insertOracle",
    args: [`0x${debouncedChainlinkOracle}`],
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
      >
        {isLoading ? "loading" : "Create"}
      </button>

      {isSuccess && (
        <div>
          Successfully submitted tx!
          {data?.hash}
        </div>
      )}
    </Layout>
  );
};

export default CreateChainlinkOracle;
