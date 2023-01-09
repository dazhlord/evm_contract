// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import { IRatePlugin } from "./IRatePlugin.sol";

contract ChainlinkRate is IRatePlugin {
    AggregatorV3Interface public immutable priceFeed;
    
    constructor(address aggregatorAddress) {
        priceFeed = AggregatorV3Interface(aggregatorAddress);
    }

    function getLatestPrice() public view returns (int256 price,uint256 updatedAt) {
        (
            /* uint80 roundID */,
            price,
            /* uint startedAt */,
            updatedAt,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
    }
}