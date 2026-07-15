// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Recover} from "../src/Recover.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RecoverMockV2 is Recover {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract RecoverTest is Test {
    Recover public recover;
    address public proxyOwner;
    address public user;
    uint256 public backendPrivateKey;
    address public backendSigner;
    bytes32 public constant TEST_HASH = keccak256("test-item-metadata-hash");

    function setUp() public {
        proxyOwner = address(this);
        user = address(0x1);
        backendPrivateKey = 0xBEAF;
        backendSigner = vm.addr(backendPrivateKey);

        // Deploy implementation
        Recover impl = new Recover();

        // Encode initializer
        bytes memory initData = abi.encodeWithSelector(Recover.initialize.selector, backendSigner);

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        // Wrap proxy in implementation interface
        recover = Recover(address(proxy));
    }

    // --- Helper Functions to Generate Signatures ---

    function getRegisterSignature(
        address ownerAddr,
        bytes32 itemHash,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                ownerAddr,
                itemHash,
                nonce,
                deadline,
                block.chainid,
                address(recover)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function getStatusSignature(
        uint256 registrationId,
        Recover.Status status,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                registrationId,
                uint8(status),
                nonce,
                deadline,
                block.chainid,
                address(recover)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // --- 1. Initial State & Proxy Config Tests ---

    function test_Initialize() public view {
        assertEq(recover.backendSigner(), backendSigner);
        assertEq(recover.owner(), proxyOwner);
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        recover.initialize(address(0x9));
    }

    // --- 2. Register Item Tests ---

    function test_RegisterItem_Success() public {
        uint256 nonce = recover.userNonces(user);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(user, TEST_HASH, nonce, deadline);

        uint256 id = recover.registerItem(user, TEST_HASH, deadline, signature);

        assertEq(id, 1);
        assertEq(recover.userNonces(user), nonce + 1);

        Recover.Item memory item = recover.getItem(id);
        assertEq(item.registrationId, 1);
        assertEq(item.owner, user);
        assertEq(uint8(item.status), uint8(Recover.Status.Active));
        assertEq(item.registeredAt, block.timestamp);
        assertEq(item.lastUpdated, block.timestamp);
        assertEq(item.itemHash, TEST_HASH);
    }

    function test_RegisterItem_InvalidSignature() public {
        uint256 nonce = recover.userNonces(user);
        uint256 deadline = block.timestamp + 1 hours;

        // Generate signature with another private key
        bytes32 messageHash = keccak256(
            abi.encodePacked(user, TEST_HASH, nonce, deadline, block.chainid, address(recover))
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xFA15, ethSignedMessageHash);
        bytes memory badSignature = abi.encodePacked(r, s, v);

        vm.expectRevert(abi.encodeWithSelector(Recover.InvalidSignature.selector));
        recover.registerItem(user, TEST_HASH, deadline, badSignature);
    }

    function test_RegisterItem_ExpiredSignature() public {
        uint256 nonce = recover.userNonces(user);
        uint256 deadline = block.timestamp - 1; // Expired
        bytes memory signature = getRegisterSignature(user, TEST_HASH, nonce, deadline);

        vm.expectRevert(abi.encodeWithSelector(Recover.SignatureExpired.selector));
        recover.registerItem(user, TEST_HASH, deadline, signature);
    }

    function test_RegisterItem_ReplayReverts() public {
        uint256 nonce = recover.userNonces(user);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(user, TEST_HASH, nonce, deadline);

        // First registration succeeds
        recover.registerItem(user, TEST_HASH, deadline, signature);

        // Replaying same signature reverts (nonce is now incremented on-chain)
        vm.expectRevert(abi.encodeWithSelector(Recover.InvalidSignature.selector));
        recover.registerItem(user, TEST_HASH, deadline, signature);
    }

    // --- 3. Mark Lost Tests ---

    function test_MarkLost_Success() public {
        // Register item first
        uint256 regNonce = recover.userNonces(user);
        uint256 regDeadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(user, TEST_HASH, regNonce, regDeadline);
        uint256 id = recover.registerItem(user, TEST_HASH, regDeadline, regSig);

        vm.warp(block.timestamp + 100);

        // Mark lost signature
        uint256 lostNonce = recover.userNonces(user);
        uint256 lostDeadline = block.timestamp + 1 hours;
        bytes memory lostSig = getStatusSignature(id, Recover.Status.Lost, lostNonce, lostDeadline);

        recover.markLost(id, lostDeadline, lostSig);

        Recover.Item memory item = recover.getItem(id);
        assertEq(uint8(item.status), uint8(Recover.Status.Lost));
        assertEq(item.lastUpdated, block.timestamp);
        assertEq(recover.userNonces(user), lostNonce + 1);
    }

    function test_MarkLost_AlreadyLostReverts() public {
        uint256 regNonce = recover.userNonces(user);
        uint256 regDeadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(user, TEST_HASH, regNonce, regDeadline);
        uint256 id = recover.registerItem(user, TEST_HASH, regDeadline, regSig);

        uint256 lostNonce = recover.userNonces(user);
        uint256 lostDeadline = block.timestamp + 1 hours;
        bytes memory lostSig = getStatusSignature(id, Recover.Status.Lost, lostNonce, lostDeadline);

        recover.markLost(id, lostDeadline, lostSig);

        // Generate new signature for Lost status
        uint256 lostNonce2 = recover.userNonces(user);
        bytes memory lostSig2 = getStatusSignature(id, Recover.Status.Lost, lostNonce2, lostDeadline);

        vm.expectRevert(
            abi.encodeWithSelector(
                Recover.InvalidStatusTransition.selector, id, Recover.Status.Lost, Recover.Status.Lost
            )
        );
        recover.markLost(id, lostDeadline, lostSig2);
    }

    // --- 4. Mark Recovered Tests ---

    function test_MarkRecovered_Success() public {
        // Register item
        uint256 regNonce = recover.userNonces(user);
        uint256 regDeadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(user, TEST_HASH, regNonce, regDeadline);
        uint256 id = recover.registerItem(user, TEST_HASH, regDeadline, regSig);

        // Mark Lost
        uint256 lostNonce = recover.userNonces(user);
        uint256 lostDeadline = block.timestamp + 1 hours;
        bytes memory lostSig = getStatusSignature(id, Recover.Status.Lost, lostNonce, lostDeadline);
        recover.markLost(id, lostDeadline, lostSig);

        vm.warp(block.timestamp + 100);

        // Mark Recovered
        uint256 recNonce = recover.userNonces(user);
        uint256 recDeadline = block.timestamp + 1 hours;
        bytes memory recSig = getStatusSignature(id, Recover.Status.Recovered, recNonce, recDeadline);

        recover.markRecovered(id, recDeadline, recSig);

        Recover.Item memory item = recover.getItem(id);
        assertEq(uint8(item.status), uint8(Recover.Status.Recovered));
        assertEq(item.lastUpdated, block.timestamp);
    }

    function test_MarkRecovered_NotLostReverts() public {
        uint256 regNonce = recover.userNonces(user);
        uint256 regDeadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(user, TEST_HASH, regNonce, regDeadline);
        uint256 id = recover.registerItem(user, TEST_HASH, regDeadline, regSig);

        // Item is currently Active (not Lost). Trying to mark as Recovered should revert.
        uint256 recNonce = recover.userNonces(user);
        uint256 recDeadline = block.timestamp + 1 hours;
        bytes memory recSig = getStatusSignature(id, Recover.Status.Recovered, recNonce, recDeadline);

        vm.expectRevert(
            abi.encodeWithSelector(
                Recover.InvalidStatusTransition.selector, id, Recover.Status.Active, Recover.Status.Recovered
            )
        );
        recover.markRecovered(id, recDeadline, recSig);
    }

    // --- 5. Owner Actions & Setters Tests ---

    function test_SetBackendSigner_OwnerOnly() public {
        address newSigner = address(0x9);

        // Non-owner call reverts
        vm.prank(user);
        vm.expectRevert();
        recover.setBackendSigner(newSigner);

        // Owner call succeeds
        recover.setBackendSigner(newSigner);
        assertEq(recover.backendSigner(), newSigner);
    }

    function test_SetBackendSigner_InvalidAddress() public {
        vm.expectRevert(abi.encodeWithSelector(Recover.InvalidBackendSigner.selector));
        recover.setBackendSigner(address(0));
    }

    // --- 6. UUPS Upgradeability Verification ---

    function test_UpgradeToV2_OwnerOnly() public {
        RecoverMockV2 v2Impl = new RecoverMockV2();

        // Non-owner cannot upgrade proxy
        vm.prank(user);
        vm.expectRevert();
        recover.upgradeToAndCall(address(v2Impl), "");

        // Owner upgrades proxy
        recover.upgradeToAndCall(address(v2Impl), "");

        // Cast proxy handle to MockV2 to access version() view
        RecoverMockV2 upgradedRecover = RecoverMockV2(address(recover));
        assertEq(upgradedRecover.version(), "v2");
    }

    function test_UpgradePreservesState() public {
        // Register an item before upgrade
        uint256 regNonce = recover.userNonces(user);
        uint256 regDeadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(user, TEST_HASH, regNonce, regDeadline);
        uint256 id = recover.registerItem(user, TEST_HASH, regDeadline, regSig);

        // Upgrade implementation
        RecoverMockV2 v2Impl = new RecoverMockV2();
        recover.upgradeToAndCall(address(v2Impl), "");

        // State validation post-upgrade
        RecoverMockV2 upgradedRecover = RecoverMockV2(address(recover));
        Recover.Item memory item = upgradedRecover.getItem(id);

        assertEq(item.registrationId, id);
        assertEq(item.owner, user);
        assertEq(item.itemHash, TEST_HASH);
        assertEq(upgradedRecover.userNonces(user), regNonce + 1);
        assertEq(upgradedRecover.backendSigner(), backendSigner);
    }
}
