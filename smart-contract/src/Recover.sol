// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title Recover
 * @notice A decentralized Lost & Found platform item registry.
 * @dev Manages registration and status transitions of items with gas-optimized storage packing.
 * Follows OpenZeppelin smart contract best practices:
 * - Checks-Effects-Interactions (CEI) pattern implemented on state-changing functions
 * - Gas-optimized storage slot layout using tight packing (address, enum, uint40 timestamps)
 * - Use of custom errors instead of require strings for gas efficiency
 * - Comprehensive NatSpec documentation
 * - Explicit access control checks
 */
contract Recover {
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
    uint256 private _nextRegistrationId = 1;
    mapping(uint256 => Item) private _items;

    // --- Events ---
    event ItemRegistered(uint256 indexed registrationId, address indexed owner, bytes32 itemHash, uint256 timestamp);
    event ItemMarkedLost(uint256 indexed registrationId, uint256 timestamp);
    event ItemRecovered(uint256 indexed registrationId, uint256 timestamp);

    // --- Custom Errors ---
    error ItemNotFound(uint256 registrationId);
    error NotItemOwner(uint256 registrationId, address caller);
    error InvalidStatusTransition(uint256 registrationId, Status currentStatus, Status targetStatus);
    error InvalidItemHash();

    // --- Modifiers ---
    modifier onlyOwner(uint256 registrationId) {
        if (registrationId == 0 || registrationId >= _nextRegistrationId) {
            revert ItemNotFound(registrationId);
        }
        if (_items[registrationId].owner != msg.sender) {
            revert NotItemOwner(registrationId, msg.sender);
        }
        _;
    }

    // --- External Functions ---

    /**
     * @notice Registers a new item with an off-chain metadata hash.
     * @param itemHash The hash of the off-chain item metadata.
     * @return registrationId The newly generated item ID.
     */
    function registerItem(bytes32 itemHash) external returns (uint256) {
        if (itemHash == bytes32(0)) {
            revert InvalidItemHash();
        }

        uint256 registrationId = _nextRegistrationId;
        uint40 timestamp = uint40(block.timestamp);

        _items[registrationId] = Item({
            registrationId: registrationId,
            owner: msg.sender,
            status: Status.Active,
            registeredAt: timestamp,
            lastUpdated: timestamp,
            itemHash: itemHash
        });

        _nextRegistrationId = registrationId + 1;

        emit ItemRegistered(registrationId, msg.sender, itemHash, timestamp);

        return registrationId;
    }

    /**
     * @notice Marks an item as Lost. Can only be called by the item owner.
     * @param registrationId The ID of the item.
     */
    function markLost(uint256 registrationId) external onlyOwner(registrationId) {
        Item storage item = _items[registrationId];

        if (item.status == Status.Lost) {
            revert InvalidStatusTransition(registrationId, item.status, Status.Lost);
        }

        item.status = Status.Lost;
        uint40 timestamp = uint40(block.timestamp);
        item.lastUpdated = timestamp;

        emit ItemMarkedLost(registrationId, timestamp);
    }

    /**
     * @notice Marks an item as Recovered. Can only be called by the item owner.
     * @param registrationId The ID of the item.
     */
    function markRecovered(uint256 registrationId) external onlyOwner(registrationId) {
        Item storage item = _items[registrationId];

        if (item.status != Status.Lost) {
            revert InvalidStatusTransition(registrationId, item.status, Status.Recovered);
        }

        item.status = Status.Recovered;
        uint40 timestamp = uint40(block.timestamp);
        item.lastUpdated = timestamp;

        emit ItemRecovered(registrationId, timestamp);
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
}
