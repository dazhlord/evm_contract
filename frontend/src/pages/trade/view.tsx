import moment from "moment";
import { useParams } from "react-router-dom";
import { useContractRead } from "wagmi";
import DepositButton from "../../components/DepositButton";
import Layout from "../../components/Layout";
import { TradePool__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";

const ViewTrade = () => {
  let { addr, id } = useParams();

  const tradeRead = useContractRead({
    address: addr as `0x${string}`,
    abi: TradePool__factory.abi,
    functionName: "trades",
    args: [bn(Number(id))],
  });

  const settleDataRead = useContractRead({
    address: addr as `0x${string}`,
    abi: TradePool__factory.abi,
    functionName: "settleData",
    args: [bn(Number(id))],
  });

  return (
    <Layout>
      <>
        <p>trade pool</p>
        <p>pool address: {addr}</p>
        <p>trade id: {id}</p>
        {tradeRead.isLoading ? (
          "loading trade data"
        ) : (
          <ul>
            <li>collateral: {tradeRead.data?.[0]}</li>
            <li>payoff pool: {tradeRead.data?.[2]}</li>
            <li>
              depositEnd: {tradeRead.data?.[1].toNumber()}
              {" - "}
              {tradeRead.data && moment(tradeRead.data[1].toNumber()).toString()}
            </li>
            <li>
              settleStart: {tradeRead.data?.[3].toNumber()}
              {" - "}
              {tradeRead.data && moment(tradeRead.data[3].toNumber()).toString()}
            </li>
            <li>settleExecuted: {tradeRead.data?.[4] ? "true" : "false"}</li>
            <li>payoffID: {tradeRead.data?.[5].toNumber()}</li>
            <li>long required amount: {tradeRead.data?.[6].toNumber()}</li>
            <li>short required amount: {tradeRead.data?.[7].toNumber()}</li>
          </ul>
        )}

        <hr />

        {settleDataRead.isLoading ? (
          "loading settle data"
        ) : (
          <ul>
            <li>long user: {settleDataRead.data?.[0]}</li>
            <li>short user: {settleDataRead.data?.[1]}</li>
            <li>pnlLong: {settleDataRead.data?.[2].toNumber()}</li>
            <li>pnlShort: {settleDataRead.data?.[3].toNumber()}</li>
          </ul>
        )}
        <hr />

        {addr && id && (
          <DepositButton
            addr={addr}
            id={Number(id)}
            isLong={true}
            collateral={tradeRead.data![0]}
            amount={tradeRead.data![6]}
          />
        )}
        {addr && id && (
          <DepositButton
            addr={addr}
            id={Number(id)}
            isLong={false}
            collateral={tradeRead.data![0]}
            amount={tradeRead.data![1]}
          />
        )}
      </>
    </Layout>
  );
};

export default ViewTrade;
