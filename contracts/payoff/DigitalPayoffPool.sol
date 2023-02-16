// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {IOracleAdapter} from "../rate/IOracleAdapter.sol";
import {IPayoffPoolPlugin} from "./IPayoffPoolPlugin.sol";

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

        DigitalData storage d = digitalData[payoffID];

        d.strike = _strike;
        d.isCall = _isCall;
        d.oracleAdapter = _ratePlugin;
        d.oracleID = _oracleID;

        emit PayoffCreated(payoffID);
    }

    function execute(uint256 payoffID, uint256 a, uint256 b)
        external
        view
        returns (uint256 pnlLong, uint256 pnlShort)
    {
        DigitalData memory d = digitalData[payoffID];
        (int256 newSpot,) = d.oracleAdapter.getLatestPrice(d.oracleID);

        if ((d.isCall && newSpot >= d.strike) || (!d.isCall && newSpot < d.strike)) {
            pnlLong = b;
            pnlShort = a;
        } else {
            pnlLong = 0;
            pnlShort = a + b;
        }
    }
}
