// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Recover} from "../src/Recover.sol";

interface IUUPSUpgradeable {
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
}

/**
 * @title UpgradeRecoverScript
 * @notice Deploys a new implementation of Recover and upgrades the UUPS Proxy on Electroneum mainnet.
 */
contract UpgradeRecoverScript is Script {
    address public constant MAINNET_PROXY_ADDRESS = 0x67648938d99bd1809987F18a09f427D8da6C88fd;

    function run() external {
        address proxyAddress = vm.envOr("PROXY_ADDRESS", MAINNET_PROXY_ADDRESS);
        console2.log("Upgrading Recover UUPS Proxy at:", proxyAddress);

        vm.startBroadcast();

        // 1. Deploy new implementation contract
        Recover newImplementation = new Recover();
        console2.log("New Recover Implementation deployed at:", address(newImplementation));

        // 2. Upgrade the Proxy contract to point to the new implementation
        IUUPSUpgradeable(proxyAddress).upgradeToAndCall(address(newImplementation), "");
        console2.log("Successfully upgraded UUPS Proxy to new implementation!");

        vm.stopBroadcast();
    }
}
