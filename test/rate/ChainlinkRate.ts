import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { bn, CHAINLINK_AGGREGATORS } from "../utils";

describe("ChainlinkRate", function () {
  async function deployContract() {
    const ChainlinkRate = await ethers.getContractFactory("ChainlinkRate");

    // chainilink rate with goerli eth/usd
    const chainlinkRate = await ChainlinkRate.deploy(CHAINLINK_AGGREGATORS.GOERLI_AGGREGATOR_ETH_USD);

    return { chainlinkRate };
  }

  it("get latest price", async function () {
    const { chainlinkRate } = await loadFixture(deployContract);

    expect((await chainlinkRate.getLatestPrice()).toNumber())
      .to.be.gt(bn(1e11).toNumber())
      .and.lt(bn(1e12).toNumber());
  });
});
