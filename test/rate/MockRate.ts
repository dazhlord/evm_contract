import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn } from "../utils";

const PRICE_AT_DEPLOY = bn(1e3);

describe("MockRate", function () {
  async function deployContract() {
    const MockRate = await ethers.getContractFactory("MockRate");
    const mockRate = await MockRate.deploy(PRICE_AT_DEPLOY);
    return { mockRate };
  }

  it("get latest price", async function () {
    const { mockRate } = await loadFixture(deployContract);
    expect(await mockRate.getLatestPrice()).to.be.eq(PRICE_AT_DEPLOY);
  });

  it("update internal price", async function () {
    const { mockRate } = await loadFixture(deployContract);

    const newPrice = bn(100);
    await mockRate.setPrice(newPrice);
    expect(await mockRate.getLatestPrice()).to.be.eq(newPrice);
  });

  it("only owner can update price", async function () {
    const [, addr1] = await ethers.getSigners();
    const { mockRate } = await loadFixture(deployContract);
    const newPrice = bn(100);
    const setPrice = mockRate.connect(addr1).setPrice(newPrice);
    await expect(setPrice).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    );
  });
});
