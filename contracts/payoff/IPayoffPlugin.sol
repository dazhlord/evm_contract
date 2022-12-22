// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IPayoffPlugin {
    function execute(uint256 a, uint256 b) external view returns (uint256, uint256);
}