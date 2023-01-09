// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IRatePlugin {
    function getLatestPrice() external view returns (int256, uint256);
}
