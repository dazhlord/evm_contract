// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IOracleAdapter {
    function getLatestPrice(uint256 idx) external view returns (int256, uint256);
}
