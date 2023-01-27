import { isAddress } from "ethers/lib/utils.js";
import moment from "moment";
import { useParams } from "react-router-dom";
import { useAccount, useContractRead } from "wagmi";
import ClaimButton from "../../components/ClaimButton";
import DepositButton from "../../components/DepositButton";
import Layout from "../../components/Layout";
import SettleButton from "../../components/SettleButton";
import { TradePool__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";

const ViewTrade = () => {
  let { addr, id } = useParams();
  const { address } = useAccount();

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
            <li>collateral: {tradeRead.data?.collateral}</li>
            <li>payoff pool: {tradeRead.data?.payoffPool}</li>
            <li>
              depositEnd: {tradeRead.data?.depositEnd.toNumber()}
              {" - "}
              {tradeRead.data && moment(tradeRead.data?.depositEnd.toNumber() * 1000).toString()}
            </li>
            <li>
              settleStart: {tradeRead.data?.settleStart.toNumber()}
              {" - "}
              {tradeRead.data && moment(tradeRead.data?.settleStart.toNumber() * 1000).toString()}
            </li>
            <li>settleExecuted: {tradeRead.data?.settleExecuted ? "true" : "false"}</li>
            <li>payoffID: {tradeRead.data?.payoffID.toNumber()}</li>
            <li>long required amount: {tradeRead.data?.longRequiredAmount.div(bn(10).pow(18)).toString()}</li>
            <li>short required amount: {tradeRead.data?.shortRequiredAmount.div(bn(10).pow(18)).toString()}</li>
          </ul>
        )}

        <hr />

        {settleDataRead.isLoading ? (
          "loading settle data"
        ) : (
          <ul>
            <li>long user: {settleDataRead.data?.longUser}</li>
            <li>short user: {settleDataRead.data?.shortUser}</li>
            <li>pnlLong: {settleDataRead.data?.longPnl.toString()}</li>
            <li>pnlShort: {settleDataRead.data?.shortPnl.toString()}</li>
          </ul>
        )}
        <hr />

        {tradeRead.data && addr && id && (
          <DepositButton
            addr={addr}
            id={Number(id)}
            isLong={true}
            collateral={tradeRead.data![0]}
            amount={tradeRead.data![6]}
            txEnabled={!!(settleDataRead.data && !isAddress(settleDataRead.data!.longUser.toString()))}
          />
        )}
        {tradeRead.data && addr && id && (
          <DepositButton
            addr={addr}
            id={Number(id)}
            isLong={false}
            collateral={tradeRead.data![0]}
            amount={tradeRead.data![7]}
            txEnabled={!!(settleDataRead.data && !isAddress(settleDataRead.data!.shortUser.toString()))}
          />
        )}

        {tradeRead.data && addr && id && (
          <SettleButton
            addr={addr}
            id={Number(id)}
            txEnabled={!tradeRead.data!.settleExecuted && Date.now() / 1000 > tradeRead.data!.settleStart.toNumber()}
          />
        )}

        {tradeRead.data && settleDataRead.data && addr && id && (
          <ClaimButton
            addr={addr}
            id={Number(id)}
            isLong={true}
            txEnabled={settleDataRead.data!.longUser === address}
          />
        )}

        {tradeRead.data && settleDataRead.data && addr && id && (
          <ClaimButton
            addr={addr}
            id={Number(id)}
            isLong={false}
            txEnabled={settleDataRead.data!.shortUser === address}
          />
        )}
      </>
    </Layout>
  );
};

export default ViewTrade;
