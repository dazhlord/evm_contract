// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../lib/forge-std/src/Test.sol";
import "../../lib/forge-std/src/console.sol";
import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";
import "../../contracts/rate/ChainlinkAdapter.sol";
import "../../contracts/payoff/DigitalPayoffPool.sol";

contract DigitalPayoffPoolTest is Test {
    DigitalPayoffPool internal digitalPayoffPool;
    MockV3Aggregator internal mockChainlinkAggregator;
    ChainlinkAdapter internal chainlinkAdapter;

    function setUp() public {
        digitalPayoffPool = new DigitalPayoffPool();
        mockChainlinkAggregator = new MockV3Aggregator(18, 1);
        chainlinkAdapter = new ChainlinkAdapter();
        chainlinkAdapter.insertOracle(address(mockChainlinkAggregator));
    }

    function testCreateDigitalPayoff(int256 _strike, bool _isCall) public {
        digitalPayoffPool.createDigitalPayoff(_strike, _isCall, chainlinkAdapter, 0);

        (IOracleAdapter oracleAdapter, bool isCall, int256 strike, uint256 oracleID) = digitalPayoffPool.digitalData(0);

        assertEq(address(oracleAdapter), address(chainlinkAdapter));
        assertEq(oracleID, 0);
        assertEq(isCall, _isCall);
        assertEq(strike, _strike);
    }

    function testExecute(int256 _strike, int256 _oraclePrice, bool _isCall, uint128 _longSide, uint128 _shortSide)
        public
    {
        vm.assume(_longSide > 0);
        vm.assume(_shortSide > 0);

        digitalPayoffPool.createDigitalPayoff(_strike, _isCall, chainlinkAdapter, 0);

        mockChainlinkAggregator.updateAnswer(_oraclePrice);
        (uint256 pnlLong, uint256 pnlShort) = digitalPayoffPool.execute(0, _longSide, _shortSide);

        assertEq(pnlLong + pnlShort, uint256(_longSide) + uint256(_shortSide));
        if ((_isCall && _oraclePrice >= _strike) || (!_isCall && _oraclePrice < _strike)) {
            assertEq(pnlLong, _shortSide);
            assertEq(pnlShort, _longSide);
        } else {
            assertEq(pnlLong, 0);
            assertEq(pnlShort, uint256(_longSide) + uint256(_shortSide));
        }
    }
}
