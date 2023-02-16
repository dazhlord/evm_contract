import hre, { ethers } from "hardhat";
import { bn, A_DAY_IN_SECONDS, CHAINLINK_AGGREGATORS } from "../test/utils";
import "@nomiclabs/hardhat-ethers";
import ethernal from "hardhat-ethernal";
import { BigNumber } from "ethers";

async function main() {
  const newWallet = ethers.Wallet.createRandom();
  console.log("new wallet created!");
  console.log("pvtkey: ", newWallet.privateKey);
  console.log("address: ", newWallet.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
