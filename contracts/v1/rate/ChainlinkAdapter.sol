// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IOracleAdapter} from "./IOracleAdapter.sol";

contract ChainlinkAdapter is IOracleAdapter {
    event OracleCreated(uint256);

    mapping(uint256 => AggregatorV3Interface) public oracles;
    uint256 private nextIdx = 0;

    function insertOracle(address aggregatorAddress) public {
        uint256 oracleID = nextIdx++;
        oracles[oracleID] = AggregatorV3Interface(aggregatorAddress);
        emit OracleCreated(oracleID);
    }

    function getLatestPrice(uint256 idx) public view returns (int256 price, uint256 updatedAt) {
        (
            /* uint80 roundID */
            ,
            price,
            /* uint startedAt */
            ,
            updatedAt,
            /* uint80 answeredInRound */
        ) = oracles[idx].latestRoundData();
    }
}
