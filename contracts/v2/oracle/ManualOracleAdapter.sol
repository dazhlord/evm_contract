// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleAdapter, OracleAdapterSnapshot} from "./IOracleAdapter.sol";

/// @title A manual oracle adapter
/// @author giacomo@vyperprotocol.io
contract ManualOracleAdapter is IOracleAdapter, AccessControl {
    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // CONSTANTS

    bytes32 public constant EDITOR_ROLE = keccak256("EDITOR_ROLE");

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // STATE

    /// @notice manual oracle description
    bytes32 public description;
    int256 internal _price;
    uint8 internal _decimals;
    bool internal _isLive;
    uint256 internal _updatedAt;

    // + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +
    // METHODS

    /// @notice build a new manual oracle adapter
    /// @dev if the isLive flag is enabled the snapshot will report the current block timestamp
    /// @param _ctorDescription description of current manual oracle adapter
    /// @param _ctorPrice initial price of the manual oracle
    /// @param _ctorDecimals decimals for the oracle price
    constructor(bytes32 _ctorDescription, int256 _ctorPrice, uint8 _ctorDecimals) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EDITOR_ROLE, msg.sender);

        description = _ctorDescription;
        _price = _ctorPrice;
        _decimals = _ctorDecimals;
        _isLive = true;
        _updatedAt = 0;
    }

    /// @dev if the isLive flag is enabled the snapshot will report the current block timestamp
    /// @inheritdoc IOracleAdapter
    function getLatestPrice() external view returns (OracleAdapterSnapshot memory snapshot) {
        if (_isLive) return OracleAdapterSnapshot({price: _price, decimals: _decimals, updatedAt: block.timestamp});
        else return OracleAdapterSnapshot({price: _price, decimals: _decimals, updatedAt: _updatedAt});
    }

    /// @notice set a new price enabling the isLive flag
    /// @dev Can only be called with the EDITOR_ROLE
    /// @param _newPrice udpated price
    function setLivePrice(int256 _newPrice) public onlyRole(EDITOR_ROLE) {
        _price = _newPrice;
        _isLive = true;
        _updatedAt = 0;
    }

    /// @notice set a new price with the updatedAt timestamp
    /// @dev Can only be called with the EDITOR_ROLE
    /// @param _newPrice udpated price
    /// @param _newUpdatedAt udpated update timestamp
    function setStalePrice(int256 _newPrice, uint256 _newUpdatedAt) public onlyRole(EDITOR_ROLE) {
        _price = _newPrice;
        _isLive = false;
        _updatedAt = _newUpdatedAt;
    }
}
