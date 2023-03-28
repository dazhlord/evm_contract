// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../../lib/forge-std/src/Test.sol";
import "../../../lib/forge-std/src/console.sol";
import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";
import "../../../contracts/v1/rate/ChainlinkAdapter.sol";
import "../../../contracts/v1/payoff/ForwardPayoffPool.sol";

contract ForwardPayoffPoolTest is Test {
    ForwardPayoffPool internal forwardPayoffPool;
    MockV3Aggregator internal mockChainlinkAggregator;
    ChainlinkAdapter internal chainlinkAdapter;

    function setUp() public {
        forwardPayoffPool = new ForwardPayoffPool();
        mockChainlinkAggregator = new MockV3Aggregator(18, 1);
        chainlinkAdapter = new ChainlinkAdapter();
        chainlinkAdapter.insertOracle(address(mockChainlinkAggregator));
    }

    function testCreateForwardPayoff(int256 _strike, uint88 _notional, bool _isLinear) public {
        forwardPayoffPool.createForwardPayoff(_strike, _notional, _isLinear, chainlinkAdapter, 0);

        (IOracleAdapter oracleAdapter, bool isLinear, uint88 notional, int256 strike, uint256 oracleID) =
            forwardPayoffPool.forwardData(0);

        assertEq(address(oracleAdapter), address(chainlinkAdapter));
        assertEq(oracleID, 0);
        assertEq(isLinear, _isLinear);
        assertEq(notional, _notional);
        assertEq(strike, _strike);
    }

    function testLinearFlatReturn() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 100;
        uint88 notional = 1;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, longSide);
        assertEq(pnlShort, shortSide);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testInverseFlatReturn() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 100;
        uint88 notional = 1;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, longSide);
        assertEq(pnlShort, shortSide);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLinearSpotUp() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 120;
        uint88 notional = 1000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 120000);
        assertEq(pnlShort, 80000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLinearSpotDown() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 80;
        uint88 notional = 1000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 80000);
        assertEq(pnlShort, 120000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testInverseSpotUp() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 120;
        uint88 notional = 1000;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        // different from solana, we have no fee here
        assertEq(pnlLong, 100166);
        assertEq(pnlShort, 99834);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testInverseSpotDown() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 80;
        uint88 notional = 1000;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 99750);
        assertEq(pnlShort, 100250);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLongBankrupt() public {
        uint256 longSide = 50000;
        uint256 shortSide = 100000;
        int256 strike = 100;
        int256 newSpotValue = 75;
        uint88 notional = 2000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 0);
        assertEq(pnlShort, 150000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testShortBankrupt() public {
        uint256 longSide = 100000;
        uint256 shortSide = 50000;
        int256 strike = 100;
        int256 newSpotValue = 125;
        uint88 notional = 2000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 150000);
        assertEq(pnlShort, 0);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLunaRektLinear() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 1;
        int256 newSpotValue = 0;
        uint88 notional = 1000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 99000);
        assertEq(pnlShort, 101000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLunaRektInverse() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 1;
        int256 newSpotValue = 0;
        uint88 notional = 1000;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 0);
        assertEq(pnlShort, 200000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testZeroStrikeLinear() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 0;
        int256 newSpotValue = 1;
        uint88 notional = 1000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 101000);
        assertEq(pnlShort, 99000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testZeroStrikeInverse() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 0;
        int256 newSpotValue = 50;
        uint88 notional = 1000;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 101000);
        assertEq(pnlShort, 99000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLunaRektZeroStrikeLinear() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 0;
        int256 newSpotValue = 0;
        uint88 notional = 1000;
        bool isLinear = true;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 100000);
        assertEq(pnlShort, 100000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }

    function testLunaRektZeroStrikeInverse() public {
        uint256 longSide = 100000;
        uint256 shortSide = 100000;
        int256 strike = 0;
        int256 newSpotValue = 0;
        uint88 notional = 1000;
        bool isLinear = false;

        forwardPayoffPool.createForwardPayoff(strike, notional, isLinear, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(newSpotValue);
        (uint256 pnlLong, uint256 pnlShort) = forwardPayoffPool.execute(0, longSide, shortSide);

        assertEq(pnlLong, 101000);
        assertEq(pnlShort, 99000);
        assertEq(pnlLong + pnlShort, longSide + shortSide);
    }
}
