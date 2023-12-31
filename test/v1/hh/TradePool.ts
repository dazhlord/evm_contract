import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, tracer } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS, A_DAY_IN_SECONDS } from "../../utils";

const ORACLE_ID = bn(0);

const TRADES_COUNT = 50;
const LONG_REQUIRED_AMOUNT = 10;
const SHORT_REQUIRED_AMOUNT = 100;

const BUYER_SIDE = 0;
const SELLER_SIDE = 1;

describe("TradePool", function () {
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
    const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
    const chainlinkAdapter = await ChainlinkAdapter.deploy();
    await chainlinkAdapter.insertOracle(CHAINLINK_AGGREGATORS.BSC_MAINNET_AGGREGATOR_ETH_USD);

    const DigitalPayoffPool = await ethers.getContractFactory("DigitalPayoffPool");
    const digitalPayoffPool = await DigitalPayoffPool.deploy();

    const TradePool = await ethers.getContractFactory("TradePool");
    const tradePool = await TradePool.deploy();

    return { collateralMint, digitalPayoffPool, tradePool, chainlinkAdapter };
  }

  it("standard flow", async function () {
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, digitalPayoffPool, tradePool, chainlinkAdapter } = await loadFixture(deployVyperSuite);

    // digital payoff
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      bn(1),
      true,
      chainlinkAdapter.address,
      ORACLE_ID
    );
    const receiptPayoff = await createPayoffSig.wait(1);
    const returnEventPayoff = receiptPayoff?.events?.pop();
    const payoffID = returnEventPayoff?.args ? returnEventPayoff?.args[0] : 0;

    const now = Math.floor(new Date().getTime() / 1000);
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const createTradeSig = await tradePool.createTrade(
      collateralMint.address,
      digitalPayoffPool.address,
      payoffID,
      depositEnd,
      settleStart,
      LONG_REQUIRED_AMOUNT,
      SHORT_REQUIRED_AMOUNT
    );
    const receipt = await createTradeSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const tradeID = returnEvent?.args ? returnEvent?.args[0] : 0;

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
    await tradePool.settle(tradeID);

    // addr1 claim assets
    await tradePool.connect(addr1).claim(tradeID, BUYER_SIDE);
    // expect(await tradeID.users(SELLER_SIDE)).to.be.eq(addr2.address);

    // addr2 claim assets
    await tradePool.connect(addr2).claim(tradeID, SELLER_SIDE);
    expect(await collateralMint.balanceOf(tradePool.address)).to.be.eq(0);
  });

  it("test withdraw", async function () {
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, digitalPayoffPool, tradePool, chainlinkAdapter } = await loadFixture(deployVyperSuite);

    // digital payoff
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      bn(1),
      true,
      chainlinkAdapter.address,
      ORACLE_ID
    );
    const receiptPayoff = await createPayoffSig.wait(1);
    const returnEventPayoff = receiptPayoff?.events?.pop();
    const payoffID = returnEventPayoff?.args ? returnEventPayoff?.args[0] : 0;

    const now = Math.floor(new Date().getTime() / 1000);
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const createTradeSig = await tradePool.createTrade(
      collateralMint.address,
      digitalPayoffPool.address,
      payoffID,
      depositEnd,
      settleStart,
      LONG_REQUIRED_AMOUNT,
      SHORT_REQUIRED_AMOUNT
    );
    const receipt = await createTradeSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const tradeID = returnEvent?.args ? returnEvent?.args[0] : 0;

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(tradePool.address, LONG_REQUIRED_AMOUNT);
    await expect(tradePool.connect(addr1).deposit(tradeID, BUYER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradePool.address, addr1.address],
      [LONG_REQUIRED_AMOUNT, -LONG_REQUIRED_AMOUNT]
    );

    // addr2 doesn't deposit as seller

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    await tradePool.connect(addr1).withdraw(tradeID, BUYER_SIDE);
    expect(await collateralMint.balanceOf(tradePool.address)).to.be.eq(0);
  });

  it("test pool pause", async function () {
    const [deployer, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, digitalPayoffPool, tradePool, chainlinkAdapter } = await loadFixture(deployVyperSuite);

    // digital payoff
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      bn(1),
      true,
      chainlinkAdapter.address,
      ORACLE_ID
    );
    const receiptPayoff = await createPayoffSig.wait(1);
    const returnEventPayoff = receiptPayoff?.events?.pop();
    const payoffID = returnEventPayoff?.args ? returnEventPayoff?.args[0] : 0;

    const now = Math.floor(new Date().getTime() / 1000);
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    const createTradeSig = await tradePool.createTrade(
      collateralMint.address,
      digitalPayoffPool.address,
      payoffID,
      depositEnd,
      settleStart,
      LONG_REQUIRED_AMOUNT,
      SHORT_REQUIRED_AMOUNT
    );
    const receipt = await createTradeSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const tradeID = returnEvent?.args ? returnEvent?.args[0] : 0;

    // addr1 deposit as buyer
    await collateralMint.connect(addr1).approve(tradePool.address, LONG_REQUIRED_AMOUNT);
    await expect(tradePool.connect(addr1).deposit(tradeID, BUYER_SIDE)).to.changeTokenBalances(
      collateralMint,
      [tradePool.address, addr1.address],
      [LONG_REQUIRED_AMOUNT, -LONG_REQUIRED_AMOUNT]
    );

    // owner pause the pool
    await tradePool.pause();
    expect(await tradePool.paused());

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // withdraw in this case fails because the pool is paused
    await expect(tradePool.connect(addr1).withdraw(tradeID, BUYER_SIDE)).to.be.rejectedWith("Pausable: paused");

    // owner unpause the pool
    await tradePool.unpause();
    expect(!(await tradePool.paused()));

    // now the withdraw works fine
    await tradePool.connect(addr1).withdraw(tradeID, BUYER_SIDE);
    expect(await collateralMint.balanceOf(tradePool.address)).to.be.eq(0);
  });

  it("create and deposit", async function () {
    const [, addr1, addr2] = await ethers.getSigners();
    const { collateralMint, digitalPayoffPool, tradePool, chainlinkAdapter } = await loadFixture(deployVyperSuite);

    // digital payoff
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      bn(1),
      true,
      chainlinkAdapter.address,
      ORACLE_ID
    );
    const receiptPayoff = await createPayoffSig.wait(1);
    const returnEventPayoff = receiptPayoff?.events?.pop();
    const payoffID = returnEventPayoff?.args ? returnEventPayoff?.args[0] : 0;

    const now = Math.floor(new Date().getTime() / 1000);
    const depositEnd = now + 2 * A_DAY_IN_SECONDS;
    const settleStart = now + 15 * A_DAY_IN_SECONDS;

    // addr1 create trade and deposit as buyer

    {
      // trade 1
      await collateralMint.connect(addr1).approve(tradePool.address, LONG_REQUIRED_AMOUNT);
      const createTradeSig = await tradePool
        .connect(addr1)
        .createAndDeposit(
          collateralMint.address,
          digitalPayoffPool.address,
          payoffID,
          depositEnd,
          settleStart,
          LONG_REQUIRED_AMOUNT,
          SHORT_REQUIRED_AMOUNT,
          BUYER_SIDE
        );
      const receipt = await createTradeSig.wait(1);
      const returnEvent = receipt?.events?.pop();
      const tradeID = returnEvent?.args ? returnEvent?.args[0] : 0;
      const settleData = await tradePool.settleData(tradeID);
      expect(settleData.longUser).to.be.eq(addr1.address);
    }

    {
      // trade 2
      await collateralMint.connect(addr1).approve(tradePool.address, SHORT_REQUIRED_AMOUNT);
      await expect(
        tradePool
          .connect(addr1)
          .createAndDeposit(
            collateralMint.address,
            digitalPayoffPool.address,
            payoffID,
            depositEnd,
            settleStart,
            LONG_REQUIRED_AMOUNT,
            SHORT_REQUIRED_AMOUNT,
            SELLER_SIDE
          )
      ).to.changeTokenBalances(
        collateralMint,
        [tradePool.address, addr1.address],
        [SHORT_REQUIRED_AMOUNT, -SHORT_REQUIRED_AMOUNT]
      );
    }
  });
});
