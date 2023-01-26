import hre, { ethers } from "hardhat";
import { bn, A_DAY_IN_SECONDS, CHAINLINK_AGGREGATORS } from "../test/utils";
import "@nomiclabs/hardhat-ethers";
import ethernal from "hardhat-ethernal";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("default signer:", deployer.address);
  console.log("default signer balance:", (await deployer.getBalance()).toString());

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const erc20Mock = ERC20Mock.attach("0xbb3963512b9c0F28eFb4a3dcB1e0274A87d159E7");

  const amount = 1e6;
  const r = await erc20Mock.mint("0xf588c72DA4114243B3E47A0E052F28cC44303a03", amount);

  console.log(`minted ${amount} to ${erc20Mock.address}`);
  console.log("sig: ", r.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
