// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RecoverShipment} from "../src/RecoverShipment.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RecoverShipmentMockV2 is RecoverShipment {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract RecoverShipmentTest is Test {
    RecoverShipment public recoverShipment;
    address public proxyOwner;
    address public shipper;
    address public handler;
    address public recipient;
    uint256 public backendPrivateKey;
    address public backendSigner;

    bytes32 public constant TEST_PACKAGE_ID = keccak256("PKG-12345");
    string public constant TEST_SECRET = "SECRET-CODE-999";
    bytes32 public TEST_PACKAGE_HASH;

    function setUp() public {
        proxyOwner = address(this);
        shipper = address(0x1);
        handler = address(0x2);
        recipient = address(0x3);
        backendPrivateKey = 0xBEAF;
        backendSigner = vm.addr(backendPrivateKey);

        TEST_PACKAGE_HASH = keccak256(abi.encodePacked(TEST_PACKAGE_ID, TEST_SECRET));

        // Deploy implementation
        RecoverShipment impl = new RecoverShipment();

        // Encode initializer
        bytes memory initData = abi.encodeWithSelector(RecoverShipment.initialize.selector, backendSigner);

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        // Wrap proxy in implementation interface
        recoverShipment = RecoverShipment(address(proxy));
    }

    // --- Helper Functions to Generate Signatures ---

    function getRegisterSignature(
        address shipperAddr,
        bytes32 packageId,
        bytes32 packageHash,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                shipperAddr, packageId, packageHash, nonce, deadline, block.chainid, address(recoverShipment)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function getHandoverSignature(
        address operatorAddr,
        bytes32 packageId,
        address nextHandler,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                operatorAddr, packageId, nextHandler, nonce, deadline, block.chainid, address(recoverShipment)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function getVerifySignature(
        address callerAddr,
        bytes32 packageId,
        string memory innerSecret,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                callerAddr,
                packageId,
                keccak256(bytes(innerSecret)),
                nonce,
                deadline,
                block.chainid,
                address(recoverShipment)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function getDisputeSignature(
        address callerAddr,
        bytes32 packageId,
        string memory reason,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                callerAddr,
                packageId,
                keccak256(bytes(reason)),
                nonce,
                deadline,
                block.chainid,
                address(recoverShipment)
            )
        );
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendPrivateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // --- Tests ---

    function test_Initialize() public view {
        assertEq(recoverShipment.backendSigner(), backendSigner);
        assertEq(recoverShipment.owner(), proxyOwner);
    }

    function test_RegisterShipment_Success() public {
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);

        RecoverShipment.Shipment memory s = recoverShipment.getShipment(TEST_PACKAGE_ID);
        assertEq(s.packageId, TEST_PACKAGE_ID);
        assertEq(s.packageHash, TEST_PACKAGE_HASH);
        assertEq(s.shipper, shipper);
        assertEq(uint8(s.status), uint8(RecoverShipment.Status.Created));
    }

    function test_RegisterShipment_RevertIfExpired() public {
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp - 1;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        vm.expectRevert(RecoverShipment.SignatureExpired.selector);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);
    }

    function test_LogHandover_Success() public {
        // Register first
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);

        // Handover
        uint256 handlerNonce = recoverShipment.userNonces(shipper);
        bytes memory handoverSig = getHandoverSignature(shipper, TEST_PACKAGE_ID, handler, handlerNonce, deadline);

        vm.prank(shipper);
        recoverShipment.logHandover(TEST_PACKAGE_ID, handler, deadline, handoverSig);

        RecoverShipment.Shipment memory s = recoverShipment.getShipment(TEST_PACKAGE_ID);
        assertEq(s.currentHandler, handler);
        assertEq(uint8(s.status), uint8(RecoverShipment.Status.InTransit));
    }

    function test_VerifyDelivery_Success() public {
        // Register
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);

        // Handover to handler
        uint256 handoverNonce = recoverShipment.userNonces(shipper);
        bytes memory handoverSig = getHandoverSignature(shipper, TEST_PACKAGE_ID, handler, handoverNonce, deadline);
        vm.prank(shipper);
        recoverShipment.logHandover(TEST_PACKAGE_ID, handler, deadline, handoverSig);

        // Recipient verifies delivery
        uint256 recipientNonce = recoverShipment.userNonces(recipient);
        bytes memory verifySig = getVerifySignature(recipient, TEST_PACKAGE_ID, TEST_SECRET, recipientNonce, deadline);

        vm.prank(recipient);
        recoverShipment.verifyDelivery(TEST_PACKAGE_ID, TEST_SECRET, deadline, verifySig);

        RecoverShipment.Shipment memory s = recoverShipment.getShipment(TEST_PACKAGE_ID);
        assertEq(uint8(s.status), uint8(RecoverShipment.Status.Verified));
    }

    function test_VerifyDelivery_RevertIfInvalidSecret() public {
        // Register
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);

        // Recipient tries to verify with incorrect secret
        uint256 recipientNonce = recoverShipment.userNonces(recipient);
        bytes memory verifySig =
            getVerifySignature(recipient, TEST_PACKAGE_ID, "WRONG-SECRET", recipientNonce, deadline);

        vm.prank(recipient);
        vm.expectRevert(RecoverShipment.InvalidSecret.selector);
        recoverShipment.verifyDelivery(TEST_PACKAGE_ID, "WRONG-SECRET", deadline, verifySig);
    }

    function test_DisputeDelivery_Success() public {
        // Register
        uint256 nonce = recoverShipment.userNonces(shipper);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = getRegisterSignature(shipper, TEST_PACKAGE_ID, TEST_PACKAGE_HASH, nonce, deadline);

        vm.prank(shipper);
        recoverShipment.registerShipment(TEST_PACKAGE_ID, TEST_PACKAGE_HASH, deadline, signature);

        // Dispute
        string memory reason = "Tamper sticker broken!";
        uint256 disputeNonce = recoverShipment.userNonces(recipient);
        bytes memory disputeSig = getDisputeSignature(recipient, TEST_PACKAGE_ID, reason, disputeNonce, deadline);

        vm.prank(recipient);
        recoverShipment.disputeDelivery(TEST_PACKAGE_ID, reason, deadline, disputeSig);

        RecoverShipment.Shipment memory s = recoverShipment.getShipment(TEST_PACKAGE_ID);
        assertEq(uint8(s.status), uint8(RecoverShipment.Status.Disputed));
    }
}
