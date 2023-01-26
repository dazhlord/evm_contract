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
  const erc20Mock = ERC20Mock.attach("0xbb3963512b9c0F28eFb4a3dcB1e0274A87d159E7");

  const amount = BigNumber.from(1000).mul(BigNumber.from(10).pow(18));
  const destWallets = ["0x02548256453D61E8Beb31013ebE8e5ddd412cBc6", "0xf588c72DA4114243B3E47A0E052F28cC44303a03"];
  for (const destWallet of destWallets) {
    console.log("amount: " + amount);
    console.log("mint addr: " + erc20Mock.address);
    console.log("beneficiary: " + destWallet);
    const r = await erc20Mock.mint(destWallet, amount);
    console.log("sig: ", r.hash);
    console.log();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
