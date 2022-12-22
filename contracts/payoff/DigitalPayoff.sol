// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

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

    function execute(uint256 a, uint256 b) external view returns (uint256 pnlLong, uint256 pnlShort) {
        int256 newSpot = ratePlugin.getLatestPrice();
        
        int256 strike_ = strike;
        bool isCall_ = isCall;
        assembly {
            let c_1 := and(isCall_, or(gt(newSpot, strike_), eq(newSpot, strike_)))
            let c_2 := and(not(isCall_), lt(newSpot, strike_))
            
            switch or(c_1, c_2)
            case 1 {
               pnlLong := b
               pnlShort := a
            }
            default {
                pnlLong := 0
                pnlShort := add(a, b)
            }
        }

        // if ((isCall && newSpot >= strike) || (!isCall && newSpot < strike)) {
        //     pnlLong = b;
        //     pnlShort = a;
        // } else {
        //     pnlLong = 0;
        //     pnlShort = a+b;
        // }
    }
}