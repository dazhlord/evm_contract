import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("default signer:", deployer.address);
  console.log("default signer balance:", (await deployer.getBalance()).toString());

  const factoryName = "DigitalPayoffPool";
  const Factory = await ethers.getContractFactory(factoryName);
  const c = await Factory.deploy();

  await c.deployed();
  console.log(`${factoryName} contract deployed to ${c.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
