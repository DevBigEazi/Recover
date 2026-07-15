// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Recover} from "../src/Recover.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RecoverScript is Script {
    function setUp() public {}

    function run() public {
        // Read backend signer from env, defaulting to a mock address if not set
        address backendSigner = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        console.log("Using backend signer witness address:", backendSigner);

        vm.startBroadcast();

        // 1. Deploy the Recover implementation contract
        Recover impl = new Recover();
        console.log("Recover Implementation deployed at:", address(impl));

        // 2. Encode the initialize(backendSigner) selector call
        bytes memory initData = abi.encodeWithSelector(
            Recover.initialize.selector,
            backendSigner
        );

        // 3. Deploy ERC1967Proxy pointing to implementation and passing initialize call data
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("ERC1967Proxy deployed at:", address(proxy));

        vm.stopBroadcast();
    }
}
