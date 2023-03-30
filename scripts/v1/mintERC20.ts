import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { BigNumber } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("default signer:", deployer.address);
  console.log("default signer balance:", (await deployer.getBalance()).toString());

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const erc20Mock = ERC20Mock.attach("0x3964f8BC37C99E7089ba11044b3489CB5777607c");

  const amount = BigNumber.from(10000).mul(BigNumber.from(10).pow(18));
  const destWallets = ["0x81a2AEb03fe1D9d48E0dEdA3F6Ea109d73b6d4FB", "0xF89BEf4Bd45aacd1e53CC1015e1A83b14a2b7Ee5"];
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
