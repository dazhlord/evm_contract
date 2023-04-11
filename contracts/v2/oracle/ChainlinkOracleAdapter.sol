// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IOracleAdapter, OracleAdapterSnapshot} from "./IOracleAdapter.sol";

// @title Chainlink adapter
/// @author giacomo@vyperprotocol.io
contract ChainlinkOracleAdapter is IOracleAdapter {
    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STATE

    /// @notice manual oracle description
    address public aggregatorAddress;

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // METHODS

    constructor(address _aggregatorAddress) {
        aggregatorAddress = _aggregatorAddress;
    }

    function getLatestPrice() public view returns (OracleAdapterSnapshot memory snapshot) {
        (
            /* uint80 roundID */
            ,
            int256 price,
            /* uint startedAt */
            ,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = AggregatorV3Interface(aggregatorAddress).latestRoundData();

        uint8 decimals = AggregatorV3Interface(aggregatorAddress).decimals();

        return OracleAdapterSnapshot({price: price, decimals: decimals, updatedAt: updatedAt});
    }

    function aggregatorDescription() external view returns (string memory) {
        return AggregatorV3Interface(aggregatorAddress).description();
    }
}
