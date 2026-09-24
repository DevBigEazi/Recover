// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RecoverReceipt} from "../src/RecoverReceipt.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RecoverReceiptMockV2 is RecoverReceipt {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract RecoverReceiptTest is Test {
    RecoverReceipt public recoverReceipt;
    address public proxyOwner;
    address public merchant;
    address public otherUser;
    uint256 public backendPrivateKey;
    address public backendSigner;

    bytes32 public constant TEST_RECEIPT_HASH = keccak256("RCVR-REC-2026-0001");
    bytes32 public constant TEST_RECEIPT_HASH_2 = keccak256("RCVR-REC-2026-0002");

    function setUp() public {
        proxyOwner = address(this);
        merchant = address(0x11);
        otherUser = address(0x22);
        backendPrivateKey = 0xBEAF;
        backendSigner = vm.addr(backendPrivateKey);

        // Deploy implementation
        RecoverReceipt impl = new RecoverReceipt();

        // Encode initializer
        bytes memory initData = abi.encodeWithSelector(RecoverReceipt.initialize.selector, backendSigner);

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        // Wrap proxy in implementation interface
        recoverReceipt = RecoverReceipt(address(proxy));
    }

    // --- Signature Generation Helpers ---

    function getRegisterSignature(
        address merchantAddr,
        bytes32 receiptHash,
        bytes32 parentReceiptHash,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                merchantAddr, receiptHash, parentReceiptHash, nonce, deadline, block.chainid, address(recoverReceipt)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function getVoidSignature(
        address callerAddr,
        bytes32 receiptHash,
        string memory reason,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                callerAddr,
                receiptHash,
                keccak256(bytes(reason)),
                nonce,
                deadline,
                block.chainid,
                address(recoverReceipt)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // --- Tests ---

    function test_Initialize() public view {
        assertEq(recoverReceipt.owner(), proxyOwner);
        assertEq(recoverReceipt.backendSigner(), backendSigner);
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        recoverReceipt.initialize(backendSigner);
    }

    function test_RegisterReceipt_Success() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, sig);

        RecoverReceipt.ReceiptRecord memory record = recoverReceipt.getReceipt(TEST_RECEIPT_HASH);
        assertEq(record.receiptHash, TEST_RECEIPT_HASH);
        assertEq(record.parentReceiptHash, bytes32(0));
        assertEq(record.merchant, merchant);
        assertEq(uint8(record.status), uint8(RecoverReceipt.Status.Issued));
        assertEq(record.issuedAt, uint40(block.timestamp));
        assertEq(record.voidedAt, 0);
        assertEq(recoverReceipt.userNonces(merchant), 1);
    }

    function test_RegisterReceipt_RevertIfExpired() public {
        uint256 deadline = block.timestamp - 1;
        bytes memory sig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        vm.expectRevert(RecoverReceipt.SignatureExpired.selector);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, sig);
    }

    function test_RegisterReceipt_ZeroHashReverts() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = getRegisterSignature(merchant, bytes32(0), bytes32(0), 0, deadline);

        vm.prank(merchant);
        vm.expectRevert(RecoverReceipt.InvalidReceiptHash.selector);
        recoverReceipt.registerReceipt(bytes32(0), bytes32(0), deadline, sig);
    }

    function test_RegisterReceipt_InvalidSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        // Sign with a different key
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                merchant, TEST_RECEIPT_HASH, bytes32(0), uint256(0), deadline, block.chainid, address(recoverReceipt)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x9999, ethSignedMessageHash);
        bytes memory invalidSig = abi.encodePacked(r, s, v);

        vm.prank(merchant);
        vm.expectRevert(RecoverReceipt.InvalidSignature.selector);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, invalidSig);
    }

    function test_RegisterReceipt_ReplayReverts() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, sig);

        // Attempt to replay with same signature
        vm.prank(merchant);
        vm.expectRevert(RecoverReceipt.InvalidSignature.selector);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH_2, bytes32(0), deadline, sig);
    }

    function test_RegisterReceipt_AlreadyExists() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, sig);

        // Try registering exact same hash with new nonce
        bytes memory sig2 = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 1, deadline);
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(RecoverReceipt.ReceiptAlreadyExists.selector, TEST_RECEIPT_HASH));
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, sig2);
    }

    function test_RegisterReceipt_WithParentVoidedReceipt() public {
        // First register and void parent receipt
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        string memory voidReason = "Customer added another item";
        bytes memory voidSig = getVoidSignature(merchant, TEST_RECEIPT_HASH, voidReason, 1, deadline);

        vm.prank(merchant);
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, voidReason, deadline, voidSig);

        // Now register new receipt referencing the voided parent receipt
        bytes memory regSig2 = getRegisterSignature(merchant, TEST_RECEIPT_HASH_2, TEST_RECEIPT_HASH, 2, deadline);
        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH_2, TEST_RECEIPT_HASH, deadline, regSig2);

        RecoverReceipt.ReceiptRecord memory record2 = recoverReceipt.getReceipt(TEST_RECEIPT_HASH_2);
        assertEq(record2.parentReceiptHash, TEST_RECEIPT_HASH);
        assertEq(uint8(record2.status), uint8(RecoverReceipt.Status.Issued));
    }

    function test_RegisterReceipt_RevertIfParentNotVoided() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        // Try to reference parent receipt while it is still active (not voided)
        bytes memory regSig2 = getRegisterSignature(merchant, TEST_RECEIPT_HASH_2, TEST_RECEIPT_HASH, 1, deadline);
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(RecoverReceipt.InvalidParentReceipt.selector, TEST_RECEIPT_HASH));
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH_2, TEST_RECEIPT_HASH, deadline, regSig2);
    }

    function test_VoidReceipt_Success() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        string memory reason = "Wrong item entered";
        bytes memory voidSig = getVoidSignature(merchant, TEST_RECEIPT_HASH, reason, 1, deadline);

        vm.warp(block.timestamp + 10 minutes);
        vm.prank(merchant);
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, reason, deadline, voidSig);

        RecoverReceipt.ReceiptRecord memory record = recoverReceipt.getReceipt(TEST_RECEIPT_HASH);
        assertEq(uint8(record.status), uint8(RecoverReceipt.Status.Voided));
        assertEq(record.voidedAt, uint40(block.timestamp));
        assertEq(recoverReceipt.userNonces(merchant), 2);
    }

    function test_VoidReceipt_RevertIfAlreadyVoided() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        string memory reason = "Wrong price";
        bytes memory voidSig = getVoidSignature(merchant, TEST_RECEIPT_HASH, reason, 1, deadline);

        vm.prank(merchant);
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, reason, deadline, voidSig);

        // Try voiding again
        bytes memory voidSig2 = getVoidSignature(merchant, TEST_RECEIPT_HASH, reason, 2, deadline);
        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(RecoverReceipt.ReceiptAlreadyVoided.selector, TEST_RECEIPT_HASH));
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, reason, deadline, voidSig2);
    }

    function test_VoidReceipt_NonExistentReverts() public {
        uint256 deadline = block.timestamp + 1 hours;
        string memory reason = "Mistake";
        bytes memory voidSig = getVoidSignature(merchant, TEST_RECEIPT_HASH, reason, 0, deadline);

        vm.prank(merchant);
        vm.expectRevert(abi.encodeWithSelector(RecoverReceipt.ReceiptNotFound.selector, TEST_RECEIPT_HASH));
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, reason, deadline, voidSig);
    }

    function test_VoidReceipt_UnauthorizedCallerReverts() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        string memory reason = "Malicious void attempt";
        bytes memory voidSig = getVoidSignature(otherUser, TEST_RECEIPT_HASH, reason, 0, deadline);

        vm.prank(otherUser);
        vm.expectRevert(RecoverReceipt.UnauthorizedMerchant.selector);
        recoverReceipt.voidReceipt(TEST_RECEIPT_HASH, reason, deadline, voidSig);
    }

    function test_SetBackendSigner_OwnerOnly() public {
        address newSigner = address(0x99);

        // Non-owner reverts
        vm.prank(otherUser);
        vm.expectRevert();
        recoverReceipt.setBackendSigner(newSigner);

        // Owner succeeds
        vm.prank(proxyOwner);
        recoverReceipt.setBackendSigner(newSigner);
        assertEq(recoverReceipt.backendSigner(), newSigner);

        // Zero address reverts
        vm.prank(proxyOwner);
        vm.expectRevert(RecoverReceipt.InvalidBackendSigner.selector);
        recoverReceipt.setBackendSigner(address(0));
    }

    function test_UpgradePreservesState() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory regSig = getRegisterSignature(merchant, TEST_RECEIPT_HASH, bytes32(0), 0, deadline);

        vm.prank(merchant);
        recoverReceipt.registerReceipt(TEST_RECEIPT_HASH, bytes32(0), deadline, regSig);

        // Deploy V2
        RecoverReceiptMockV2 v2Impl = new RecoverReceiptMockV2();

        // Upgrade
        vm.prank(proxyOwner);
        recoverReceipt.upgradeToAndCall(address(v2Impl), "");

        // State is preserved
        RecoverReceipt.ReceiptRecord memory record = recoverReceipt.getReceipt(TEST_RECEIPT_HASH);
        assertEq(record.receiptHash, TEST_RECEIPT_HASH);
        assertEq(record.merchant, merchant);
        assertEq(uint8(record.status), uint8(RecoverReceipt.Status.Issued));
        assertEq(recoverReceipt.backendSigner(), backendSigner);

        // V2 function is callable
        RecoverReceiptMockV2 v2 = RecoverReceiptMockV2(address(recoverReceipt));
        assertEq(v2.version(), "v2");
    }

    function test_UpgradeToV2_OwnerOnly() public {
        RecoverReceiptMockV2 v2Impl = new RecoverReceiptMockV2();

        vm.prank(otherUser);
        vm.expectRevert();
        recoverReceipt.upgradeToAndCall(address(v2Impl), "");
    }
}
