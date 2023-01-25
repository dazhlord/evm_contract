import { useEffect, useState } from "react";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import Layout from "../../components/Layout";
import PROGRAM_ID from "../../config/addresses.json";
import { DigitalPayoffPool__factory, TradePool__factory } from "../../config/typechain-types";
import { useDebounce } from "use-debounce";
import { bn } from "../../utils/bigNumber";
import moment from "moment";

const CreateTrade = () => {
  const [collateral, setCollateral] = useState(`0x07865c6E87B9F70255377e024ace6630C1Eaa37F`);
  const [payoffPool, setPayoffPool] = useState(`0x${PROGRAM_ID.digitalPayoffPool}`);
  const [payoffIdx, setPayoffIdx] = useState(0);
  const [depositEnd, setDepositEnd] = useState(0);
  const [settleStart, setSettleStart] = useState(0);
  const [longRequiredAmount, setLongRequiredAmount] = useState(1000);
  const [shortRequiredAmount, setShortRequiredAmount] = useState(10);

  useEffect(() => {
    setDepositEnd(moment().add(10, "minutes").toDate().getTime());
    setSettleStart(moment().add(15, "minutes").toDate().getTime());
  }, []);

  const { config } = usePrepareContractWrite({
    address: `0x${PROGRAM_ID.tradePool}`,
    abi: TradePool__factory.abi,
    functionName: "createTrade",
    args: [
      collateral as `0x${string}`,
      payoffPool as `0x${string}`,
      bn(payoffIdx),
      bn(depositEnd),
      bn(settleStart),
      bn(longRequiredAmount),
      bn(shortRequiredAmount),
    ],
  });

  const { data, write } = useContractWrite(config);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onCreateButtonClick = () => {
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
      </div>

      <div>
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
          <label htmlFor={cc.id}>{cc.id}</label>
          <input id={cc.id} type="number" value={cc.v} onChange={(e) => cc.c(Number(e.target.value))} />
          {cc.isMoment && <span>{moment(cc.v).toString()}</span>}
        </div>
      ))}

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

export default CreateTrade;
