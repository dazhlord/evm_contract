import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import { TradePool__factory } from "../config/typechain-types";
import { bn } from "../utils/bigNumber";

type ClaimButtonInputProps = {
  addr: string;
  id: number;
  isLong: boolean;
  txEnabled: boolean;
};

const ClaimButton = ({ addr, id, txEnabled, isLong }: ClaimButtonInputProps) => {
  const { config } = usePrepareContractWrite({
    address: addr as `0x${string}`,
    abi: TradePool__factory.abi,
    functionName: "claim",
    args: [bn(id), isLong ? 0 : 1],
    enabled: txEnabled,
  });

  const { data, write } = useContractWrite(config);

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const onClaimButtonClick = () => {
    console.log("claim button click");
    write?.();
  };

  if (isLoading) return <span>claim loading</span>;

  return (
    <div>
      {isSuccess && <span>claim {data?.hash}</span>}
      <button onClick={() => onClaimButtonClick()} disabled={!write}>
        claim {isLong ? "buyer" : "seller"}
      </button>
    </div>
  );
};

export default ClaimButton;
