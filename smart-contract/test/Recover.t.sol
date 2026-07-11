// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {Recover} from "../src/Recover.sol";

contract RecoverTest is Test {
    Recover public recover;
    address public owner;
    address public user;
    bytes32 public constant TEST_HASH = keccak256("test-item-metadata-hash");

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        recover = new Recover();
    }

    // --- 1. Initial State Tests ---

    function test_InitialState() public view {
        // We verify that checking a non-existent item reverts with ItemNotFound
        // (This implicitly tests that _nextRegistrationId starts at 1, so ID 1 reverts)
    }

    // --- 2. Register Item Tests ---

    function test_RegisterItem() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        assertEq(id, 1);

        Recover.Item memory item = recover.getItem(id);
        assertEq(item.registrationId, 1);
        assertEq(item.owner, user);
        assertEq(uint8(item.status), uint8(Recover.Status.Active));
        assertEq(item.registeredAt, block.timestamp);
        assertEq(item.lastUpdated, block.timestamp);
        assertEq(item.itemHash, TEST_HASH);
    }

    function test_RegisterItemEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit Recover.ItemRegistered(1, user, TEST_HASH, block.timestamp);

        vm.prank(user);
        recover.registerItem(TEST_HASH);
    }

    function test_RegisterItem_InvalidHash() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Recover.InvalidItemHash.selector));
        recover.registerItem(bytes32(0));
    }

    // --- 3. Mark Lost Tests ---

    function test_MarkLost() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        // Advance time to verify lastUpdated is updated
        vm.warp(block.timestamp + 100);

        vm.prank(user);
        recover.markLost(id);

        Recover.Item memory item = recover.getItem(id);
        assertEq(uint8(item.status), uint8(Recover.Status.Lost));
        assertEq(item.lastUpdated, block.timestamp);
    }

    function test_MarkLostEmitsEvent() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.warp(block.timestamp + 100);

        vm.expectEmit(true, false, false, true);
        emit Recover.ItemMarkedLost(id, block.timestamp);

        vm.prank(user);
        recover.markLost(id);
    }

    function test_MarkLost_NotOwner() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.prank(address(0x2));
        vm.expectRevert(abi.encodeWithSelector(Recover.NotItemOwner.selector, id, address(0x2)));
        recover.markLost(id);
    }

    function test_MarkLost_AlreadyLost() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.prank(user);
        recover.markLost(id);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                Recover.InvalidStatusTransition.selector, id, Recover.Status.Lost, Recover.Status.Lost
            )
        );
        recover.markLost(id);
    }

    // --- 4. Mark Recovered Tests ---

    function test_MarkRecovered() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.prank(user);
        recover.markLost(id);

        vm.warp(block.timestamp + 100);

        vm.prank(user);
        recover.markRecovered(id);

        Recover.Item memory item = recover.getItem(id);
        assertEq(uint8(item.status), uint8(Recover.Status.Recovered));
        assertEq(item.lastUpdated, block.timestamp);
    }

    function test_MarkRecoveredEmitsEvent() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.prank(user);
        recover.markLost(id);

        vm.warp(block.timestamp + 100);

        vm.expectEmit(true, false, false, true);
        emit Recover.ItemRecovered(id, block.timestamp);

        vm.prank(user);
        recover.markRecovered(id);
    }

    function test_MarkRecovered_NotOwner() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        vm.prank(user);
        recover.markLost(id);

        vm.prank(address(0x2));
        vm.expectRevert(abi.encodeWithSelector(Recover.NotItemOwner.selector, id, address(0x2)));
        recover.markRecovered(id);
    }

    function test_MarkRecovered_NotLost() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        // Item is Active, cannot mark as Recovered
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                Recover.InvalidStatusTransition.selector, id, Recover.Status.Active, Recover.Status.Recovered
            )
        );
        recover.markRecovered(id);
    }

    // --- 5. Transition from Recovered directly to Lost (Option A) ---

    function test_MarkLost_FromRecovered() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        // Transition: Active -> Lost
        vm.prank(user);
        recover.markLost(id);

        // Transition: Lost -> Recovered
        vm.prank(user);
        recover.markRecovered(id);

        // Transition: Recovered -> Lost (directly)
        vm.warp(block.timestamp + 100);
        vm.prank(user);
        recover.markLost(id);

        Recover.Item memory item = recover.getItem(id);
        assertEq(uint8(item.status), uint8(Recover.Status.Lost));
        assertEq(item.lastUpdated, block.timestamp);
    }

    // --- 6. Get/Verify Item Edge Cases ---

    function test_GetItem_NotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Recover.ItemNotFound.selector, 0));
        recover.getItem(0);

        vm.expectRevert(abi.encodeWithSelector(Recover.ItemNotFound.selector, 1));
        recover.getItem(1);
    }

    function test_VerifyItem_NotFound() public {
        vm.expectRevert(abi.encodeWithSelector(Recover.ItemNotFound.selector, 0));
        recover.verifyItem(0);

        vm.expectRevert(abi.encodeWithSelector(Recover.ItemNotFound.selector, 1));
        recover.verifyItem(1);
    }

    function test_VerifyItem_HappyPath() public {
        vm.prank(user);
        uint256 id = recover.registerItem(TEST_HASH);

        Recover.Item memory item = recover.verifyItem(id);
        assertEq(item.registrationId, id);
        assertEq(item.owner, user);
        assertEq(item.itemHash, TEST_HASH);
    }
}
