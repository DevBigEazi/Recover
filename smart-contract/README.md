# Foundry + thirdweb Smart Contract Development

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

This contract repository is pre-configured to build, test, and deploy smart contracts on the Electroneum Smart Chain using either Foundry tools or **thirdweb CLI**.

### thirdweb Deployment (Recommended)

thirdweb provides a secure, private-key-free contract deployment flow. Compiling and deploying is simple:

```shell
# Deploy your contract using thirdweb CLI
npx thirdweb deploy
```

This compiles your contracts and opens a web browser link to configure and deploy the contract directly onto the Electroneum Mainnet or Testnet through the thirdweb Dashboard.

---

### Foundry Tools Documentation

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Foundry Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Foundry Deploy

Deploy implementation and proxy contracts:
```shell
# Electroneum Testnet
forge script scripts/Recover.s.sol:RecoverScript --rpc-url electroneum-testnet --account deployer --legacy --with-gas-price 10000000000 --broadcast
forge script scripts/RecoverShipment.s.sol:RecoverShipmentScript --rpc-url electroneum-testnet --account deployer --legacy --with-gas-price 10000000000 --broadcast

# Electroneum Mainnet
forge script scripts/Recover.s.sol:RecoverScript --rpc-url electroneum --account deployer --broadcast
forge script scripts/RecoverShipment.s.sol:RecoverShipmentScript --rpc-url electroneum --account deployer --broadcast
```

---

## Deployed Contract Addresses

### Electroneum Mainnet (Chain ID `52014`)
* **Recover (Lost & Found) Proxy Address:** `0x67648938d99bd1809987F18a09f427D8da6C88fd`
* **Recover Implementation (v2 with Deletion):** `0x86eeD26665114ECCdD2DbbCE880f968D3A908fb2` (Verified)
* **RecoverShipment (Delivery Verification) Proxy Address:** `0xce4bF97e85212d9121e52c3F6fb2C8021Bf30012`
* **RecoverShipment Implementation v2 (Current):** `0xC5c262ddF9e730ABD6eF57d45316777c919Ff5A4`
* **RecoverShipment Implementation v1 (Historical):** `0x80fD76Cb87077144d45ed077EBB12B94161A6d59` (Verified)

### Electroneum Testnet (Chain ID `5201420`)
* **Recover (Lost & Found) Proxy Address:** `0xb7D165292dA19BE617d7E0C6b983CFA2b3716BFE`
* **Recover Implementation (v2 with Deletion):** `0x0a637c959cAc325b8a422d4E17EE0f1b7F57Af3b`
* **RecoverShipment (Delivery Verification) Proxy Address:** `0x0d59e2f70F093B227Eb8f730A81f638bcc6A48f0`
* **RecoverShipment Implementation:** `0xe65F27Eaa6b1496ACa468e918A57f61B3f563fAf` (Not Verified)

