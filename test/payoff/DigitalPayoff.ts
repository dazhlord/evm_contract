import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn } from "../utils";

const PRICE_AT_DEPLOY = bn(1e3);

describe("DigitalPayoff", function () {
  async function deployContract() {
    const MockRate = await ethers.getContractFactory("MockRate");
    const mockRate = await MockRate.deploy(PRICE_AT_DEPLOY);
    const DigitalPayoff = await ethers.getContractFactory("DigitalPayoff");
    return { DigitalPayoff, mockRate };
  }

  it("out of the money", async function () {
    const { DigitalPayoff, mockRate } = await loadFixture(deployContract);
    const strike = PRICE_AT_DEPLOY.add(bn(5));
    const digitalPayoff = await DigitalPayoff.deploy(strike, true, mockRate.address);
    const premium = bn(10);
    const digi = bn(100);
    const [pnlBuyer, pnlSeller] = await digitalPayoff.execute(premium, digi);
    expect(pnlBuyer.add(pnlSeller)).to.be.eql(premium.add(digi));
    expect(pnlBuyer).to.be.eql(bn(0));
    expect(pnlSeller).to.be.eql(bn(110));
  });

  it("in the money", async function () {
    const { DigitalPayoff, mockRate } = await loadFixture(deployContract);
    const strike = PRICE_AT_DEPLOY.add(bn(5));
    const digitalPayoff = await DigitalPayoff.deploy(strike, false, mockRate.address);
    const premium = bn(10);
    const digi = bn(100);
    const [pnlBuyer, pnlSeller] = await digitalPayoff.execute(premium, digi);
    expect(pnlBuyer.add(pnlSeller)).to.be.eql(premium.add(digi));
    expect(pnlBuyer).to.be.eql(bn(100));
    expect(pnlSeller).to.be.eql(bn(10));
  });
});
