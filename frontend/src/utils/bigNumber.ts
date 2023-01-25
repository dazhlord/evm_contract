import { BigNumber } from "ethers";

export function bn(v: number): BigNumber {
  return BigNumber.from(v);
}
