import { BigNumber } from "ethers";
import { useParams } from "react-router-dom";
import { useContractRead } from "wagmi";
import Layout from "../../components/Layout";
import PROGRAM_ID from "../../config/addresses.json";
import { ChainlinkAdapter__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";

const ChainlinkAdapterEntry = ({ poolAddr, idx }: { poolAddr: `0x${string}`; idx: number }) => {
  const oracleRead = useContractRead({
    address: poolAddr,
    abi: ChainlinkAdapter__factory.abi,
    functionName: "oracles",
    args: [bn(idx)],
  });

  const lastPriceRead = useContractRead({
    address: poolAddr,
    abi: ChainlinkAdapter__factory.abi,
    functionName: "getLatestPrice",
    args: [bn(idx)],
  });

  return (
    <p>
      idx: {idx}
      <br />
      <ul>
        <li>
          {oracleRead.isError && "error"}
          {oracleRead.isLoading && "loading"}
          oracle: <b>{oracleRead.data}</b>
        </li>
        <li>
          lastPrice: <b>{lastPriceRead.data?.[0].toString()}</b>
        </li>
        <li>
          lastPrice updated at: <b>{lastPriceRead.data?.[1].toString()}</b>
        </li>
        <li>
          <button onClick={() => lastPriceRead.refetch()}>refetch last price</button>
        </li>
      </ul>
    </p>
  );
};

const ViewChainlinkOracle = () => {
  let { addr } = useParams();

  // const { data, isError, isLoading } = useContractRead({
  //   address: addr as `0x${string}`,
  //   abi: ChainlinkAdapter__factory.abi,
  //   functionName: "oracles",
  //   args: [bn(0)],
  // });

  return (
    <Layout>
      <>
        <p>chainlink pool adapter</p>
        <p>pool address: {addr}</p>

        {Array.from(Array(10).keys()).map((idx) => (
          <ChainlinkAdapterEntry key={idx} poolAddr={addr as `0x${string}`} idx={idx} />
        ))}
      </>
    </Layout>
  );
};

export default ViewChainlinkOracle;
