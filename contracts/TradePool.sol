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
        IERC20 collateral;
        IPayoffPlugin payoff;
        uint256 depositStart;
        uint256 depositEnd;
        uint256 settleStart;
        TradeStage stage;
        mapping(Sides => address) users;
        mapping(Sides => uint256) requiredAmount;
        mapping(Sides => uint256) pnl;
    }

    /** storage */

    mapping(uint256 => Trade) public trades;
    uint256 private nextIdx = 0;

    /** methods */

    function createTrade(
        IERC20 _collateral,
        IPayoffPlugin _payoff,
        uint256 _depositStart,
        uint256 _depositEnd,
        uint256 _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
        ) public {
        
        require(_longRequiredAmount + _shortRequiredAmount > 0, "invalid required amounts");

        uint256 tradeID = nextIdx++;
        console.log("tradeID: %s", tradeID);

        Trade storage t = trades[tradeID];
        t.collateral = _collateral;
        t.payoff = _payoff;
        t.depositStart = _depositStart;
        t.depositEnd = _depositEnd;
        t.settleStart = _settleStart;
        t.stage = TradeStage.UNFUNDED;
        t.requiredAmount[Sides.LONG] = _longRequiredAmount;
        t.requiredAmount[Sides.SHORT] =_shortRequiredAmount;

        emit TradeCreated(tradeID);
    }

    // deposit
    function deposit(uint256 _tradeID, Sides _side) external {
        console.log("deposit invoked");

        Trade storage t = trades[_tradeID];


        // check if deposit is allowed
        require(t.depositStart < block.timestamp && block.timestamp < t.depositEnd, "deposit is closed");

        if(_side == Sides.LONG) {
            require(t.stage == TradeStage.UNFUNDED || t.stage == TradeStage.SELLER_FUNDED);
            require(t.users[Sides.SHORT] != msg.sender, "users is already seller");
        }
        if(_side == Sides.SHORT) {
            require(t.stage == TradeStage.UNFUNDED || t.stage == TradeStage.BUYER_FUNDED);
            require(t.users[Sides.LONG] != msg.sender, "users is already buyer");
        }

        // receive collateral
        t.collateral.transferFrom(msg.sender, address(this), t.requiredAmount[_side]);

        // save funding wallet
        t.users[_side] = msg.sender;

        if(t.stage == TradeStage.UNFUNDED) {
            if(_side == Sides.LONG) {
                t.stage = TradeStage.BUYER_FUNDED;
            } else {
                t.stage = TradeStage.SELLER_FUNDED;
            }
        } else {
            t.stage = TradeStage.BOTH_FUNDED;
        }

        emit TradeFunded(_tradeID, _side, msg.sender);
    }

    // TODO withdraw
    
    // settle
    function settle(uint256 _tradeID) external {
        console.log("settle invoked");

        Trade storage t = trades[_tradeID];

        // check if settle is available
        require(block.timestamp > t.settleStart, "settle not available yet");

        // // check if settle is not already been executed
        // require(!isSettleExecuted(_tradeID), "settle already executed");

        // // check if both sides are taken
        // require(isSideTaken(_tradeID, Sides.LONG) && isSideTaken(_tradeID, Sides.SHORT), "at least one side is not taken");
        require(t.stage == TradeStage.BOTH_FUNDED);

        (t.pnl[Sides.LONG], t.pnl[Sides.SHORT]) = t.payoff.execute(t.requiredAmount[Sides.LONG], t.requiredAmount[Sides.SHORT]);
        console.log("+ long pnl: %s", t.pnl[Sides.LONG]);
        console.log("+ short pnl: %s", t.pnl[Sides.SHORT]);

        t.stage = TradeStage.SETTLED;

        emit TradeSettled(_tradeID, t.pnl[Sides.LONG], t.pnl[Sides.SHORT]);
    }
    
    // claim
    function claim(uint256 _tradeID, Sides _side) external {
        console.log("claim invoked");

        Trade storage t = trades[_tradeID];

        // check if settle is already been executed
        require(t.stage == TradeStage.SETTLED, "settle not executed yet");

        // check if the user is the side owner
        require(t.users[_side] == msg.sender, "unknown user");

        // approve and transfer back collateral
        t.collateral.approve(address(this), t.pnl[_side]);
        t.collateral.transferFrom(address(this), msg.sender, t.pnl[_side]);

        // remove user
        t.users[_side] = address(0);

        emit TradeClaimed(_tradeID, _side);
    }

    // function isSettleExecuted(uint256 _tradeID) public view returns (bool) {
    //     Trade storage t = trades[_tradeID];
    //     return ( t.pnl[Sides.LONG] + t.pnl[Sides.SHORT]) == (t.requiredAmount[Sides.LONG] + t.requiredAmount[Sides.SHORT]);
    // }

    function pnlOf(uint256 _tradeID, Sides _side) public view returns (uint256) {
        return trades[_tradeID].pnl[_side];
    }

    // function isNoSideTaken(uint256 _tradeID) public view returns (bool) {
    //     return !isSideTaken(_tradeID, Sides.LONG) && !isSideTaken(_tradeID, Sides.SHORT);
    // }

    // function isSideTaken(uint256 _tradeID, Sides _side) public view returns (bool) {
    //     return trades[_tradeID].users[_side] != address(0);
    // }

    function getAddressSide(uint256 _tradeID, address _account) public view returns (Sides) {
        Trade storage t = trades[_tradeID];
        if(t.users[Sides.LONG] == _account) return Sides.LONG;
        if(t.users[Sides.SHORT] == _account) return Sides.SHORT;
        console.log("no side taken for account %s", _account);
        revert("no side taken");
    }
}



