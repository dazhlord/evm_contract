import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { bn, A_DAY_IN_SECONDS } from "../../utils";
import { BigNumber } from "ethers";

const LONG_REQUIRED_AMOUNT = bn(10).mul(bn(10).pow(5));
const SHORT_REQUIRED_AMOUNT = bn(100).mul(bn(10).pow(5));

const OFFER_STATE_OPEN = 0;
const OFFER_STATE_CANCELLED = 1;
const OFFER_STATE_MATCHED = 2;
const OFFER_STATE_SETTLED = 3;

describe("DigitalMarket", function () {
  async function deployPrograms() {
    const [owner, alice, bob] = await ethers.getSigners();

    // * * * * * * * * * * * * * *
    // create collateral
    const MintableERC20 = await ethers.getContractFactory("MintableERC20");
    const collateral = await MintableERC20.deploy("Vyper token", "vTKN");

    // mint collateral to addr1 and addr2
    await Promise.all([
      collateral.mint(alice.address, LONG_REQUIRED_AMOUNT),
      collateral.mint(bob.address, SHORT_REQUIRED_AMOUNT),
    ]);

    // * * * * * * * * * * * * * *
    // create oracle

    const ManualOracleAdapter = await ethers.getContractFactory("ManualOracleAdapter");
    const oracle = await upgrades.deployProxy(ManualOracleAdapter, [ethers.utils.formatBytes32String("test"), 1, 3]);

    // * * * * * * * * * * * * * *
    // create digital market

    // const DigitalPayoffLib = await ethers.getContractFactory("DigitalPayoffLib");
    // const digitalPayoffLib = await DigitalPayoffLib.deploy();
    // await digitalPayoffLib.deployed();

    const DigitalMarket = await ethers.getContractFactory("DigitalMarket");
    const digitalMarket = await upgrades.deployProxy(DigitalMarket, [collateral.address, oracle.address]);

    return { collateral, oracle, digitalMarket };
  }

  it("standard flow", async function () {
    const [, alice, bob] = await ethers.getSigners();
    const { collateral, oracle, digitalMarket } = await loadFixture(deployPrograms);

    const settleStart = getSettleTimeIn(15 * A_DAY_IN_SECONDS);

    const initialAliceBalance = await collateral.balanceOf(alice.address);
    const initialBobBalance = await collateral.balanceOf(bob.address);

    // create trade
    await collateral.connect(alice).approve(digitalMarket.address, LONG_REQUIRED_AMOUNT);
    await digitalMarket
      .connect(alice)
      .createOffer(
        LONG_REQUIRED_AMOUNT,
        SHORT_REQUIRED_AMOUNT,
        true,
        settleStart,
        ethers.utils.defaultAbiCoder.encode(["bool", "int256"], [true, 1])
      );

    expect(await collateral.balanceOf(alice.address)).to.be.eq(initialAliceBalance.sub(LONG_REQUIRED_AMOUNT));

    // fetch trade
    let trade = await digitalMarket.tradeOffers(0);

    expect(trade.buyer).to.be.eq(alice.address);
    expect(trade.seller).to.be.eq(ethers.constants.AddressZero);
    expect(trade.state).to.be.eq(OFFER_STATE_OPEN);
    expect(trade.collectableFees).to.be.eq(bn(0));
    expect(trade.longRequiredAmount).to.be.eq(LONG_REQUIRED_AMOUNT);
    expect(trade.shortRequiredAmount).to.be.eq(SHORT_REQUIRED_AMOUNT);
    expect(trade.longClaimableAmount).to.be.eq(bn(0));
    expect(trade.shortClaimableAmount).to.be.eq(bn(0));

    // bob match offer
    await collateral.connect(bob).approve(digitalMarket.address, SHORT_REQUIRED_AMOUNT);
    await digitalMarket.connect(bob).matchOffer(0);

    expect(await collateral.balanceOf(bob.address)).to.be.eq(initialBobBalance.sub(SHORT_REQUIRED_AMOUNT));
    expect((await digitalMarket.tradeOffers(0)).seller).to.be.eq(bob.address);

    trade = await digitalMarket.tradeOffers(0);
    expect(trade.state).to.be.eq(OFFER_STATE_MATCHED);

    // time traveling
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);

    // simulate price changes
    await oracle.setLivePrice(1234);

    // alice settle offer
    await digitalMarket.connect(alice).settleOffer(0);

    trade = await digitalMarket.tradeOffers(0);
    expect(trade.state).to.be.eq(OFFER_STATE_SETTLED);
    expect(trade.collectableFees).to.be.eq(bn(0));
    expect(trade.longClaimableAmount).to.be.eq(SHORT_REQUIRED_AMOUNT);
    expect(trade.shortClaimableAmount).to.be.eq(LONG_REQUIRED_AMOUNT);
    expect(trade.oracleSnapshotOnSettlement.price).to.be.eq(bn(1234));
  });

  it("test cancel offer", async function () {
    const [, alice] = await ethers.getSigners();
    const { collateral, digitalMarket } = await loadFixture(deployPrograms);

    const settleStart = getSettleTimeIn(15 * A_DAY_IN_SECONDS);

    const initialAliceBalance = await collateral.balanceOf(alice.address);

    // create trade
    await collateral.connect(alice).approve(digitalMarket.address, LONG_REQUIRED_AMOUNT);
    await digitalMarket
      .connect(alice)
      .createOffer(
        LONG_REQUIRED_AMOUNT,
        SHORT_REQUIRED_AMOUNT,
        true,
        settleStart,
        ethers.utils.defaultAbiCoder.encode(["bool", "int256"], [true, 1])
      );
    await digitalMarket.connect(alice).cancelOffer(0);

    // fetch trade
    let trade = await digitalMarket.tradeOffers(0);

    expect(trade.buyer).to.be.eq(alice.address);
    expect(trade.seller).to.be.eq(ethers.constants.AddressZero);
    expect(trade.state).to.be.eq(OFFER_STATE_CANCELLED);
    expect(initialAliceBalance).to.be.eq(await collateral.balanceOf(alice.address));
  });

  it("test fees", async function () {
    const [, alice, bob, tim] = await ethers.getSigners();
    const { oracle, collateral, digitalMarket } = await loadFixture(deployPrograms);

    const settleStart = getSettleTimeIn(15 * A_DAY_IN_SECONDS);

    // grant roles to tim wallet
    await digitalMarket.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SECURITY_STAFF_ROLE")), tim.address);
    await digitalMarket.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FEE_COLLECTOR_ROLE")), tim.address);

    const FEES_PERCENTAGE_BPS = bn(1); // considering the FEES_DECIMALS
    // tim set the fees percentage with the FEES_DECIMALS precision
    await digitalMarket.connect(tim).setFeesPercentage(FEES_PERCENTAGE_BPS);
    expect(await digitalMarket.feesPercentage()).to.be.eq(FEES_PERCENTAGE_BPS);
    // tim set himself as the fee receiver
    await digitalMarket.connect(tim).setFeesReceiver(tim.address);
    expect(await digitalMarket.feesReceiver()).to.be.eq(tim.address);

    // trade flow
    await collateral.connect(alice).approve(digitalMarket.address, LONG_REQUIRED_AMOUNT);
    await digitalMarket
      .connect(alice)
      .createOffer(
        LONG_REQUIRED_AMOUNT,
        SHORT_REQUIRED_AMOUNT,
        true,
        settleStart,
        ethers.utils.defaultAbiCoder.encode(["bool", "int256"], [true, 1])
      );
    await collateral.connect(bob).approve(digitalMarket.address, SHORT_REQUIRED_AMOUNT);
    await digitalMarket.connect(bob).matchOffer(0);
    await time.increaseTo(settleStart + A_DAY_IN_SECONDS);
    await digitalMarket.settleOffer(0);

    const collectableFees = await digitalMarket.collectableFees();
    const feesPercentage = await digitalMarket.feesPercentage();
    const feesDecimals = await digitalMarket.FEES_DECIMALS();

    const trade = await digitalMarket.tradeOffers(0);
    expect(trade.longClaimableAmount.add(trade.shortClaimableAmount).add(collectableFees)).to.be.eq(
      LONG_REQUIRED_AMOUNT.add(SHORT_REQUIRED_AMOUNT)
    );

    expect(trade.longClaimableAmount).to.be.eq(
      SHORT_REQUIRED_AMOUNT.sub(SHORT_REQUIRED_AMOUNT.mul(feesPercentage).div(bn(10).pow(feesDecimals)))
    );
    expect(trade.shortClaimableAmount).to.be.eq(
      LONG_REQUIRED_AMOUNT.sub(LONG_REQUIRED_AMOUNT.mul(feesPercentage).div(bn(10).pow(feesDecimals)))
    );

    // alice and bob claim assets
    await digitalMarket.connect(alice).claimOffer(0);
    await digitalMarket.connect(bob).claimOffer(0);

    expect(await collateral.balanceOf(digitalMarket.address)).to.be.eq(collectableFees);

    // tim claim fees
    await digitalMarket.connect(tim).collectFees();

    expect(await collateral.balanceOf(digitalMarket.address)).to.be.eq(0);
    expect(await collateral.balanceOf(tim.address)).to.be.eq(collectableFees);
  });

  it("test pause market", async function () {
    const [, alice, bob, tim] = await ethers.getSigners();
    const { collateral, digitalMarket } = await loadFixture(deployPrograms);

    // grant roles to tim wallet
    await digitalMarket.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SECURITY_STAFF_ROLE")), tim.address);
    await digitalMarket.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FEE_COLLECTOR_ROLE")), tim.address);

    const settleStart = getSettleTimeIn(15 * A_DAY_IN_SECONDS);
    await collateral.connect(alice).approve(digitalMarket.address, LONG_REQUIRED_AMOUNT);
    await digitalMarket
      .connect(alice)
      .createOffer(
        LONG_REQUIRED_AMOUNT,
        SHORT_REQUIRED_AMOUNT,
        true,
        settleStart,
        ethers.utils.defaultAbiCoder.encode(["bool", "int256"], [true, 1])
      );

    // owner pause
    await digitalMarket.connect(tim).pause();
    expect(await digitalMarket.paused());

    // withdraw in this case fails because the pool is paused
    await expect(digitalMarket.connect(alice).cancelOffer(0)).to.be.rejectedWith("Pausable: paused");

    // owner unpause the pool
    await digitalMarket.connect(tim).unpause();
    expect(!(await digitalMarket.paused()));

    // now the withdraw works fine
    await digitalMarket.connect(alice).cancelOffer(0);
    expect(await collateral.balanceOf(digitalMarket.address)).to.be.eq(0);
  });
});

function getSettleTimeIn(arg0: number): number {
  const now = Math.floor(new Date().getTime() / 1000);
  return now + 15 * A_DAY_IN_SECONDS;
}
