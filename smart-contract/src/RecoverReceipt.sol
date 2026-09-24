// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RecoverReceipt
 * @notice A decentralized UUPS-upgradeable digital receipt and sales proof registry on Electroneum.
 * @dev Anchors cryptographic receipt hashes and lifecycle states using gasless backend witness signatures.
 */
contract RecoverReceipt is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // --- Enums ---
    enum Status {
        Issued,
        Voided
    }

    // --- Structs ---
    // Gas-optimized struct layout
    struct ReceiptRecord {
        bytes32 receiptHash; // keccak256 hash of canonical receipt JSON
        bytes32 parentReceiptHash; // Reference to voided receipt if corrected, else bytes32(0)
        address merchant; // Issuing merchant wallet address
        Status status; // Issued or Voided
        uint40 issuedAt; // Block timestamp of issuance
        uint40 voidedAt; // Block timestamp when voided (0 if active)
    }

    // --- State Variables ---
    address public backendSigner;
    mapping(bytes32 => ReceiptRecord) private _receipts;
    mapping(address => uint256) public userNonces;

    // --- Events ---
    event ReceiptRegistered(
        bytes32 indexed receiptHash, address indexed merchant, bytes32 indexed parentReceiptHash, uint256 timestamp
    );
    event ReceiptVoided(bytes32 indexed receiptHash, address indexed merchant, string reason, uint256 timestamp);
    event BackendSignerChanged(address indexed oldSigner, address indexed newSigner);

    // --- Custom Errors ---
    error ReceiptNotFound(bytes32 receiptHash);
    error ReceiptAlreadyExists(bytes32 receiptHash);
    error ReceiptAlreadyVoided(bytes32 receiptHash);
    error InvalidReceiptHash();
    error InvalidParentReceipt(bytes32 parentReceiptHash);
    error InvalidBackendSigner();
    error SignatureExpired();
    error InvalidSignature();
    error UnauthorizedMerchant();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the UUPS upgradeable contract.
     * @param _backendSigner The address of the off-chain witness signing key.
     */
    function initialize(address _backendSigner) public initializer {
        __Ownable_init(msg.sender);
        if (_backendSigner == address(0)) {
            revert InvalidBackendSigner();
        }
        backendSigner = _backendSigner;
    }

    // --- External Functions ---

    /**
     * @notice Registers a new finalized receipt with backend witness signature validation.
     * @param receiptHash The keccak256 hash of the canonical receipt payload.
     * @param parentReceiptHash Optional hash of a previous voided receipt being corrected (or bytes32(0)).
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic witness signature from the backend signer.
     */
    function registerReceipt(bytes32 receiptHash, bytes32 parentReceiptHash, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (receiptHash == bytes32(0)) revert InvalidReceiptHash();
        if (_receipts[receiptHash].receiptHash != bytes32(0)) {
            revert ReceiptAlreadyExists(receiptHash);
        }

        // If referencing a parent receipt, verify the parent exists and was voided
        if (parentReceiptHash != bytes32(0)) {
            ReceiptRecord storage parent = _receipts[parentReceiptHash];
            if (parent.receiptHash == bytes32(0) || parent.status != Status.Voided) {
                revert InvalidParentReceipt(parentReceiptHash);
            }
        }

        address merchant = msg.sender;
        uint256 nonce = userNonces[merchant];
        bytes32 messageHash = keccak256(
            abi.encodePacked(merchant, receiptHash, parentReceiptHash, nonce, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[merchant] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        _receipts[receiptHash] = ReceiptRecord({
            receiptHash: receiptHash,
            parentReceiptHash: parentReceiptHash,
            merchant: merchant,
            status: Status.Issued,
            issuedAt: timestamp,
            voidedAt: 0
        });

        emit ReceiptRegistered(receiptHash, merchant, parentReceiptHash, timestamp);
    }

    /**
     * @notice Voids an issued receipt with backend witness signature validation.
     * @param receiptHash The keccak256 hash of the receipt to void.
     * @param reason The audit reason for voiding the receipt.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic witness signature from the backend signer.
     */
    function voidReceipt(bytes32 receiptHash, string calldata reason, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();

        ReceiptRecord storage receipt = _receipts[receiptHash];
        if (receipt.receiptHash == bytes32(0)) revert ReceiptNotFound(receiptHash);
        if (receipt.status == Status.Voided) revert ReceiptAlreadyVoided(receiptHash);

        address caller = msg.sender;
        if (caller != receipt.merchant && caller != owner()) {
            revert UnauthorizedMerchant();
        }

        uint256 nonce = userNonces[caller];
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                caller, receiptHash, keccak256(bytes(reason)), nonce, deadline, block.chainid, address(this)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[caller] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        receipt.status = Status.Voided;
        receipt.voidedAt = timestamp;

        emit ReceiptVoided(receiptHash, receipt.merchant, reason, timestamp);
    }

    /**
     * @notice Configures a new backend signer key. Can only be called by the contract owner.
     * @param _newBackendSigner The new backend signer address.
     */
    function setBackendSigner(address _newBackendSigner) external onlyOwner {
        if (_newBackendSigner == address(0)) {
            revert InvalidBackendSigner();
        }
        address oldSigner = backendSigner;
        backendSigner = _newBackendSigner;
        emit BackendSignerChanged(oldSigner, _newBackendSigner);
    }

    /**
     * @notice Retrieves receipt record details.
     * @param receiptHash The cryptographic hash of the receipt.
     * @return The ReceiptRecord structure.
     */
    function getReceipt(bytes32 receiptHash) external view returns (ReceiptRecord memory) {
        ReceiptRecord memory receipt = _receipts[receiptHash];
        if (receipt.receiptHash == bytes32(0)) revert ReceiptNotFound(receiptHash);
        return receipt;
    }

    // --- UUPS Upgrade Authorization ---
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Storage Gap for Future Upgrades ---
    uint256[50] private __gap;
}
