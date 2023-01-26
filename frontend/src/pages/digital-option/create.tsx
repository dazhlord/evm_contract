import { useEffect, useState } from "react";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import Layout from "../../components/Layout";
import { DigitalPayoffPool__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";
import { useSelectedChain } from "../../hooks/useSelectedChain";

const CreateChainlinkOracle = () => {
  const chainMetadata = useSelectedChain();

  const [strike, setStrike] = useState(110);
  const [isCall, setIsCall] = useState(true);
  const [oraclePool, setOraclePool] = useState("");
  useEffect(() => {
    if (chainMetadata) setOraclePool(`0x${chainMetadata?.programs.chainlinkAdapter}`);
  }, [chainMetadata]);

  const [oracleIdx, setOracleIdx] = useState(0);

  const { config } = usePrepareContractWrite({
    address: `0x${chainMetadata?.programs.digitalPayoffPool}`,
    abi: DigitalPayoffPool__factory.abi,
    functionName: "createDigitalPayoff",
    args: [bn(strike), isCall, oraclePool as `0x${string}`, bn(oracleIdx)],
  });

  const { data, write } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onCreateButtonClick = () => {
    write?.();
  };

  return (
    <Layout pageTitle="create digital option">
      <div>
        <label htmlFor="strike">strike</label>
        <input id="strike" type="number" value={strike} onChange={(e) => setStrike(Number(e.target.value))} />
      </div>

      <div>
        <label htmlFor="isCall">isCall</label>
        <input id="isCall" type="checkbox" checked={isCall} onChange={() => setIsCall(!isCall)} />
      </div>

      <div>
        <label htmlFor="oraclePool">oraclePool</label>
        <input id="oraclePool" type="text" value={oraclePool} onChange={(e) => setOraclePool(e.target.value)} />
      </div>

      <div>
        <label htmlFor="oracleIdx">oracleIdx</label>
        <input id="oracleIdx" type="number" value={oracleIdx} onChange={(e) => setOracleIdx(Number(e.target.value))} />
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          onCreateButtonClick();
        }}
        disabled={isLoading}
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
