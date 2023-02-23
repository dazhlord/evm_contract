import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

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
