// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IPayoffPoolPlugin} from "./payoff/IPayoffPoolPlugin.sol";

///
/// @title Vyper Trade Pool
/// @author VyperProtocol
/// @custom:security-contact info@vyperprotocol.io
contract TradePool is Pausable, Ownable {
    event TradeCreated(uint256);
    event TradeFunded(uint256, Sides, address);
    event TradeSettled(uint256, uint256, uint256);
    event TradeClaimed(uint256, Sides);
    event TradeWithdrawn(uint256, Sides);

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
        bool longClaimed;
        bool longWithdrawn;
        // SLOT 1
        address shortUser;
        bool shortClaimed;
        bool shortWithdrawn;
        // SLOT 2
        uint256 longPnl;
        // SLOT 3
        uint256 shortPnl;
    }

    /**
     * storage
     */

    mapping(uint256 => Trade) public trades;
    mapping(uint256 => SettleData) public settleData;
    uint256 private nextIdx = 0;

    /**
     * methods
     */

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function createAndDeposit(
        IERC20 _collateral,
        IPayoffPoolPlugin _payoffPool,
        uint256 _payoffID,
        uint88 _depositEnd,
        uint88 _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount,
        Sides _side
    ) external whenNotPaused {
        createTrade(_collateral, _payoffPool, _payoffID, _depositEnd, _settleStart, _longRequiredAmount, _shortRequiredAmount);
        deposit(nextIdx-1, _side);
    }

    function createTrade(
        IERC20 _collateral,
        IPayoffPoolPlugin _payoffPool,
        uint256 _payoffID,
        uint88 _depositEnd,
        uint88 _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
    ) public whenNotPaused {
        require(_longRequiredAmount + _shortRequiredAmount > 0, "invalid required amounts");

        uint256 tradeID = nextIdx++;

        Trade storage t = trades[tradeID];
        bytes32 slot_0 = (bytes32(bytes11(_depositEnd)) >> 8) | (bytes32(bytes20(address(_collateral))) >> 96);
        bytes32 slot_1 = (bytes32(bytes11(_settleStart)) >> 8) | (bytes32(bytes20(address(_payoffPool))) >> 96);
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
    function deposit(uint256 _tradeID, Sides _side) public whenNotPaused {
        Trade memory t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        // check if deposit is allowed
        require(block.timestamp < t.depositEnd, "deposit is closed");

        if (_side == Sides.LONG) {
            require(s.longUser == address(0));
            require(s.shortUser != msg.sender, "users is already seller");
        }
        if (_side == Sides.SHORT) {
            require(s.shortUser == address(0));
            require(s.longUser != msg.sender, "users is already buyer");
        }

        // receive collateral
        t.collateral.transferFrom(
            msg.sender, address(this), _side == Sides.LONG ? t.longRequiredAmount : t.shortRequiredAmount
        );

        // save funding wallet
        if (_side == Sides.LONG) {
            s.longUser = msg.sender;
            s.longClaimed = false;
            s.longWithdrawn = false;
        }
        if (_side == Sides.SHORT) {
            s.shortUser = msg.sender;
            s.shortClaimed = false;
            s.shortWithdrawn = false;
        }

        emit TradeFunded(_tradeID, _side, msg.sender);
    }

    // withdraw
    function withdraw(uint256 _tradeID, Sides _side) external whenNotPaused {
        Trade storage t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        uint256 withdrawAmout = 0;

        // check if settle is not executed
        // (this is a double check, we're also checking that the other side is not funded and the settlement can be done only if both sides are funded)
        require(!t.settleExecuted, "settle already executed");
        if (_side == Sides.LONG) {
            // check if sender is the buyer
            require(s.longUser == msg.sender, "unknown user");
            // check if the seller side is not funded
            require(s.shortUser == address(0), "short side take, cannot withdraw");
            // check if the user already withdrawn
            require(!s.longWithdrawn, "already withdrawn");

            withdrawAmout = t.longRequiredAmount;
            s.longWithdrawn = true;
        }
        if (_side == Sides.SHORT) {
            // check if seller side is not funded
            require(s.longUser == address(0), "long side take, cannot withdraw");
            // check if the sender is the seller
            require(s.shortUser == msg.sender, "unknown user");
            // check if the user already withdrawn
            require(!s.shortWithdrawn, "already withdrawn");

            withdrawAmout = t.shortRequiredAmount;
            s.shortWithdrawn = true;
        }

        t.collateral.approve(address(this), withdrawAmout);
        t.collateral.transferFrom(address(this), msg.sender, withdrawAmout);

        emit TradeWithdrawn(_tradeID, _side);
    }

    // settle
    function settle(uint256 _tradeID) external whenNotPaused {
        Trade storage t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        // check if settle is available
        require(block.timestamp > t.settleStart, "settle not available yet");
        require(!t.settleExecuted, "settle already executed");

        // check if both sides are taken
        require(s.shortUser != address(0) && s.longUser != address(0));

        (uint256 longPnl, uint256 shortPnl) =
            t.payoffPool.execute(t.payoffID, t.longRequiredAmount, t.shortRequiredAmount);

        s.longPnl = longPnl;
        s.shortPnl = shortPnl;
        t.settleExecuted = true;

        emit TradeSettled(_tradeID, longPnl, shortPnl);
    }

    // claim
    function claim(uint256 _tradeID, Sides _side) external whenNotPaused {
        Trade storage t = trades[_tradeID];
        SettleData storage s = settleData[_tradeID];

        // check if settle is already been executed
        require(t.settleExecuted, "settle not executed yet");

        // check if the user is the side owner
        if (_side == Sides.LONG) {
            require(s.longUser == msg.sender, "unknown user");
            require(!s.longClaimed, "user already claimed");
        }
        if (_side == Sides.SHORT) {
            require(s.shortUser == msg.sender, "unknown user");
            require(!s.shortClaimed, "user already claimed");
        }

        // approve and transfer back collateral
        uint256 pnl = _side == Sides.LONG ? s.longPnl : s.shortPnl;
        t.collateral.approve(address(this), pnl);
        t.collateral.transferFrom(address(this), msg.sender, pnl);

        // remove user
        if (_side == Sides.LONG) {
            s.longClaimed = true;
        }
        if (_side == Sides.SHORT) {
            s.shortClaimed = true;
        }

        emit TradeClaimed(_tradeID, _side);
    }
}
