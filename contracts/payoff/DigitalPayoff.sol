// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import { IRatePlugin } from "../rate/IRatePlugin.sol";
import { IPayoffPlugin } from "./IPayoffPlugin.sol";

contract DigitalPayoff is IPayoffPlugin {
    IRatePlugin public immutable ratePlugin;
    int256 public immutable strike;
    bool public immutable isCall;

    constructor(int256 _strike, bool _isCall, IRatePlugin _ratePlugin) {
        strike = _strike;
        isCall = _isCall;

        ratePlugin = _ratePlugin;
    }

    function execute(uint256 a, uint256 b) external view returns (uint256, uint256) {
        int256 newSpot = ratePlugin.getLatestPrice();
        
        if ((isCall && newSpot >= strike) || (!isCall && newSpot < strike)) {
            return (b, a);
        } else {
            return (0, a+b);
        }
    }
}