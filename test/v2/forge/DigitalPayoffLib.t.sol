// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../../lib/forge-std/src/Test.sol";
import "../../../contracts/v2/libs/DigitalPayoffLib.sol";

contract DigitalPayoffLibTest is Test {
    function setUp() public {}

    function testExecute(
        int256 spotPrice,
        int256 strike,
        bool isCall,
        uint256 buyerInputAmount,
        uint256 sellerInputAmount
    ) public {
        vm.assume(buyerInputAmount < type(uint128).max);
        vm.assume(sellerInputAmount < type(uint128).max);

        (uint256 buyerAmount, uint256 sellerAmount) =
            DigitalPayoffLib.execute(spotPrice, strike, isCall, buyerInputAmount, sellerInputAmount);

        assertEq(buyerAmount + sellerAmount, buyerInputAmount + sellerInputAmount);

        if ((isCall && spotPrice >= strike) || (!isCall && spotPrice < strike)) {
            assertEq(buyerAmount, sellerInputAmount);
            assertEq(sellerAmount, buyerInputAmount);
        } else {
            assertEq(buyerAmount, 0);
            assertEq(sellerAmount, buyerInputAmount + sellerInputAmount);
        }
    }
}
