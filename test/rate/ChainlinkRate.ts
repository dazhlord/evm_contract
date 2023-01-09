import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, tracer } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS } from "../utils";

describe("ChainlinkRate", function () {
  async function deployContract() {
    const ChainlinkRate = await ethers.getContractFactory("ChainlinkRate");

    return { ChainlinkRate };
  }

  it("get latest price", async function () {
    const { ChainlinkRate } = await loadFixture(deployContract);

    // chainilink rate with goerli eth/usd
    const chainlinkRate = await ChainlinkRate.deploy(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);
    const [latestPrice] = await chainlinkRate.getLatestPrice();

    expect(latestPrice.toNumber()).to.be.gt(bn(1e11).toNumber()).and.lt(bn(1e12).toNumber());
  });
});
