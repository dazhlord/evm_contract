// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

import { IOracleAdapter } from "../rate/IOracleAdapter.sol";
import { IPayoffPoolPlugin } from "./IPayoffPoolPlugin.sol";

contract DigitalPayoffPool is IPayoffPoolPlugin {
    
    event PayoffCreated(uint256);

    struct DigitalData {
        IOracleAdapter oracleAdapter;
        bool isCall;
        int256 strike;
        uint256 oracleID;
    }

    mapping(uint256 => DigitalData) public digitalData;
    uint256 private nextIdx = 0;

    function createDigitalPayoff(int256 _strike, bool _isCall, IOracleAdapter _ratePlugin, uint256 _oracleID) public {
        uint256 payoffID = nextIdx++;
        console.log("payoffID: %s", payoffID);

        DigitalData storage d = digitalData[payoffID];

        d.strike = _strike;
        d.isCall = _isCall;
        d.oracleAdapter = _ratePlugin;
        d.oracleID = _oracleID;

        emit PayoffCreated(payoffID);
    }

    function execute(uint256 payoffID, uint256 a, uint256 b) external view returns (uint256 pnlLong, uint256 pnlShort) {

        DigitalData memory d = digitalData[payoffID];
        (int256 newSpot, ) = d.oracleAdapter.getLatestPrice(d.oracleID);
        
        int256 strike_ = d.strike;
        bool isCall_ = d.isCall;

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
    }
}