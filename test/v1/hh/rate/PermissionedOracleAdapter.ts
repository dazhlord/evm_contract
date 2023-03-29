import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn } from "../../../utils";

describe("PermissionedOracleAdapter", function () {
  async function deployContract() {
    const PermissionedOracleAdapter = await ethers.getContractFactory("PermissionedOracleAdapter");
    const permissionedOracleAdapter = await PermissionedOracleAdapter.deploy();
    return { permissionedOracleAdapter };
  }

  it("get latest price", async function () {
    const { permissionedOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const priceIDX = bn(0);
    permissionedOracleAdapter.setPrice(priceIDX, price);

    expect((await permissionedOracleAdapter.getLatestPrice(priceIDX))[0]).to.be.eq(price);
  });

  it("update internal price", async function () {
    const { permissionedOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const secondPrice = bn(200);
    const priceIDX = bn(0);
    permissionedOracleAdapter.setPrice(priceIDX, price);
    permissionedOracleAdapter.setPrice(priceIDX, secondPrice);

    expect((await permissionedOracleAdapter.getLatestPrice(priceIDX))[0]).to.be.eq(secondPrice);
  });

  it("only owner can update price", async function () {
    const [, addr1] = await ethers.getSigners();
    const { permissionedOracleAdapter } = await loadFixture(deployContract);
    const price = bn(100);
    const priceIDX = bn(0);
    const setPrice = permissionedOracleAdapter.connect(addr1).setPrice(priceIDX, price);

    await expect(setPrice).to.rejectedWith(
      Error,
      "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
    );
  });
});
