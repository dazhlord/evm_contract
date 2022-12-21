import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS, A_DAY_IN_SECONDS } from "./utils";

const BUYER_SIDE = 0;
const SELLER_SIDE = 1;

describe("VyperOTC", function () {
  async function deployVyperSuite() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const ChainlinkRate = await ethers.getContractFactory("ChainlinkRate");
    const DigitalPayoff = await ethers.getContractFactory("DigitalPayoff");
    const VyperOTC = await ethers.getContractFactory("VyperOTC");

    // mock USDC
    const collateralMint = await ERC20Mock.deploy("Mock USDC", "USDC", owner.address, 1e6);
    // mint usdc to addr1 and addr2
    await Promise.all([addr1, addr2].map((addr) => collateralMint.mint(addr.address, 1e6)));

    // chainilink rate with goerli eth/usd
    const chainlinkRate = await ChainlinkRate.deploy(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);

    return { collateralMint, DigitalPayoff, VyperOTC, chainlinkRate };
  }

  it("standard flow", async function () {
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, DigitalPayoff, VyperOTC, chainlinkRate } = await loadFixture(deployVyperSuite);

    // const dumpBalance = async (address: string) =>
    //   console.log(`${address} collateral balance: ${await collateralMint.balanceOf(address)}`);
    // const dumpBalances = (title: string) => {
    //   console.log(title);
    //   dumpBalance(addr1.address);
    //   dumpBalance(addr2.address);
    //   dumpBalance(contractOTC.address);
    // };

    // digital payoff
    const digitalPayoff = await DigitalPayoff.deploy(bn(1), true, chainlinkRate.address);

    const now = Math.floor(new Date().getTime() / 1000);
    const depositStart = now - A_DAY_IN_SECONDS;
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const longRequiredAmount = 10;
    const shortRequiredAmount = 100;
    const contractOTC = await VyperOTC.deploy(
      collateralMint.address,
      digitalPayoff.address,
      depositStart,
      depositEnd,
      settleStart,
      longRequiredAmount,
      shortRequiredAmount
    );

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(contractOTC.address, longRequiredAmount);
    await contractOTC.connect(addr1).deposit(BUYER_SIDE);
    expect(await collateralMint.balanceOf(contractOTC.address)).to.be.eq(longRequiredAmount);
    expect(await contractOTC.balanceOf(addr1.address, 0)).to.be.eq(1);
    expect(await contractOTC.totalSupply(BUYER_SIDE)).to.be.eq(1);
    expect(await contractOTC.totalSupply(SELLER_SIDE)).to.be.eq(0);

    // addr2 deposit as seller
    await collateralMint.connect(addr2).approve(contractOTC.address, shortRequiredAmount);
    await contractOTC.connect(addr2).deposit(SELLER_SIDE);
    expect(await collateralMint.balanceOf(contractOTC.address)).to.be.eq(longRequiredAmount + shortRequiredAmount);
    expect(await contractOTC.balanceOf(addr1.address, BUYER_SIDE)).to.be.eq(1);
    expect(await contractOTC.balanceOf(addr2.address, SELLER_SIDE)).to.be.eq(1);
    expect(await contractOTC.totalSupply(BUYER_SIDE)).to.be.eq(1);
    expect(await contractOTC.totalSupply(SELLER_SIDE)).to.be.eq(1);

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // owner settle the contract
    await contractOTC.settle();

    // addr1 claim assets
    await contractOTC.connect(addr1).claim();
    expect(await contractOTC.balanceOf(addr1.address, BUYER_SIDE)).to.be.eq(0);
    expect(await contractOTC.balanceOf(addr2.address, SELLER_SIDE)).to.be.eq(1);
    expect(await contractOTC.totalSupply(BUYER_SIDE)).to.be.eq(0);
    expect(await contractOTC.totalSupply(SELLER_SIDE)).to.be.eq(1);

    // addr2 claim assets
    await contractOTC.connect(addr2).claim();
    expect(await collateralMint.balanceOf(contractOTC.address)).to.be.eq(0);
    expect(await contractOTC.balanceOf(addr1.address, BUYER_SIDE)).to.be.eq(0);
    expect(await contractOTC.balanceOf(addr2.address, SELLER_SIDE)).to.be.eq(0);
    expect(await contractOTC.totalSupply(BUYER_SIDE)).to.be.eq(0);
    expect(await contractOTC.totalSupply(SELLER_SIDE)).to.be.eq(0);
  });

  it("can't fund when deposit is closed", async function () {
    const [, addr1] = await ethers.getSigners();

    const { collateralMint, DigitalPayoff, VyperOTC, chainlinkRate } = await loadFixture(deployVyperSuite);

    // digital payoff
    const digitalPayoff = await DigitalPayoff.deploy(bn(1), false, chainlinkRate.address);

    const now = Math.floor(new Date().getTime() / 1000);
    const depositStart = now - A_DAY_IN_SECONDS;
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const longRequiredAmount = 10;
    const shortRequiredAmount = 100;
    const contractOTC = await VyperOTC.deploy(
      collateralMint.address,
      digitalPayoff.address,
      depositStart,
      depositEnd,
      settleStart,
      longRequiredAmount,
      shortRequiredAmount
    );

    // time traveling
    await time.increaseTo(depositEnd + A_DAY_IN_SECONDS);

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(contractOTC.address, longRequiredAmount);
    const deposit = contractOTC.connect(addr1).deposit(0);
    await expect(deposit).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'deposit is closed'"
    );
  });

  it("can't take same side 2 times", async function () {
    const [, addr1, addr2] = await ethers.getSigners();

    const { collateralMint, DigitalPayoff, VyperOTC, chainlinkRate } = await loadFixture(deployVyperSuite);

    // digital payoff
    const digitalPayoff = await DigitalPayoff.deploy(bn(1), false, chainlinkRate.address);

    const now = Math.floor(new Date().getTime() / 1000);
    const depositStart = now - A_DAY_IN_SECONDS;
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const longRequiredAmount = 10;
    const shortRequiredAmount = 100;
    const contractOTC = await VyperOTC.deploy(
      collateralMint.address,
      digitalPayoff.address,
      depositStart,
      depositEnd,
      settleStart,
      longRequiredAmount,
      shortRequiredAmount
    );

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(contractOTC.address, longRequiredAmount);
    await contractOTC.connect(addr1).deposit(BUYER_SIDE);

    // addr2 deposit as seller
    await collateralMint.connect(addr2).approve(contractOTC.address, shortRequiredAmount);
    await expect(contractOTC.connect(addr2).deposit(BUYER_SIDE)).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'side already taken'"
    );
  });

  it("can't settle if not both sides are taken", async function () {
    const [, addr1] = await ethers.getSigners();

    const { collateralMint, DigitalPayoff, VyperOTC, chainlinkRate } = await loadFixture(deployVyperSuite);

    // digital payoff
    const digitalPayoff = await DigitalPayoff.deploy(bn(1), false, chainlinkRate.address);

    const now = Math.floor(new Date().getTime() / 1000);
    const depositStart = now - A_DAY_IN_SECONDS;
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const longRequiredAmount = 10;
    const shortRequiredAmount = 100;
    const contractOTC = await VyperOTC.deploy(
      collateralMint.address,
      digitalPayoff.address,
      depositStart,
      depositEnd,
      settleStart,
      longRequiredAmount,
      shortRequiredAmount
    );

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(contractOTC.address, longRequiredAmount);
    await contractOTC.connect(addr1).deposit(0);

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // owner settle the contract
    const settle = contractOTC.settle();
    await expect(settle).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'at least one side is not taken'"
    );
  });
});
