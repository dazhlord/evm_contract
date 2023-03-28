// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import { IOracleAdapter } from "../rate/IOracleAdapter.sol";
import { IPayoffPoolPlugin } from "./IPayoffPoolPlugin.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract ForwardPayoffPool is IPayoffPoolPlugin {
    event PayoffCreated(uint256);

    struct ForwardData {
        IOracleAdapter oracleAdapter;
        bool isLinear;
        uint88 notional;
        int256 strike;
        uint256 oracleID;
    }

    mapping(uint256 => ForwardData) public forwardData;
    uint256 private nextIdx = 0;

    function createForwardPayoff(int256 _strike, uint88 _notional, bool _isLinear, IOracleAdapter _ratePlugin, uint256 _oracleID) public {
        uint256 payoffID = nextIdx++;

        ForwardData storage d = forwardData[payoffID];

        d.strike = _strike;
        d.notional = _notional;
        d.isLinear = _isLinear;
        d.oracleAdapter = _ratePlugin;
        d.oracleID = _oracleID;

        emit PayoffCreated(payoffID);
    }

    function execute(uint256 payoffID, uint256 a, uint256 b)
        external
        view
        returns (uint256 pnlLong, uint256 pnlShort)
    {
        ForwardData memory d = forwardData[payoffID];
        (int256 newSpot,) = d.oracleAdapter.getLatestPrice(d.oracleID);

        if(newSpot == 0 && !d.isLinear && d.strike > 0) {
            pnlLong = 0;
            pnlShort = a + b;
        } else {

            int256 payoff = 0;
            int256 notional = SafeCast.toInt256(d.notional);

            if (newSpot == 0 && !d.isLinear && d.strike == 0) {
                payoff = notional;
            } else {
                int256 num = notional * (newSpot - d.strike);
                int256 den = d.isLinear ? int256(1) : newSpot;
                payoff = num / den;
            }

            int256 pnlLongNotClamped = SafeCast.toInt256(a) + payoff;
            pnlLongNotClamped = pnlLongNotClamped > 0 ? pnlLongNotClamped : int256(0);

            pnlLong =  Math.min(a+b, uint256(pnlLongNotClamped));
            pnlShort = (a+b) - pnlLong;
        }
    }
}
