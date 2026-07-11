// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Recover} from "../src/Recover.sol";

contract RecoverScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Recover recover = new Recover();
        console.log("Recover contract deployed at:", address(recover));

        vm.stopBroadcast();
    }
}
