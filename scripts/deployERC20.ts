import hre, { ethers } from "hardhat";
import { bn, A_DAY_IN_SECONDS, CHAINLINK_AGGREGATORS } from "../test/utils";
import "@nomiclabs/hardhat-ethers";
import ethernal from "hardhat-ethernal";
import { BigNumber } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("default signer:", deployer.address);
  console.log("default signer balance:", (await deployer.getBalance()).toString());

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const erc20Mock = await ERC20Mock.deploy(
    "Vyper USD",
    "vypUSD",
    deployer.address,
    BigNumber.from(10000).mul(BigNumber.from(10).pow(18))
  );

  console.log(`erc20Mock deployed to ${erc20Mock.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
