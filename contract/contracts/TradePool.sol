// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IPayoffPoolPlugin } from "./payoff/IPayoffPoolPlugin.sol";


/// 
/// @title Vyper Trade Pool
/// @author VyperProtocol
/// @custom:security-contact info@vyperprotocol.io
contract TradePool {

    event TradeCreated(uint256);
    event TradeFunded(uint256, Sides, address);
    event TradeSettled(uint256, uint256, uint256);
    event TradeClaimed(uint256, Sides);

    enum Sides {
        LONG,
        SHORT
    }

    struct Trade {
        // SLOT 0
        IERC20 collateral;
        uint88 depositEnd;
        
        // SLOT 1
        IPayoffPoolPlugin payoffPool;
        uint88 settleStart;
        bool settleExecuted;

        // SLOT 2
        uint256 payoffID;

        // SLOT 3
        uint256 longRequiredAmount;
        
        // SLOT 4
        uint256 shortRequiredAmount;
    }

    struct SettleData {
        // SLOT 0
        address longUser;
        // SLOT 1
        address shortUser;

        // SLOT 2
        uint256 longPnl;
        // SLOT 3
        uint256 shortPnl;
    }

    /** storage */

    mapping(uint256 => Trade) public trades;
    mapping(uint256 => SettleData) public settleData;
    uint256 private nextIdx = 0;

    /** methods */

    function createTrade(
        IERC20 _collateral,
        IPayoffPoolPlugin _payoffPool,
        uint256 _payoffID,
        uint88 _depositEnd,
        uint88 _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
        ) public {
        
        require(_longRequiredAmount + _shortRequiredAmount > 0, "invalid required amounts");

        uint256 tradeID = nextIdx++;
        console.log("tradeID: %s", tradeID);

        Trade storage t = trades[tradeID];
        bytes32 slot_0 = (bytes32(bytes11(_depositEnd))   >> 8) | (bytes32(bytes20(address(  _collateral))) >> 96);
        bytes32 slot_1 = (bytes32(bytes11(_settleStart))  >> 8) | (bytes32(bytes20(address(  _payoffPool))) >> 96);
        assembly {
            sstore(t.slot, slot_0)
            sstore(add(t.slot, 1), slot_1)
            sstore(add(t.slot, 2), _payoffID)
            sstore(add(t.slot, 3), _longRequiredAmount)
            sstore(add(t.slot, 4), _shortRequiredAmount)
        }
        emit TradeCreated(tradeID);
    }

    // deposit
    function deposit(uint256 _tradeID, Sides _side) external {
        console.log("deposit invoked");

        Trade memory t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        // check if deposit is allowed
        require(block.timestamp < t.depositEnd, "deposit is closed");

        if(_side == Sides.LONG) {
            require(s.longUser == address(0));
            require(s.shortUser != msg.sender, "users is already seller");
        }
        if(_side == Sides.SHORT) {
            require(s.shortUser == address(0));
            require(s.longUser != msg.sender, "users is already buyer");
        }

        // receive collateral
        t.collateral.transferFrom(msg.sender, address(this), _side == Sides.LONG ? t.longRequiredAmount : t.shortRequiredAmount);

        // save funding wallet
        if(_side == Sides.LONG) {
            s.longUser = msg.sender;
        } 
        if(_side == Sides.SHORT) {
            s.shortUser = msg.sender;
        }

        emit TradeFunded(_tradeID, _side, msg.sender);
    }

    // TODO withdraw
    
    // settle
    function settle(uint256 _tradeID) external {
        console.log("settle invoked");

        Trade storage t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];
        
        // check if settle is available
        require(block.timestamp > t.settleStart, "settle not available yet");
        require(!t.settleExecuted, "settle already executed");

        // check if both sides are taken
        require(s.shortUser != address(0) && s.longUser != address(0));

        (uint256 longPnl, uint256 shortPnl) = t.payoffPool.execute(t.payoffID, t.longRequiredAmount, t.shortRequiredAmount);
        console.log("+ long pnl: %s", longPnl);
        console.log("+ short pnl: %s", shortPnl);

        s.longPnl = longPnl;
        s.shortPnl = shortPnl;
        t.settleExecuted = true;

        emit TradeSettled(_tradeID, longPnl, shortPnl);
    }
    
    // claim
    function claim(uint256 _tradeID, Sides _side) external {
        console.log("claim invoked");

        Trade storage t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        // check if settle is already been executed
        require(t.settleExecuted, "settle not executed yet");

        // check if the user is the side owner
        if(_side == Sides.LONG) {
            require(s.longUser == msg.sender, "unknown user");
        } 
        if(_side == Sides.SHORT) {
            require(s.shortUser == msg.sender, "unknown user");
        }

        // approve and transfer back collateral
        uint256 pnl = _side == Sides.LONG ? s.longPnl : s.shortPnl;
        t.collateral.approve(address(this), pnl);
        t.collateral.transferFrom(address(this), msg.sender, pnl);

        // remove user
        if(_side == Sides.LONG) {
            s.longUser = address(0);
        } 
        if(_side == Sides.SHORT) {
            s.shortUser = address(0);
        }

        emit TradeClaimed(_tradeID, _side);
    }
}



