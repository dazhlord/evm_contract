import { useEffect, useState } from "react";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import Layout from "../../components/Layout";
import { TradePool__factory } from "../../config/typechain-types";
import { bn } from "../../utils/bigNumber";
import moment from "moment";
import { useSelectedChain } from "../../hooks/useSelectedChain";

const CreateTrade = () => {
  const chainMetadata = useSelectedChain();

  const [collateral, setCollateral] = useState("");
  const [payoffPool, setPayoffPool] = useState("");
  useEffect(() => {
    if (chainMetadata) setPayoffPool(`0x${chainMetadata?.programs.digitalPayoffPool}`);
    if (chainMetadata) setCollateral(`0x${chainMetadata?.defaultCollateral}`);
  }, [chainMetadata]);

  const [payoffIdx, setPayoffIdx] = useState(0);
  const [depositEnd, setDepositEnd] = useState(0);
  const [settleStart, setSettleStart] = useState(0);
  const [longRequiredAmount, setLongRequiredAmount] = useState(1000);
  const [shortRequiredAmount, setShortRequiredAmount] = useState(10);

  useEffect(() => {
    setDepositEnd(Math.round(moment().add(12, "minutes").toDate().getTime() / 1000));
    setSettleStart(Math.round(moment().add(15, "minutes").toDate().getTime() / 1000));
  }, []);

  const { config } = usePrepareContractWrite({
    address: `0x${chainMetadata?.programs.tradePool}`,
    abi: TradePool__factory.abi,
    functionName: "createTrade",
    args: [
      collateral as `0x${string}`,
      payoffPool as `0x${string}`,
      bn(payoffIdx),
      bn(depositEnd),
      bn(settleStart),
      bn(longRequiredAmount).mul(bn(10).pow(18)),
      bn(shortRequiredAmount).mul(bn(10).pow(18)),
    ],
  });

  const { data, write } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onCreateButtonClick = async () => {
    write?.();
  };

  return (
    <Layout pageTitle="create trade">
      <div>
        <label htmlFor="collateral">collateral</label>
        <input id="collateral" type="text" value={collateral} onChange={(e) => setCollateral(e.target.value)} />
      </div>

      <div>
        <label htmlFor="payoffPool">payoffPool</label>
        <input id="payoffPool" type="text" value={payoffPool} onChange={(e) => setPayoffPool(e.target.value)} />
        <label htmlFor="payoffIdx">payoffIdx</label>
        <input id="payoffIdx" type="number" value={payoffIdx} onChange={(e) => setPayoffIdx(Number(e.target.value))} />
      </div>

      {[
        { id: "depositEnd", v: depositEnd, c: setDepositEnd, isMoment: true },
        { id: "settleStart", v: settleStart, c: setSettleStart, isMoment: true },
        { id: "longRequiredAmount", v: longRequiredAmount, c: setLongRequiredAmount },
        { id: "shortRequiredAmount", v: shortRequiredAmount, c: setShortRequiredAmount },
      ].map((cc) => (
        <div key={cc.id}>
          <label htmlFor={cc.id}>{cc.id}: </label>
          <input id={cc.id} type="number" value={cc.v} onChange={(e) => cc.c(Number(e.target.value))} />
          {cc.isMoment && <span> - {moment(cc.v * 1000).toString()}</span>}
        </div>
      ))}

      <button
        onClick={(e) => {
          e.preventDefault();
          onCreateButtonClick();
        }}
        disabled={!write || isLoading}
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

export default CreateTrade;
