// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./payoff/IPayoffPlugin.sol";

/// @custom:security-contact info@vyperprotocol.io
contract VyperOTC {

    enum Sides {
        LONG,
        SHORT
    }

    /** storage */

    IERC20 public immutable collateral;
    IPayoffPlugin public immutable payoff;
    uint public immutable depositStart;
    uint public immutable depositEnd;
    uint public immutable settleStart;
    mapping(Sides => address) public users;
    mapping(Sides => uint256) public requiredAmount;
    mapping(Sides => uint256) public pnl;
    
    /** constructor */

    constructor(
        IERC20 _collateral,
        IPayoffPlugin _payoff,
        uint _depositStart,
        uint _depositEnd,
        uint _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
        ) {
        
        require(_longRequiredAmount + _shortRequiredAmount > 0, "invalid required amounts");

        collateral = _collateral;
        payoff = _payoff;
        depositStart = _depositStart;
        depositEnd = _depositEnd;
        settleStart = _settleStart;
        requiredAmount[Sides.LONG] = _longRequiredAmount;
        requiredAmount[Sides.SHORT] =_shortRequiredAmount;
    }

    
    /** methods */

    // deposit
    function deposit(Sides _side) external {
        console.log("deposit invoked");

        // check if deposit is allowed
        require(depositStart < block.timestamp && block.timestamp < depositEnd, "deposit is closed");

        // check if side is not already taken
        require(!isSideTaken(_side), "side already taken");

        // check if users is already on the other side
        if(_side == Sides.LONG) require(users[Sides.SHORT] != msg.sender, "users is already seller");
        if(_side == Sides.SHORT) require(users[Sides.LONG] != msg.sender, "users is already buyer");

        // receive collateral
        collateral.transferFrom(msg.sender, address(this), requiredAmount[_side]);

        // mint position nft
        users[_side] = msg.sender;
    }

    // TODO withdraw
    
    // settle
    function settle() external {
        console.log("settle invoked");

        // check if settle is available
        require(block.timestamp > settleStart, "settle not available yet");

        // check if settle is not already been executed
        require(!isSettleExecuted(), "settle already executed");

        // check if both sides are taken
        require(isSideTaken(Sides.LONG) && isSideTaken(Sides.SHORT), "at least one side is not taken");

        (pnl[Sides.LONG], pnl[Sides.SHORT]) = payoff.execute(requiredAmount[Sides.LONG], requiredAmount[Sides.SHORT]);
        console.log("+ long pnl: %s", pnl[Sides.LONG]);
        console.log("+ short pnl: %s", pnl[Sides.SHORT]);
    }
    
    // claim
    function claim() external {
        console.log("claim invoked");

        // check if settle is already been executed
        require(isSettleExecuted(), "settle not executed yet");

        // check msg.sender is buyer of seller
        Sides senderSide = getAddressSide(msg.sender);

        // burn position nft
        users[senderSide] = address(0);
    
        // approve and transfer back collateral
        collateral.approve(address(this), pnl[senderSide]);
        collateral.transferFrom(address(this), msg.sender, pnl[senderSide]);
    }

    function isSettleExecuted() public view returns (bool) {
        return (pnl[Sides.LONG] + pnl[Sides.SHORT]) == (requiredAmount[Sides.LONG] + requiredAmount[Sides.SHORT]);
    }

    function pnlOf(Sides _side) public view returns (uint256) {
        return pnl[_side];
    }

    function isNoSideTaken() public view returns (bool) {
        return !isSideTaken(Sides.LONG) && !isSideTaken(Sides.SHORT);
    }

    function isSideTaken(Sides _side) public view returns (bool) {
        return users[_side] != address(0);
    }

    function getAddressSide(address _account) public view returns (Sides) {
        if(users[Sides.LONG] == _account) return Sides.LONG;
        if(users[Sides.SHORT] == _account) return Sides.SHORT;
        console.log("no side taken for account %s", _account);
        revert("no side taken");
    }
}



