import hre, { ethers } from "hardhat";
import { bn, A_DAY_IN_SECONDS, CHAINLINK_AGGREGATORS } from "../test/utils";
import "@nomiclabs/hardhat-ethers";
import ethernal from "hardhat-ethernal";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
  const chainlinkAdapter = await ChainlinkAdapter.deploy();

  const DigitalPayoffPool = await ethers.getContractFactory("DigitalPayoffPool");
  const digitalPayoffPool = await DigitalPayoffPool.deploy();

  const TradePool = await ethers.getContractFactory("TradePool");
  const tradePool = await TradePool.deploy();

  await Promise.all([chainlinkAdapter.deployed(), digitalPayoffPool.deployed(), tradePool.deployed()]);

  console.log(`chainlinkAdapter deployed to ${chainlinkAdapter.address}`);
  console.log(`digitalPayoffPool deployed to ${digitalPayoffPool.address}`);
  console.log(`tradePool contract deployed to ${tradePool.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
