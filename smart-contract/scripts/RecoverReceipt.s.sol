// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RecoverReceipt} from "../src/RecoverReceipt.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RecoverReceiptScript is Script {
    function setUp() public {}

    function run() public {
        address backendSigner = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        console.log("Using backend signer witness address:", backendSigner);

        vm.startBroadcast();

        // 1. Deploy the RecoverReceipt implementation contract
        RecoverReceipt impl = new RecoverReceipt();
        console.log("RecoverReceipt Implementation deployed at:", address(impl));

        // 2. Encode the initialize(backendSigner) selector call
        bytes memory initData = abi.encodeWithSelector(
            RecoverReceipt.initialize.selector,
            backendSigner
        );

        // 3. Deploy ERC1967Proxy pointing to implementation and passing initialize call data
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("RecoverReceipt Proxy deployed at:", address(proxy));

        vm.stopBroadcast();
    }
}
