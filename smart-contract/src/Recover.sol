// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Recover
 * @notice A decentralized UUPS-upgradeable Lost & Found platform item registry.
 * @dev Manages registration and status transitions of items with gas-optimized storage packing.
 * Authenticates state changes using cryptographic witness signatures from a configured backend signer.
 */
contract Recover is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // --- Enums ---
    enum Status {
        Active,
        Lost,
        Recovered
    }

    // --- Structs ---
    // Gas-optimized packing (fits in exactly 3 storage slots):
    // Slot 0: registrationId (32 bytes)
    // Slot 1: owner (20 bytes) + status (1 byte) + registeredAt (5 bytes) + lastUpdated (5 bytes) = 31 bytes
    // Slot 2: itemHash (32 bytes)
    struct Item {
        uint256 registrationId;
        address owner;
        Status status;
        uint40 registeredAt;
        uint40 lastUpdated;
        bytes32 itemHash;
    }

    // --- State Variables ---
    address public backendSigner;
    uint256 private _nextRegistrationId;
    mapping(uint256 => Item) private _items;
    mapping(address => uint256) public userNonces;

    // --- Events ---
    event ItemRegistered(uint256 indexed registrationId, address indexed owner, bytes32 itemHash, uint256 timestamp);
    event ItemMarkedLost(uint256 indexed registrationId, uint256 timestamp);
    event ItemRecovered(uint256 indexed registrationId, uint256 timestamp);
    event BackendSignerChanged(address indexed oldSigner, address indexed newSigner);

    // --- Custom Errors ---
    error ItemNotFound(uint256 registrationId);
    error NotItemOwner(uint256 registrationId, address caller);
    error InvalidStatusTransition(uint256 registrationId, Status currentStatus, Status targetStatus);
    error InvalidItemHash();
    error InvalidOwnerAddress();
    error InvalidBackendSigner();
    error SignatureExpired();
    error InvalidSignature();

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
        _nextRegistrationId = 1;
    }

    // --- External Functions ---

    /**
     * @notice Registers a new item with backend witness signature validation.
     * @param owner The target owner address of the item.
     * @param itemHash The hash of the off-chain item metadata.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     * @return registrationId The newly generated item ID.
     */
    function registerItem(address owner, bytes32 itemHash, uint256 deadline, bytes calldata signature)
        external
        returns (uint256)
    {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (itemHash == bytes32(0)) revert InvalidItemHash();
        if (owner == address(0)) revert InvalidOwnerAddress();

        uint256 nonce = userNonces[owner];
        bytes32 messageHash =
            keccak256(abi.encodePacked(owner, itemHash, nonce, deadline, block.chainid, address(this)));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[owner] = nonce + 1;

        uint256 registrationId = _nextRegistrationId;
        uint40 timestamp = uint40(block.timestamp);

        _items[registrationId] = Item({
            registrationId: registrationId,
            owner: owner,
            status: Status.Active,
            registeredAt: timestamp,
            lastUpdated: timestamp,
            itemHash: itemHash
        });

        _nextRegistrationId = registrationId + 1;

        emit ItemRegistered(registrationId, owner, itemHash, timestamp);

        return registrationId;
    }

    /**
     * @notice Marks an item as Lost with backend witness signature validation.
     * @param registrationId The ID of the item.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function markLost(uint256 registrationId, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (registrationId == 0 || registrationId >= _nextRegistrationId) {
            revert ItemNotFound(registrationId);
        }

        Item storage item = _items[registrationId];
        if (item.status == Status.Lost) {
            revert InvalidStatusTransition(registrationId, item.status, Status.Lost);
        }

        address owner = item.owner;
        uint256 nonce = userNonces[owner];
        bytes32 messageHash = keccak256(
            abi.encodePacked(registrationId, uint8(Status.Lost), nonce, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[owner] = nonce + 1;

        item.status = Status.Lost;
        uint40 timestamp = uint40(block.timestamp);
        item.lastUpdated = timestamp;

        emit ItemMarkedLost(registrationId, timestamp);
    }

    /**
     * @notice Marks an item as Recovered with backend witness signature validation.
     * @param registrationId The ID of the item.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function markRecovered(uint256 registrationId, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (registrationId == 0 || registrationId >= _nextRegistrationId) {
            revert ItemNotFound(registrationId);
        }

        Item storage item = _items[registrationId];
        if (item.status != Status.Lost) {
            revert InvalidStatusTransition(registrationId, item.status, Status.Recovered);
        }

        address owner = item.owner;
        uint256 nonce = userNonces[owner];
        bytes32 messageHash = keccak256(
            abi.encodePacked(registrationId, uint8(Status.Recovered), nonce, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[owner] = nonce + 1;

        item.status = Status.Recovered;
        uint40 timestamp = uint40(block.timestamp);
        item.lastUpdated = timestamp;

        emit ItemRecovered(registrationId, timestamp);
    }

    /**
     * @notice Configures a new backend signer key. Can only be called by the owner.
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
     * @notice Retrieves the item details. Reverts if item not found.
     * @param registrationId The ID of the item.
     * @return The item structure.
     */
    function getItem(uint256 registrationId) external view returns (Item memory) {
        if (registrationId == 0 || registrationId >= _nextRegistrationId) {
            revert ItemNotFound(registrationId);
        }
        return _items[registrationId];
    }

    /**
     * @notice Verifies the item details. Gasless view function for scanner landing pages.
     * @param registrationId The ID of the item.
     * @return The item structure.
     */
    function verifyItem(uint256 registrationId) external view returns (Item memory) {
        if (registrationId == 0 || registrationId >= _nextRegistrationId) {
            revert ItemNotFound(registrationId);
        }
        return _items[registrationId];
    }

    // --- UUPS Upgrade Authorization ---
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Storage Gap for Future Upgrades ---
    uint256[50] private __gap;
}
