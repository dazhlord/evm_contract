// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IOracleAdapter, OracleAdapterSnapshot} from "./oracle/IOracleAdapter.sol";
import {Market} from "./Market.sol";
import {DigitalPayoffLib} from "./libs/DigitalPayoffLib.sol";

/// @title A digital deritivative market
/// @author giacomo@vyperprotocol.io
contract DigitalMarket is Market {
    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // EVENTS

    event DigitalDataCreated(uint256 indexed id, bool isCall, int256 strike);
    event DigitalPayoffExecuted(uint256 indexed id, uint256 buyerAmount, uint256 sellerAmount);

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STRUCTS

    struct DigitalData {
        bool isCall;
        int256 strike;
    }

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STATE

    mapping(uint256 => DigitalData) public digitalData;

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // METHODS

    /// @notice create a new digital market
    /// @param _collateral ERC20 token used for collateral
    /// @param _oracle oracle adapter providing the source of truth
    constructor(address _collateral, IOracleAdapter _oracle) Market(_collateral, _oracle) {}

    /// @notice Returns an array of digital data within the specified range
    /// @dev Pagination is used to fetch digital data objects in smaller chunks
    /// @param startIndex The start index inclusive
    /// @param endIndex The end index not inclusive
    /// @return An array of DigitalData structs within the specified range
    function getDigitalDatas(uint256 startIndex, uint256 endIndex)
        public
        view
        returns (TradeOffer[] memory, DigitalData[] memory)
    {
        if (endIndex > tradeOffers.length) endIndex = tradeOffers.length;

        require(startIndex < endIndex, "Invalid range");

        uint256 length = endIndex - startIndex;
        TradeOffer[] memory offersChunk = new TradeOffer[](length);
        DigitalData[] memory digitalDataChunk = new DigitalData[](length);

        for (uint256 i = startIndex; i < endIndex; i++) {
            offersChunk[i - startIndex] = tradeOffers[i];
            digitalDataChunk[i - startIndex] = digitalData[i];
        }

        return (offersChunk, digitalDataChunk);
    }

    /// @inheritdoc Market
    function _createPayoff(uint256 _offerId, bytes calldata _payoffData) public override {
        (bool isCall, int256 strike) = abi.decode(_payoffData, (bool, int256));
        digitalData[_offerId] = DigitalData({isCall: isCall, strike: strike});
    }

    /// @inheritdoc Market
    function _executePayoff(
        uint256 _offerId,
        OracleAdapterSnapshot memory _oracleAdapterSnapshot,
        uint256[2] memory _depositAmounts
    ) internal override returns (uint256[2] memory payoffAmounts) {
        DigitalData memory d = digitalData[_offerId];

        (uint256 buyerAmount, uint256 sellerAmount) = DigitalPayoffLib.execute(
            _oracleAdapterSnapshot.price, d.strike, d.isCall, _depositAmounts[0], _depositAmounts[1]
        );

        payoffAmounts = [buyerAmount, sellerAmount];

        emit DigitalPayoffExecuted(_offerId, buyerAmount, sellerAmount);
    }
}
