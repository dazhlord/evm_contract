// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import { IOracleAdapter } from "./IOracleAdapter.sol";

contract MockOracleAdapter is IOracleAdapter, Ownable {
    
    mapping(uint256 => int256) public prices;
    uint256 private nextIdx = 0;

    function getLatestPrice(uint256 idx) external view returns (int256, uint256) {
        return (prices[idx], block.timestamp);
    }

    function setPrice(uint256 idx, int256 _newPrice) public onlyOwner {
        prices[idx] = _newPrice;
    }
}