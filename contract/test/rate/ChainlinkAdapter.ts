import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, tracer } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS } from "../utils";

describe("ChainlinkAdapter", function () {
  async function deployContract() {
    const ChainlinkAdapter = await ethers.getContractFactory("ChainlinkAdapter");
    const chainlinkAdapter = await ChainlinkAdapter.deploy();

    return { chainlinkAdapter };
  }

  it("get latest price", async function () {
    const { chainlinkAdapter } = await loadFixture(deployContract);

    const insertOracleSig = await chainlinkAdapter.insertOracle(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);
    const receipt = await insertOracleSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const ETH_USD_oracleID = returnEvent?.args ? returnEvent?.args[0] : 0;

    // chainilink rate with goerli eth/usd
    const [latestPrice] = await chainlinkAdapter.getLatestPrice(ETH_USD_oracleID);

    expect(latestPrice.toNumber()).to.be.gt(bn(1e11).toNumber()).and.lt(bn(1e12).toNumber());
  });
});
