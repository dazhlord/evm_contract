import hre, { ethers } from "hardhat";
import { bn, A_DAY_IN_SECONDS, CHAINLINK_AGGREGATORS } from "../test/utils";
import "@nomiclabs/hardhat-ethers";
import ethernal from "hardhat-ethernal";

async function main() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const ChainlinkRate = await ethers.getContractFactory("ChainlinkRate");
  const DigitalPayoff = await ethers.getContractFactory("DigitalPayoff");
  const VyperOTC = await ethers.getContractFactory("VyperOTC");

  // deploy mock usdc
  const collateralMint = await ERC20Mock.deploy("Mock USDC", "USDC", owner.address, 1e6);
  console.log(`collateralMint deployed to ${collateralMint.address}`);
  await Promise.all([collateralMint.mint(addr1.address, 1e6), collateralMint.mint(addr2.address, 1e6)]);
  await hre.ethernal.push({
    name: "ERC20Mock",
    address: collateralMint.address,
  });

  // deploy chainlink rate
  const chainlinkRate = await ChainlinkRate.deploy(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);
  console.log(`chainlinkRate deployed to ${chainlinkRate.address}`);
  await hre.ethernal.push({
    name: "ChainlinkRate",
    address: chainlinkRate.address,
  });

  // deploy digital payoff
  const digitalPayoff = await DigitalPayoff.deploy(bn(1), false, chainlinkRate.address);
  console.log(`digitalPayoff deployed to ${digitalPayoff.address}`);
  await hre.ethernal.push({
    name: "DigitalPayoff",
    address: digitalPayoff.address,
  });

  const now = Math.floor(new Date().getTime() / 1000);
  const depositStart = now - A_DAY_IN_SECONDS;
  const depositEnd = now + 2 * A_DAY_IN_SECONDS;
  const settleStart = now + 15 * A_DAY_IN_SECONDS;

  const longRequiredAmount = 10;
  const shortRequiredAmount = 100;
  const vyperOTC = await VyperOTC.deploy(
    collateralMint.address,
    digitalPayoff.address,
    depositStart,
    depositEnd,
    settleStart,
    longRequiredAmount,
    shortRequiredAmount
  );
  await hre.ethernal.push({
    name: "VyperOTC",
    address: vyperOTC.address,
  });

  console.log(`vyperOTC contract deployed to ${vyperOTC.address}`);

  console.log("addr1 deposit as buyer");
  await collateralMint.connect(addr1).approve(vyperOTC.address, longRequiredAmount);
  await vyperOTC.connect(addr1).deposit(true);

  // addr2 deposit as seller
  console.log("addr2 deposit as seller");
  await collateralMint.connect(addr2).approve(vyperOTC.address, shortRequiredAmount);
  await vyperOTC.connect(addr2).deposit(false);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
