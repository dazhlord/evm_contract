import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("default signer:", deployer.address);
  console.log("default signer balance:", (await deployer.getBalance()).toString());

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
