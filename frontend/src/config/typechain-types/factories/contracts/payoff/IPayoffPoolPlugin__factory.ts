/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IPayoffPoolPlugin,
  IPayoffPoolPluginInterface,
} from "../../../contracts/payoff/IPayoffPoolPlugin";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "payoffID",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "a",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "b",
        type: "uint256",
      },
    ],
    name: "execute",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class IPayoffPoolPlugin__factory {
  static readonly abi = _abi;
  static createInterface(): IPayoffPoolPluginInterface {
    return new utils.Interface(_abi) as IPayoffPoolPluginInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IPayoffPoolPlugin {
    return new Contract(address, _abi, signerOrProvider) as IPayoffPoolPlugin;
  }
}