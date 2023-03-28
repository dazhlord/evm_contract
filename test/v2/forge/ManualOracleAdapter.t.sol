// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../../../lib/forge-std/src/Test.sol";
import "../../../contracts/v2/oracle/ManualOracleAdapter.sol";
import "../../utils.sol";

contract ManualOracleAdapterTest is Test {
    uint8 constant ORACLE_DECIMALS = 3;

    address internal alice = address(uint160(uint256(keccak256(abi.encodePacked("alice")))));
    address internal bob = address(uint160(uint256(keccak256(abi.encodePacked("bob")))));

    ManualOracleAdapter internal oracle;

    function setUp() public {
        vm.label(alice, "alice");
        vm.label(bob, "bob");

        // set oracle price to 7.5 with 3 decimals precision
        oracle = new ManualOracleAdapter(stringToBytes32("test"), 7500, ORACLE_DECIMALS);
    }

    function testLivePrice(int256 newPrice) public {
        oracle.setLivePrice(newPrice);

        OracleAdapterSnapshot memory snapshot = oracle.getLatestPrice();
        assertEq(snapshot.price, newPrice);
        assertEq(snapshot.decimals, ORACLE_DECIMALS);
        // assertEq(snapshot.udpateAt, newPrice);
    }

    function testStalePrice(int256 newPrice, uint256 newUpdateAt) public {
        oracle.setStalePrice(newPrice, newUpdateAt);

        OracleAdapterSnapshot memory snapshot = oracle.getLatestPrice();
        assertEq(snapshot.price, newPrice);
        assertEq(snapshot.decimals, ORACLE_DECIMALS);
        assertEq(snapshot.updatedAt, newUpdateAt);
    }

    function testFail_onlyEditorCanUpdate() public {
        vm.prank(alice);
        // this fails
        oracle.setLivePrice(2);
    }

    function test_grantEditorROle() public {
        oracle.grantRole(keccak256("EDITOR_ROLE"), bob);

        oracle.setLivePrice(1);
        OracleAdapterSnapshot memory snapshot = oracle.getLatestPrice();
        assertEq(snapshot.price, 1);

        vm.prank(bob);
        oracle.setLivePrice(3);
        snapshot = oracle.getLatestPrice();
        assertEq(snapshot.price, 3);
    }
}
