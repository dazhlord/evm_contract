import { useState } from "react";
import { useParams } from "react-router-dom";
import { useContractRead } from "wagmi";
import Layout from "../../components/Layout";
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
      </ul>
    </p>
  );
};

const ViewChainlinkOracle = () => {
  let { addr } = useParams();
  const [itemIdx, setItemIdx] = useState(0);

  return (
    <Layout>
      <>
        <p>chainlink pool adapter</p>
        <p>pool address: {addr}</p>
        idx: <input value={itemIdx} onChange={(e) => setItemIdx(Number(e.target.value))} />
        <hr />
        <ChainlinkAdapterEntry poolAddr={addr as `0x${string}`} idx={itemIdx} />
      </>
    </Layout>
  );
};

export default ViewChainlinkOracle;
