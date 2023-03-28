// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../../lib/forge-std/src/Test.sol";
import "../../../lib/forge-std/src/console.sol";
import "../../../contracts/v1/rate/ChainlinkAdapter.sol";
import "../../../contracts/v1/payoff/DigitalPayoffPool.sol";
import "../../../contracts/v1/TradePool.sol";
import "../../../contracts/v1/utils/ERC20Mock.sol";
import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

contract TradePoolTest is Test {
    address payable[] internal users;
    address internal chainlinkAggregator;
    address internal alice = address(uint160(uint256(keccak256(abi.encodePacked("alice")))));
    address internal bob = address(uint160(uint256(keccak256(abi.encodePacked("bob")))));

    ERC20Mock internal mockToken;
    AggregatorV3Interface internal mockChainlinkAggregator;
    ChainlinkAdapter internal chainlinkAdapter;
    DigitalPayoffPool internal payoffPool;
    TradePool public tradePool;

    function setUp() public {
        vm.label(alice, "alice");
        vm.label(bob, "bob");

        // create mock erc20 token
        mockToken =
            new ERC20Mock("VyperUSD", "vUSD", address(uint160(uint256(keccak256(abi.encodePacked("god"))))), 1000);

        // creating chainlink adapter over a chainlink mock aggregator
        chainlinkAdapter = new ChainlinkAdapter();
        mockChainlinkAggregator = new MockV3Aggregator(18, 1000);
        chainlinkAdapter.insertOracle(address(mockChainlinkAggregator));

        // creating digital payoff
        payoffPool = new DigitalPayoffPool();
        payoffPool.createDigitalPayoff(1000, true, chainlinkAdapter, 0);

        // crating TradePool
        tradePool = new TradePool();
    }

    function testCreateTrade(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        console.log("start test create trade");

        uint256 payoffID = 0;

        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );
        (
            IERC20 _collateral,
            uint88 _depositEnd,
            IPayoffPoolPlugin _payoffPool,
            uint88 _settleStart,
            bool _settleExecuted,
            uint256 _payoffID,
            uint256 _longRequiredAmount,
            uint256 _shortRequiredAmount
        ) = tradePool.trades(0);
        assertEq(address(_collateral), address(mockToken));
        assertEq(address(_payoffPool), address(payoffPool));
        assertEq(_payoffID, payoffID);
        assertEq(_settleExecuted, false);
        assertEq(_depositEnd, depositEnd);
        assertEq(_settleStart, settleStart);
        assertEq(_longRequiredAmount, longRequiredAmount);
        assertEq(_shortRequiredAmount, shortRequiredAmount);
    }

    function testTradeFlow(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        // alice deposits as long
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);

        // bob deposits as short
        vm.prank(bob);
        mockToken.approve(address(tradePool), shortRequiredAmount);
        vm.prank(bob);
        tradePool.deposit(0, TradePool.Sides.SHORT);

        // check current settle data
        {
            (
                address _longUser,
                bool _longClaimed,
                bool _longWithdrawn,
                address _shortUser,
                bool _shortClaimed,
                bool _shortWithdrawn,
                uint256 _longPnl,
                uint256 _shortPnl
            ) = tradePool.settleData(0);

            assertEq(_longUser, alice, "alice is long user");
            assertEq(_longClaimed, false, "long is not claimed");
            assertEq(_longWithdrawn, false, "long is not withdrawn");
            assertEq(_shortUser, bob, "bob is short user");
            assertEq(_shortClaimed, false, "short is not claimed");
            assertEq(_shortWithdrawn, false, "short is not withdrawn");
            assertEq(_longPnl, 0, "long pnl is zero");
            assertEq(_shortPnl, 0, "long pnl is zero");
        }

        // time travel to settle moment
        vm.warp(settleStart + 1);

        // settle trade
        tradePool.settle(0);

        // check current settle data
        {
            (
                address _longUser,
                bool _longClaimed,
                bool _longWithdrawn,
                address _shortUser,
                bool _shortClaimed,
                bool _shortWithdrawn,
                uint256 _longPnl,
                uint256 _shortPnl
            ) = tradePool.settleData(0);

            assertEq(_longUser, alice, "alice is long user");
            assertEq(_longClaimed, false, "long is not claimed");
            assertEq(_longWithdrawn, false, "long is not withdrawn");
            assertEq(_shortUser, bob, "bob is short user");
            assertEq(_shortClaimed, false, "short is not claimed");
            assertEq(_shortWithdrawn, false, "short is not withdrawn");
            assertGe(_longPnl, 0, "long pnl is ge zero");
            assertGe(_shortPnl, 0, "long pnl is ge zero");
        }

        // alice claim assets
        vm.prank(alice);
        tradePool.claim(0, TradePool.Sides.LONG);

        // bob deposits as short
        vm.prank(bob);
        tradePool.claim(0, TradePool.Sides.SHORT);

        // check current settle data
        {
            (
                address _longUser,
                bool _longClaimed,
                bool _longWithdrawn,
                address _shortUser,
                bool _shortClaimed,
                bool _shortWithdrawn,
                uint256 _longPnl,
                uint256 _shortPnl
            ) = tradePool.settleData(0);

            assertEq(_longUser, alice, "alice is long user");
            assertEq(_longClaimed, true, "long is claimed");
            assertEq(_longWithdrawn, false, "long is not withdrawn");
            assertEq(_shortUser, bob, "bob is short user");
            assertEq(_shortClaimed, true, "short is claimed");
            assertEq(_shortWithdrawn, false, "short is not withdrawn");
            assertGe(_longPnl, 0, "long pnl is ge zero");
            assertGe(_shortPnl, 0, "long pnl is ge zero");
        }
    }

    function testWithdraw(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        // alice deposits as long
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);

        // bob doesn't deposits

        // check current settle data
        {
            (
                address _longUser,
                bool _longClaimed,
                bool _longWithdrawn,
                address _shortUser,
                bool _shortClaimed,
                bool _shortWithdrawn,
                uint256 _longPnl,
                uint256 _shortPnl
            ) = tradePool.settleData(0);

            assertEq(_longUser, alice, "alice is long user");
            assertEq(_longClaimed, false, "long is not claimed");
            assertEq(_longWithdrawn, false, "long is not withdrawn");
            assertEq(_shortUser, address(0), "nobody is short user");
            assertEq(_shortClaimed, false, "short is not claimed");
            assertEq(_shortWithdrawn, false, "short is not withdrawn");
            assertEq(_longPnl, 0, "long pnl is zero");
            assertEq(_shortPnl, 0, "long pnl is zero");
        }

        // time travel to settle moment
        vm.warp(settleStart + 1);

        // alice withdraw trade
        vm.prank(alice);
        tradePool.withdraw(0, TradePool.Sides.LONG);

        // check current settle data
        {
            (
                address _longUser,
                bool _longClaimed,
                bool _longWithdrawn,
                address _shortUser,
                bool _shortClaimed,
                bool _shortWithdrawn,
                uint256 _longPnl,
                uint256 _shortPnl
            ) = tradePool.settleData(0);

            assertEq(_longUser, alice, "alice is long user");
            assertEq(_longClaimed, false);
            assertEq(_longWithdrawn, true);
            assertEq(_shortUser, address(0));
            assertEq(_shortClaimed, false);
            assertEq(_shortWithdrawn, false);
            assertEq(_longPnl, 0);
            assertEq(_shortPnl, 0);
        }
    }

    function testFailDoubleWithdraw(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        // alice deposits as long
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);

        // bob doesn't deposits

        // time travel to settle moment
        vm.warp(settleStart + 1);

        // alice withdraw trade
        vm.prank(alice);
        tradePool.withdraw(0, TradePool.Sides.LONG);

        // alice try to withdraw multiple times
        vm.prank(alice);
        tradePool.withdraw(0, TradePool.Sides.LONG);
    }

    function testFailDoubleClaim(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        // alice deposits as long
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);

        // bob doesn't deposits
        vm.prank(bob);
        mockToken.approve(address(tradePool), shortRequiredAmount);
        vm.prank(bob);
        tradePool.deposit(0, TradePool.Sides.SHORT);

        // time travel to settle moment
        vm.warp(settleStart + 1);

        tradePool.settle(0);

        // alice claim trade
        vm.prank(alice);
        tradePool.claim(0, TradePool.Sides.LONG);

        // alice tries to claim multiple times
        vm.prank(alice);
        tradePool.claim(0, TradePool.Sides.LONG);
    }

    function testFailWithdrawOnBothSidesFunded(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        // alice deposits as long
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);

        // bob doesn't deposits
        vm.prank(bob);
        mockToken.approve(address(tradePool), shortRequiredAmount);
        vm.prank(bob);
        tradePool.deposit(0, TradePool.Sides.SHORT);

        // alice tries to withdraw trade
        vm.prank(alice);
        tradePool.withdraw(0, TradePool.Sides.LONG);
    }

    function testFailOnPausedPool(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        tradePool.pause();

        // alice tries to deposit on a paused pool
        vm.prank(alice);
        mockToken.approve(address(tradePool), longRequiredAmount);
        vm.prank(alice);
        tradePool.deposit(0, TradePool.Sides.LONG);
    }

    function testFailOnNonOwnerPoolPause(uint128 longRequiredAmount, uint128 shortRequiredAmount) public {
        vm.assume(longRequiredAmount > 0);
        vm.assume(shortRequiredAmount > 0);
        uint88 depositEnd = 1000;
        uint88 settleStart = 2000;

        // mint tokens to alice and bob
        mockToken.mint(alice, longRequiredAmount);
        mockToken.mint(bob, shortRequiredAmount);

        uint256 payoffID = 0;
        tradePool.createTrade(
            mockToken, payoffPool, payoffID, depositEnd, settleStart, longRequiredAmount, shortRequiredAmount
        );

        tradePool.pause();

        // alice tries to unpause pool
        vm.prank(alice);
        tradePool.unpause();
    }
}
