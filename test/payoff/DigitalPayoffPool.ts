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
    const DigitalPayoffPool = await ethers.getContractFactory("DigitalPayoffPool");
    const digitalPayoffPool = await DigitalPayoffPool.deploy();

    return { digitalPayoffPool, mockRate };
  }

  it("out of the money", async function () {
    const { digitalPayoffPool, mockRate } = await loadFixture(deployContract);

    const strike = PRICE_AT_DEPLOY.add(bn(5));
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(strike, true, mockRate.address);
    const receipt = await createPayoffSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const payoffID = returnEvent?.args ? returnEvent?.args[0] : 0;

    const premium = bn(10);
    const digi = bn(100);
    const [pnlBuyer, pnlSeller] = await digitalPayoffPool.execute(payoffID, premium, digi);
    expect(pnlBuyer.add(pnlSeller)).to.be.eql(premium.add(digi));
    expect(pnlBuyer).to.be.eql(bn(0));
    expect(pnlSeller).to.be.eql(bn(110));
  });

  it("in the money", async function () {
    const { digitalPayoffPool, mockRate } = await loadFixture(deployContract);
    const strike = PRICE_AT_DEPLOY.add(bn(5));

    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(strike, false, mockRate.address);
    const receipt = await createPayoffSig.wait(1);
    const returnEvent = receipt?.events?.pop();
    const payoffID = returnEvent?.args ? returnEvent?.args[0] : 0;

    const premium = bn(10);
    const digi = bn(100);
    const [pnlBuyer, pnlSeller] = await digitalPayoffPool.execute(payoffID, premium, digi);
    expect(pnlBuyer.add(pnlSeller)).to.be.eql(premium.add(digi));
    expect(pnlBuyer).to.be.eql(bn(100));
    expect(pnlSeller).to.be.eql(bn(10));
  });
});
