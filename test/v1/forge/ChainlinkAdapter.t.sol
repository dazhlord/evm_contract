// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../../lib/forge-std/src/Test.sol";
import "../../../contracts/v1/rate/ChainlinkAdapter.sol";
import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

contract ChainlinkAdapterTest is Test {
    MockV3Aggregator internal mockChainlinkAggregator;

    function setUp() public {
        mockChainlinkAggregator = new MockV3Aggregator(18, 1000);
    }

    function testGetLatestPrice(int256 newAnswer) public {
        ChainlinkAdapter chainlinkAdapter = new ChainlinkAdapter();
        chainlinkAdapter.insertOracle(address(mockChainlinkAggregator));

        mockChainlinkAggregator.updateAnswer(newAnswer);

        (int256 price,) = chainlinkAdapter.getLatestPrice(0);
        assertEq(price, newAnswer);
    }
}
