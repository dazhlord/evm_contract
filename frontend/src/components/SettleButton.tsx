import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import { TradePool__factory } from "../config/typechain-types";
import { bn } from "../utils/bigNumber";

type SettleButtonInputProps = {
  addr: string;
  id: number;
  txEnabled: boolean;
};

const SettleButton = ({ addr, id, txEnabled }: SettleButtonInputProps) => {
  const { config } = usePrepareContractWrite({
    address: addr as `0x${string}`,
    abi: TradePool__factory.abi,
    functionName: "settle",
    args: [bn(id)],
    enabled: txEnabled,
  });

  const { data, write } = useContractWrite(config);

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onSettleButtonClick = () => {
    console.log("settle button click");
    write?.();
  };

  if (isLoading) return <span>settle loading</span>;

  return (
    <div>
      {isSuccess && <span>settle hash {data?.hash}</span>}
      <button onClick={() => onSettleButtonClick()} disabled={!write}>
        settle
      </button>
    </div>
  );
};

export default SettleButton;
