// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./payoff/IPayoffPlugin.sol";


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

    // State machine possible states
    // Available state changes:
    // - UNFUNDED -> BUYER_FUNDED -> SELLER_FUNDED -> BOTH_FUNDED -> SETTLED
    // - UNFUNDED -> SELLER_FUNDED -> BUYER_FUNDED -> BOTH_FUNDED -> SETTLED
    // TODO include state flows for dead contracts
    enum TradeStage {
        UNFUNDED,
        BUYER_FUNDED,
        SELLER_FUNDED,
        BOTH_FUNDED,
        SETTLED
    }

    struct Trade {
        // SLOT 0
        IERC20 collateral;
        uint64 depositEnd;
        
        // SLOT 1
        IPayoffPlugin payoff;
        uint64 settleStart;
        bool settleExecuted;

        // SLOT 2
        uint256 longRequiredAmount;
        
        // SLOT 3
        uint256 shortRequiredAmount;
    }

    struct SettleData {
        // SLOT 0
        // 20 byte
        address longUser;
        // SLOT 1
        // 20 byte
        address shortUser;

        // SLOT 2
        // 32 byte
        uint256 longPnl;
        // SLOT 3
        // 32 byte
        uint256 shortPnl;
    }

    /** storage */

    mapping(uint256 => Trade) public trades;
    mapping(uint256 => SettleData) public settleData;
    uint256 private nextIdx = 0;

    /** methods */

    function createTrade(
        IERC20 _collateral,
        IPayoffPlugin _payoff,
        uint64 _depositEnd,
        uint64 _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
        ) public {
        
        require(_longRequiredAmount + _shortRequiredAmount > 0, "invalid required amounts");

        uint256 tradeID = nextIdx++;
        console.log("tradeID: %s", tradeID);

        Trade storage t = trades[tradeID];
        bytes32 slot_0 = (bytes32(bytes8(_depositEnd))   >> 32) | (bytes32(bytes20(address(  _collateral))) >> 96);
        bytes32 slot_1 = (bytes32(bytes8(_settleStart))  >> 32) | (bytes32(bytes20(address(      _payoff))) >> 96);
        assembly {
            sstore(t.slot, slot_0)
            sstore(add(t.slot, 1), slot_1)
            sstore(add(t.slot, 2), _longRequiredAmount)
            sstore(add(t.slot, 3), _shortRequiredAmount)
        }
        emit TradeCreated(tradeID);
    }

    // deposit
    function deposit(uint256 _tradeID, Sides _side) external {
        console.log("deposit invoked");

        Trade memory t = trades[_tradeID];
        SettleData memory s = settleData[_tradeID];

        // check if deposit is allowed
        require(block.timestamp < t.depositEnd, "deposit is closed");

        TradeStage tradeStage = getTradeStage(s);
        if(_side == Sides.LONG) {
            require(tradeStage == TradeStage.UNFUNDED || tradeStage == TradeStage.SELLER_FUNDED);
            require(s.shortUser != msg.sender, "users is already seller");
        }
        if(_side == Sides.SHORT) {
            require(tradeStage == TradeStage.UNFUNDED || tradeStage == TradeStage.BUYER_FUNDED);
            require(s.longUser != msg.sender, "users is already buyer");
        }

        // receive collateral
        t.collateral.transferFrom(msg.sender, address(this), _side == Sides.LONG ? t.longRequiredAmount : t.shortRequiredAmount);

        // save funding wallet
        if(_side == Sides.LONG) {
            settleData[_tradeID].longUser = msg.sender;
        } else {
            settleData[_tradeID].shortUser = msg.sender;
        }

        emit TradeFunded(_tradeID, _side, msg.sender);
    }

    // TODO withdraw
    
    // settle
    function settle(uint256 _tradeID) external {
        console.log("settle invoked");

        Trade memory t = trades[_tradeID];

        // check if settle is available
        require(block.timestamp > t.settleStart, "settle not available yet");

        // check if both sides are taken
        TradeStage tradeStage = getTradeStage(settleData[_tradeID]);
        require(tradeStage == TradeStage.BOTH_FUNDED);

        (uint256 longPnl, uint256 shortPnl) = t.payoff.execute(t.longRequiredAmount, t.shortRequiredAmount);
        console.log("+ long pnl: %s", longPnl);
        console.log("+ short pnl: %s", shortPnl);

        settleData[_tradeID].longPnl = longPnl;
        settleData[_tradeID].shortPnl = shortPnl;
        trades[_tradeID].settleExecuted = true;

        emit TradeSettled(_tradeID, longPnl, shortPnl);
    }
    
    // claim
    function claim(uint256 _tradeID, Sides _side) external {
        console.log("claim invoked");

        Trade storage t = trades[_tradeID];

        // check if settle is already been executed
        require(t.settleExecuted, "settle not executed yet");

        // check if the user is the side owner
        if(_side == Sides.LONG) {
            require(settleData[_tradeID].longUser == msg.sender, "unknown user");
        } else {
            require(settleData[_tradeID].shortUser == msg.sender, "unknown user");
        }

        // approve and transfer back collateral
        uint256 pnl = _side == Sides.LONG ? settleData[_tradeID].longPnl : settleData[_tradeID].shortPnl;
        t.collateral.approve(address(this), pnl);
        t.collateral.transferFrom(address(this), msg.sender, pnl);

        // remove user
        if(_side == Sides.LONG) {
            settleData[_tradeID].longUser = address(0);
        } else {
            settleData[_tradeID].shortUser = address(0);
        }

        emit TradeClaimed(_tradeID, _side);
    }

    function getTradeStage(SettleData memory s) public pure returns (TradeStage) {
        if(s.longUser == address(0) && s.shortUser == address(0)) return TradeStage.UNFUNDED;
        if(s.longUser != address(0) && s.shortUser == address(0)) return TradeStage.BUYER_FUNDED;
        if(s.longUser != address(0) && s.shortUser == address(0)) return TradeStage.BUYER_FUNDED;
        /*if(t.longUser != address(0) && t.shortUser != address(0))*/ return TradeStage.BOTH_FUNDED;
    }
}



