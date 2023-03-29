import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn } from "../../../utils";

const ORACLE_PRICE = bn(100);
const ORACLE_PRICE_ID = bn(0);

describe("DigitalPayoff", function () {
  async function deployContract() {
    const PermissionedOracleAdapter = await ethers.getContractFactory("PermissionedOracleAdapter");
    const mockOracleAdapter = await PermissionedOracleAdapter.deploy();

    await mockOracleAdapter.setPrice(ORACLE_PRICE_ID, ORACLE_PRICE);

    const DigitalPayoffPool = await ethers.getContractFactory("DigitalPayoffPool");
    const digitalPayoffPool = await DigitalPayoffPool.deploy();

    return { digitalPayoffPool, mockOracleAdapter };
  }

  it("out of the money", async function () {
    const { digitalPayoffPool, mockOracleAdapter } = await loadFixture(deployContract);

    const strike = ORACLE_PRICE.add(bn(5));
    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      strike,
      true,
      mockOracleAdapter.address,
      ORACLE_PRICE_ID
    );
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
    const { digitalPayoffPool, mockOracleAdapter } = await loadFixture(deployContract);
    const strike = ORACLE_PRICE.add(bn(5));

    const createPayoffSig = await digitalPayoffPool.createDigitalPayoff(
      strike,
      false,
      mockOracleAdapter.address,
      ORACLE_PRICE_ID
    );
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
