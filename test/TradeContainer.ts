import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS, A_DAY_IN_SECONDS } from "./utils";

const TRADES_COUNT = 50;
const LONG_REQUIRED_AMOUNT = 10;
const SHORT_REQUIRED_AMOUNT = 100;

const BUYER_SIDE = 0;
const SELLER_SIDE = 1;

describe.only("TradeContainer", function () {
  async function deployVyperSuite() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const collateralMint = await ERC20Mock.deploy("Mock USDC", "USDC", owner.address, 1e6);
    // mint usdc to addr1 and addr2
    await Promise.all([
      collateralMint.mint(addr1.address, TRADES_COUNT * LONG_REQUIRED_AMOUNT),
      collateralMint.mint(addr2.address, TRADES_COUNT * SHORT_REQUIRED_AMOUNT),
    ]);

    // chainilink rate with goerli eth/usd
    const ChainlinkRate = await ethers.getContractFactory("ChainlinkRate");
    const chainlinkRate = await ChainlinkRate.deploy(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);

    const DigitalPayoff = await ethers.getContractFactory("DigitalPayoff");

    const TradeContainer = await ethers.getContractFactory("TradeContainer");
    const tradeContainer = await TradeContainer.deploy();

    return { collateralMint, DigitalPayoff, tradeContainer, chainlinkRate };
  }

  it("standard flow", async function () {
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, DigitalPayoff, tradeContainer, chainlinkRate } = await loadFixture(deployVyperSuite);

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

    const createTradeSig = await tradeContainer.createTrade(
      collateralMint.address,
      digitalPayoff.address,
      depositStart,
      depositEnd,
      settleStart,
      LONG_REQUIRED_AMOUNT,
      SHORT_REQUIRED_AMOUNT
    );
    const receipt = await createTradeSig.wait(1);
    const returnEvent = receipt.events.pop();
    const tradeID = returnEvent.args[0];

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(tradeContainer.address, LONG_REQUIRED_AMOUNT);
    await expect(tradeContainer.connect(addr1).deposit(tradeID, BUYER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradeContainer.address, addr1.address],
      [LONG_REQUIRED_AMOUNT, -LONG_REQUIRED_AMOUNT]
    );

    // addr2 deposit as seller
    await collateralMint.connect(addr2).approve(tradeContainer.address, SHORT_REQUIRED_AMOUNT);
    await expect(tradeContainer.connect(addr2).deposit(tradeID, SELLER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradeContainer.address, addr2.address],
      [SHORT_REQUIRED_AMOUNT, -SHORT_REQUIRED_AMOUNT]
    );

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // owner settle the contract
    await tradeContainer.settle(tradeID);

    // addr1 claim assets
    await tradeContainer.connect(addr1).claim(tradeID, BUYER_SIDE);
    // expect(await tradeID.users(SELLER_SIDE)).to.be.eq(addr2.address);

    // addr2 claim assets
    await tradeContainer.connect(addr2).claim(tradeID, SELLER_SIDE);
    expect(await collateralMint.balanceOf(tradeContainer.address)).to.be.eq(0);
  });

  // it("fill memory", async function () {
  //   const [, addr1, addr2] = await ethers.getSigners();
  //   const { collateralMint, DigitalPayoff, tradeContainer, chainlinkRate } = await loadFixture(deployVyperSuite);

  //   // digital payoff
  //   const digitalPayoff = await DigitalPayoff.deploy(bn(1), true, chainlinkRate.address);

  //   const now = Math.floor(new Date().getTime() / 1000);
  //   const depositStart = now - A_DAY_IN_SECONDS;
  //   const depositEnd = now + 2 * A_DAY_IN_SECONDS;
  //   const settleStart = now + 15 * A_DAY_IN_SECONDS;

  //   for (let idx = 0; idx < TRADES_COUNT; idx++) {
  //     console.log("crate and fund trade: ", idx);
  //     const createTradeSig = await tradeContainer.createTrade(
  //       collateralMint.address,
  //       digitalPayoff.address,
  //       depositStart,
  //       depositEnd,
  //       settleStart,
  //       LONG_REQUIRED_AMOUNT,
  //       SHORT_REQUIRED_AMOUNT
  //     );
  //     const receipt = await createTradeSig.wait(1);
  //     const returnEvent = receipt.events.pop();
  //     const tradeID = returnEvent.args[0];

  //     // addr1 deposit as buyer
  //     await collateralMint.connect(addr1).approve(tradeContainer.address, LONG_REQUIRED_AMOUNT);
  //     await expect(tradeContainer.connect(addr1).deposit(tradeID, BUYER_SIDE)).to.changeTokenBalances(
  //       collateralMint,
  //       [tradeContainer.address, addr1.address],
  //       [LONG_REQUIRED_AMOUNT, -LONG_REQUIRED_AMOUNT]
  //     );

  //     // addr2 deposit as seller
  //     await collateralMint.connect(addr2).approve(tradeContainer.address, SHORT_REQUIRED_AMOUNT);
  //     await expect(tradeContainer.connect(addr2).deposit(tradeID, SELLER_SIDE)).to.changeTokenBalances(
  //       collateralMint,
  //       [tradeContainer.address, addr2.address],
  //       [SHORT_REQUIRED_AMOUNT, -SHORT_REQUIRED_AMOUNT]
  //     );
  //   }

  //   // time traveling
  //   await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

  //   for (let idx = 0; idx < TRADES_COUNT; idx++) {
  //     const tradeID = idx;
  //     console.log("settle and claim trade: ", tradeID);

  //     // owner settle the contract
  //     await tradeContainer.settle(tradeID);

  //     // addr1 claim assets
  //     await tradeContainer.connect(addr1).claim(tradeID);

  //     // addr2 claim assets
  //     await tradeContainer.connect(addr2).claim(tradeID);
  //   }
  // });
});
