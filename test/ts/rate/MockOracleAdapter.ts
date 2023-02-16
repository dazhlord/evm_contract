import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn } from "../utils";

describe("MockOracleAdapter", function () {
  async function deployContract() {
    const MockOracleAdapter = await ethers.getContractFactory("MockOracleAdapter");
    const mockOracleAdapter = await MockOracleAdapter.deploy();
    return { mockOracleAdapter };
  }

  it("get latest price", async function () {
    const { mockOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const priceIDX = bn(0);
    mockOracleAdapter.setPrice(priceIDX, price);

    expect((await mockOracleAdapter.getLatestPrice(priceIDX))[0]).to.be.eq(price);
  });

  it("update internal price", async function () {
    const { mockOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const secondPrice = bn(200);
    const priceIDX = bn(0);
    mockOracleAdapter.setPrice(priceIDX, price);
    mockOracleAdapter.setPrice(priceIDX, secondPrice);

    expect((await mockOracleAdapter.getLatestPrice(priceIDX))[0]).to.be.eq(secondPrice);
  });

  it("only owner can update price", async function () {
    const [, addr1] = await ethers.getSigners();
    const { mockOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const priceIDX = bn(0);
    const setPrice = mockOracleAdapter.connect(addr1).setPrice(priceIDX, price);

    await expect(setPrice).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    );
  });
});
