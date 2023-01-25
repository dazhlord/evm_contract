import { BigNumber } from "ethers";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useContractRead } from "wagmi";
import Layout from "../../components/Layout";
import PROGRAM_ID from "../../config/addresses.json";
import { ChainlinkAdapter__factory, DigitalPayoffPool__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";

const DigitalPayoffEntry = ({ poolAddr, idx }: { poolAddr: `0x${string}`; idx: number }) => {
  const [simu1, setSimu1] = useState(1000);
  const [simu2, setSimu2] = useState(10);

  const oracleRead = useContractRead({
    address: poolAddr,
    abi: DigitalPayoffPool__factory.abi,
    functionName: "digitalData",
    args: [bn(idx)],
  });

  const execute = useContractRead({
    address: poolAddr,
    abi: DigitalPayoffPool__factory.abi,
    functionName: "execute",
    args: [bn(idx), bn(simu1), bn(simu2)],
  });

  return (
    <div>
      <ul>
        <li> idx: {idx}</li>
        <li>
          oracle adapter: <b>{oracleRead.data?.[0]}</b> - idx: <b>{oracleRead.data?.[3].toNumber()}</b>
        </li>
        <li>
          is call: <b>{oracleRead.data?.[1] ? "true" : "false"}</b>
        </li>
        <li>
          strike: <b>{oracleRead.data?.[2].toNumber()}</b>
        </li>
      </ul>
      <div>
        <>
          Simulate: <br />
          v1: <input type="number" value={simu1} onChange={(e) => setSimu1(Number(e.target.value))} />
          v2: <input type="number" value={simu2} onChange={(e) => setSimu2(Number(e.target.value))} />
          {/* <button onClick={() => execute.refetch()}>simulate</button> */}
          <ul>
            <li>
              <b>pnlLong</b>: {execute.data?.[0].toNumber()}
            </li>
            <li>
              <b>pnlShort</b>: {execute.data?.[1].toNumber()}
            </li>
          </ul>
        </>
      </div>
      <hr />
    </div>
  );
};

const ViewDigitalPayoff = () => {
  let { addr } = useParams();
  const [itemIdx, setItemIdx] = useState(0);

  return (
    <Layout>
      <>
        <p>digital payoff pool</p>
        <p>pool address: {addr}</p>
        idx: <input value={itemIdx} onChange={(e) => setItemIdx(Number(e.target.value))} />
        <hr />
        <DigitalPayoffEntry poolAddr={addr as `0x${string}`} idx={itemIdx} />
      </>
    </Layout>
  );
};

export default ViewDigitalPayoff;
