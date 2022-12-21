// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

import "./payoff/IPayoffPlugin.sol";

/// @custom:security-contact info@vyperprotocol.io
contract VyperOTC is ERC1155, ERC1155Supply {

    enum Sides {
        Long,
        Short
    }

    /** storage */

    IERC20 public immutable collateral;
    IPayoffPlugin public immutable payoff;
    uint public immutable depositStart;
    uint public immutable depositEnd;
    uint public immutable settleStart;
    mapping(Sides => uint256) public requiredAmount;
    mapping(Sides => uint256) public pnl;
    bool public settleExecuted = false;

    /** constructor */

    constructor(
        IERC20 _collateral,
        IPayoffPlugin _payoff,
        uint _depositStart,
        uint _depositEnd,
        uint _settleStart,
        uint256 _longRequiredAmount,
        uint256 _shortRequiredAmount
        ) ERC1155("") {
        
        require(_depositStart < block.timestamp && block.timestamp < _depositEnd, "deposit is closed");

        collateral = _collateral;
        payoff = _payoff;
        depositStart = _depositStart;
        depositEnd = _depositEnd;
        settleStart = _settleStart;
        requiredAmount[Sides.Long] = _longRequiredAmount;
        requiredAmount[Sides.Short] =_shortRequiredAmount;
    }

    
    /** methods */

    // deposit
    function deposit(Sides side) external {
        console.log("deposit invoked");
        // console.log("depositStart:      %s", depositStart);
        // console.log("block.timestamp:   %s", block.timestamp);
        // console.log("depositEnd:        %s", depositEnd);

        // check if deposit is allowed
        require(depositStart < block.timestamp && block.timestamp < depositEnd, "deposit is closed");

        // check if side is not already taken
        require(!isSideTaken(side), "side already taken");

        // receive collateral
        collateral.transferFrom(msg.sender, address(this), requiredAmount[side]);

        // mint position nft
        _mint(msg.sender, uint256(side), 1, "");
    }

    // TODO withdraw
    
    // settle
    function settle() external {
        console.log("settle invoked");
        // console.log("block.timestamp:    %s", block.timestamp);
        // console.log("settleStart:        %s", settleStart);

        // check if settle is available
        require(block.timestamp > settleStart, "settle not available yet");

        // check if settle is not already been executed
        require((pnl[Sides.Long] + pnl[Sides.Short]) == 0, "settle already executed");

        // check if both sides are taken
        require(isSideTaken(Sides.Long) && isSideTaken(Sides.Short), "at least one side is not taken");

        (pnl[Sides.Long], pnl[Sides.Short]) = payoff.execute(requiredAmount[Sides.Long], requiredAmount[Sides.Short]);
        console.log("+ longPnl: %s", pnl[Sides.Long]);
        console.log("+ shortPnl: %s", pnl[Sides.Short]);

        settleExecuted = true;
    }
    
    // claim
    function claim() external {
        console.log("claim invoked");

        // check if settle is already been executed
        require(settleExecuted, "settle not executed yet");

        // check msg.sender is buyer of seller
        Sides senderSide = getAddressSide(msg.sender);

        // burn position nft
        _burn(msg.sender, uint256(senderSide), 1);
    
        // approve and transfer back collateral
        collateral.approve(address(this), pnl[senderSide]);
        collateral.transferFrom(address(this), msg.sender, pnl[senderSide]);
    }

    function pnlOf(Sides _side) external view returns (uint256) {
        return pnl[_side];
    }

    function isNoSideTaken() private view returns (bool) {
        return !isSideTaken(Sides.Long) && !isSideTaken(Sides.Short);
    }

    function isSideTaken(Sides side) private view returns (bool) {
        return exists(uint256(side));
    }

    function getAddressSide(address account) private view returns (Sides) {
        if(balanceOf(account, uint256(Sides.Long)) == 1) return Sides.Long;
        if(balanceOf(account, uint256(Sides.Short)) == 1) return Sides.Short;
        console.log("no side taken for account %s", account);
        revert("no side taken");
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

}



