import { BigNumber } from "ethers";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from "wagmi";
import { IERC20__factory, TradePool__factory } from "../config/typechain-types";
import { bn } from "../utils/bigNumber";

type DepositButtonInputProps = {
  addr: string;
  id: number;
  collateral: string;
  isLong: boolean;
  amount: BigNumber;
};

const DepositButton = ({ addr, id, isLong, collateral, amount }: DepositButtonInputProps) => {
  const { config: approveConfig, error: approveConfigError } = usePrepareContractWrite({
    address: collateral as `0x${string}`,
    abi: IERC20__factory.abi,
    functionName: "approve",
    args: [addr as `0x${string}`, amount],
  });

  const { config: depositConfig, error: depositConfigError } = usePrepareContractWrite({
    address: addr as `0x${string}`,
    abi: TradePool__factory.abi,
    functionName: "deposit",
    args: [bn(id), isLong ? 0 : 1],
  });

  const { data: dataApprove, write: writeApprove } = useContractWrite(approveConfig);
  const { data: dataDeposit, write: writeDeposit } = useContractWrite(depositConfig);

  const { isLoading: isLoadingApprove, isSuccess: isSuccesApprove } = useWaitForTransaction({
    hash: dataApprove?.hash,
  });

  const { isLoading: isLoadingDeposit, isSuccess: isSuccesDeposit } = useWaitForTransaction({
    hash: dataDeposit?.hash,
  });

  const onApproveButtonClick = () => {
    console.log("approve button click");
    console.log("approveConfigError: ", approveConfigError);
    writeApprove?.();
  };

  const onDepositButtonClick = () => {
    console.log("depositConfigError: ", depositConfigError);
    writeDeposit?.();
  };

  if (isSuccesApprove) return <span>approve {dataApprove?.hash}</span>;
  if (isSuccesDeposit) return <span>deposit {dataDeposit?.hash}</span>;

  if (isLoadingApprove) return <span>approve loading</span>;
  if (isLoadingDeposit) return <span>deposit loading</span>;

  return (
    <div>
      <button onClick={() => onApproveButtonClick()} disabled={!!approveConfigError}>
        approve
      </button>
      <button onClick={() => onDepositButtonClick()} disabled={!!depositConfigError}>
        {isLong ? "buy" : "sell"}
      </button>
    </div>
  );
};

export default DepositButton;
