// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library DigitalPayoffLib {
    function execute(int256 spotPrice, int256 strike, bool isCall, uint256 buyerInputAmount, uint256 sellerInputAmount)
        internal
        pure
        returns (uint256 buyerOutputAmount, uint256 sellerOutputAmount)
    {
        if ((isCall && spotPrice >= strike) || (!isCall && spotPrice < strike)) {
            buyerOutputAmount = sellerInputAmount;
            sellerOutputAmount = buyerInputAmount;
        } else {
            buyerOutputAmount = 0;
            sellerOutputAmount = buyerInputAmount + sellerInputAmount;
        }
    }
}
