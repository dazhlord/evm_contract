// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import { IRatePlugin } from "./IRatePlugin.sol";

contract MockRate is IRatePlugin, Ownable {
    
    int256 private price;

    constructor(int256 _price) {
        price = _price;
    }

    function getLatestPrice() external view returns (int256, uint256) {
        return (price, block.timestamp);
    }

    function setPrice(int256 _newPrice) public onlyOwner {
        price = _newPrice;
    }
}