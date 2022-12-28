import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, tracer } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS, A_DAY_IN_SECONDS } from "./utils";

const TRADES_COUNT = 50;
const LONG_REQUIRED_AMOUNT = 10;
const SHORT_REQUIRED_AMOUNT = 100;

const BUYER_SIDE = 0;
const SELLER_SIDE = 1;

describe.only("TradePool", function () {
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

    const TradePool = await ethers.getContractFactory("TradePool");
    const tradePool = await TradePool.deploy();

    return { collateralMint, DigitalPayoff, tradePool, chainlinkRate };
  }

  it("standard flow", async function () {
    tracer.enabled = false;
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, DigitalPayoff, tradePool, chainlinkRate } = await loadFixture(deployVyperSuite);

    // digital payoff
    const digitalPayoff = await DigitalPayoff.deploy(bn(1), true, chainlinkRate.address);

    const now = Math.floor(new Date().getTime() / 1000);
    const depositStart = now - A_DAY_IN_SECONDS;
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    console.log(`depositEnd: ${depositEnd} - 0x${depositEnd.toString(16)}`);
    console.log(`settleStart: ${settleStart} - 0x${settleStart.toString(16)}`);
    const createTradeSig = await tradePool.createTrade(
      collateralMint.address,
      digitalPayoff.address,
      depositEnd,
      settleStart,
      LONG_REQUIRED_AMOUNT,
      SHORT_REQUIRED_AMOUNT
    );
    const receipt = await createTradeSig.wait(1);
    const returnEvent = receipt.events.pop();
    const tradeID = returnEvent.args[0];

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(tradePool.address, LONG_REQUIRED_AMOUNT);
    await expect(tradePool.connect(addr1).deposit(tradeID, BUYER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradePool.address, addr1.address],
      [LONG_REQUIRED_AMOUNT, -LONG_REQUIRED_AMOUNT]
    );

    // addr2 deposit as seller
    await collateralMint.connect(addr2).approve(tradePool.address, SHORT_REQUIRED_AMOUNT);
    await expect(tradePool.connect(addr2).deposit(tradeID, SELLER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradePool.address, addr2.address],
      [SHORT_REQUIRED_AMOUNT, -SHORT_REQUIRED_AMOUNT]
    );

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // owner settle the contract
    tracer.enabled = true;
    await tradePool.settle(tradeID);

    // addr1 claim assets
    await tradePool.connect(addr1).claim(tradeID, BUYER_SIDE);
    tracer.enabled = false;
    // expect(await tradeID.users(SELLER_SIDE)).to.be.eq(addr2.address);

    // addr2 claim assets
    await tradePool.connect(addr2).claim(tradeID, SELLER_SIDE);
    expect(await collateralMint.balanceOf(tradePool.address)).to.be.eq(0);
  });
});
