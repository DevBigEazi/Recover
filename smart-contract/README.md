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

# Electroneum Mainnet
forge script scripts/Recover.s.sol:RecoverScript --rpc-url electroneum --account deployer --broadcast
```

---

## Deployed Contract Addresses

### Electroneum Mainnet (Chain ID `52014`)
* **ERC1967 Proxy Address:** `0x67648938d99bd1809987F18a09f427D8da6C88fd`
* **Recover Implementation:** `0xa036a4542bddbf2addca09dfed635b801146f0e3`

### Electroneum Testnet (Chain ID `5201420`)
* **ERC1967 Proxy Address:** `0xb7D165292dA19BE617d7E0C6b983CFA2b3716BFE`
* **Recover Implementation:** `0x64A3F3aE151C39D953B5EB5Fb5343b317386b4a5`

