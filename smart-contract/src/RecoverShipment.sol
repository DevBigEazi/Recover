// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RecoverShipment
 * @notice A decentralized UUPS-upgradeable shipment verification and chain of custody registry.
 * @dev Tracks shipment states and validates status transitions using cryptographically signed messages.
 */
contract RecoverShipment is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // --- Enums ---
    enum Status {
        Created,
        InTransit,
        Delivered,
        Verified,
        Disputed
    }

    // --- Structs ---
    // Gas-optimized struct layout
    struct Shipment {
        bytes32 packageId;
        bytes32 packageHash; // keccak256(packageId, innerSecretHash)
        address shipper;
        address currentHandler;
        Status status;
        uint40 lastUpdated;
    }

    // --- State Variables ---
    address public backendSigner;
    mapping(bytes32 => Shipment) private _shipments;
    mapping(address => uint256) public userNonces;

    // --- Events ---
    event ShipmentRegistered(
        bytes32 indexed packageId, address indexed shipper, bytes32 packageHash, uint256 timestamp
    );
    event ShipmentHandover(bytes32 indexed packageId, address indexed nextHandler, uint256 timestamp);
    event ShipmentVerified(bytes32 indexed packageId, uint256 timestamp);
    event ShipmentDisputed(bytes32 indexed packageId, string reason, uint256 timestamp);
    event BackendSignerChanged(address indexed oldSigner, address indexed newSigner);

    // --- Custom Errors ---
    error ShipmentNotFound(bytes32 packageId);
    error ShipmentAlreadyExists(bytes32 packageId);
    error InvalidStatusTransition(bytes32 packageId, Status currentStatus, Status targetStatus);
    error InvalidPackageHash();
    error InvalidShipperAddress();
    error InvalidHandlerAddress();
    error InvalidBackendSigner();
    error SignatureExpired();
    error InvalidSignature();
    error InvalidSecret();

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
     * @notice Registers a new shipment with witness signature validation.
     * @param packageId The unique ID of the package.
     * @param packageHash The hash of the secret code required to claim the package.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function registerShipment(bytes32 packageId, bytes32 packageHash, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (packageHash == bytes32(0)) revert InvalidPackageHash();
        if (_shipments[packageId].packageId != bytes32(0)) revert ShipmentAlreadyExists(packageId);

        address shipper = msg.sender;
        uint256 nonce = userNonces[shipper];
        bytes32 messageHash =
            keccak256(abi.encodePacked(shipper, packageId, packageHash, nonce, deadline, block.chainid, address(this)));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[shipper] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        _shipments[packageId] = Shipment({
            packageId: packageId,
            packageHash: packageHash,
            shipper: shipper,
            currentHandler: address(0),
            status: Status.Created,
            lastUpdated: timestamp
        });

        emit ShipmentRegistered(packageId, shipper, packageHash, timestamp);
    }

    /**
     * @notice Logs a courier handover milestone with signature verification.
     * @param packageId The unique ID of the package.
     * @param nextHandler The handler taking custody of the shipment.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function logHandover(bytes32 packageId, address nextHandler, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (nextHandler == address(0)) revert InvalidHandlerAddress();

        Shipment storage shipment = _shipments[packageId];
        if (shipment.packageId == bytes32(0)) revert ShipmentNotFound(packageId);
        if (shipment.status != Status.Created && shipment.status != Status.InTransit) {
            revert InvalidStatusTransition(packageId, shipment.status, Status.InTransit);
        }

        address operator = msg.sender;
        uint256 nonce = userNonces[operator];
        bytes32 messageHash =
            keccak256(abi.encodePacked(operator, packageId, nextHandler, nonce, deadline, block.chainid, address(this)));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[operator] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        shipment.currentHandler = nextHandler;
        shipment.status = Status.InTransit;
        shipment.lastUpdated = timestamp;

        emit ShipmentHandover(packageId, nextHandler, timestamp);
    }

    /**
     * @notice Verifies delivery by supplying the correct scratch-off secret.
     * @param packageId The unique ID of the package.
     * @param innerSecret The secret code found underneath the scratch-off layer.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function verifyDelivery(bytes32 packageId, string calldata innerSecret, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();

        Shipment storage shipment = _shipments[packageId];
        if (shipment.packageId == bytes32(0)) revert ShipmentNotFound(packageId);
        if (shipment.status != Status.Created && shipment.status != Status.InTransit) {
            revert InvalidStatusTransition(packageId, shipment.status, Status.Verified);
        }

        if (keccak256(abi.encodePacked(packageId, innerSecret)) != shipment.packageHash) {
            revert InvalidSecret();
        }

        address caller = msg.sender;
        uint256 nonce = userNonces[caller];
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                caller, packageId, keccak256(bytes(innerSecret)), nonce, deadline, block.chainid, address(this)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[caller] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        shipment.status = Status.Verified;
        shipment.lastUpdated = timestamp;

        emit ShipmentVerified(packageId, timestamp);
    }

    /**
     * @notice Disputes package delivery (e.g. tampered sticker or empty package).
     * @param packageId The unique ID of the package.
     * @param reason The dispute description.
     * @param deadline The signature expiration timestamp.
     * @param signature The cryptographic signature from the backend signer.
     */
    function disputeDelivery(bytes32 packageId, string calldata reason, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();

        Shipment storage shipment = _shipments[packageId];
        if (shipment.packageId == bytes32(0)) revert ShipmentNotFound(packageId);
        if (shipment.status != Status.Created && shipment.status != Status.InTransit) {
            revert InvalidStatusTransition(packageId, shipment.status, Status.Disputed);
        }

        address caller = msg.sender;
        uint256 nonce = userNonces[caller];
        bytes32 messageHash = keccak256(
            abi.encodePacked(caller, packageId, keccak256(bytes(reason)), nonce, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        if (ECDSA.recover(ethSignedMessageHash, signature) != backendSigner) {
            revert InvalidSignature();
        }

        userNonces[caller] = nonce + 1;
        uint40 timestamp = uint40(block.timestamp);

        shipment.status = Status.Disputed;
        shipment.lastUpdated = timestamp;

        emit ShipmentDisputed(packageId, reason, timestamp);
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
     * @notice Retrieves shipment details.
     * @param packageId The ID of the shipment.
     * @return The shipment structure.
     */
    function getShipment(bytes32 packageId) external view returns (Shipment memory) {
        Shipment memory shipment = _shipments[packageId];
        if (shipment.packageId == bytes32(0)) revert ShipmentNotFound(packageId);
        return shipment;
    }

    // --- UUPS Upgrade Authorization ---
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Storage Gap for Future Upgrades ---
    uint256[50] private __gap;
}
