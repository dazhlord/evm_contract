// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

struct OracleAdapterSnapshot {
    int256 price;
    uint8 decimals;
    uint256 updatedAt;
}

/// @title Abstract contract required for oracles used by Markets
/// @author giacomo@vyperprotocol.io
interface IOracleAdapter {
    /// @notice retrieve the oracle adapter snapshot
    /// @return snapshot current oracle snapshot
    function getLatestPrice() external view returns (OracleAdapterSnapshot memory snapshot);
}
