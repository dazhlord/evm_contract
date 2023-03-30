import { ethers, upgrades } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { BigNumber } from "ethers";

const FACTORY_NAME = "DigitalMarket";

const COLLATERAL_ADDRESS = "0xa16C18f2ED14338F9E5F572E7991220D470574c3";
const ORACLE_ADDRESS = "0x59C6f0C2AfA229964E5E24A85ca9c88D04AA6f2c";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`[${network.chainId}] default signer: ${deployer.address}`);
  const initialDeployerBalance = await deployer.getBalance();

  const Factory = await ethers.getContractFactory(FACTORY_NAME);
  const c = await upgrades.deployProxy(Factory, [COLLATERAL_ADDRESS, ORACLE_ADDRESS]);
  await c.deployed();

  console.log(
    `[${network.chainId}] ${FACTORY_NAME} contract deployed to ${c.address} on chain ${network.name} with tx ${c.deployTransaction.hash}`
  );
  const finalDeployerBalance = await deployer.getBalance();
  console.log(
    `[${network.chainId}] deploy cost: ${ethers.utils.formatUnits(finalDeployerBalance.sub(initialDeployerBalance))}`
  );

  console.log("add the following line to the readme.md");
  console.log(
    `| ${FACTORY_NAME} | ${network.chainId} | ${network.name} | ${c.address} | ${c.deployTransaction.hash} |`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
