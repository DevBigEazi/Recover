# Recover — Build Guide (Next.js + Tailwind + Electroneum Mainnet + thirdweb SDK)

Assumes the project is already scaffolded via `npx etn-forge` (`next-ts-thirdweb-foundry` template) and you're working inside it. This guide picks up from an existing `frontend/` + `smart-contract/` monorepo.

Read alongside `AGENTS.md`. Every phase ends with a **STOP → present → get explicit approval → commit** checkpoint.

> **Mainnet-only, flagged once:** you've chosen to build and deploy directly against Electroneum mainnet, no testnet stop-over. That means every contract bug costs real ETN and every deploy is final (no redeploying over a bad address). The mitigation is §2.2–2.3 below (tests + gas snapshot + a mainnet-fork check) standing in for what testnet normally catches. Noted once here — not repeated on every step below.

---

## 0. Confirmed environment facts

| Item | Value |
|---|---|
| Electroneum Mainnet Chain ID | `52014` |
| Mainnet RPC (Ankr, primary) | `https://rpc.ankr.com/electroneum/${ANKR_API_KEY}` |
| Explorer | `https://blockexplorer.electroneum.com` |
| Native currency | ETN, 18 decimals |
| Frontend Web3 SDK | `thirdweb` v5 (`thirdweb`, `thirdweb/react`) |
| Contract tooling | Foundry (`forge`, `cast`) |
| Deployment signer | Foundry **encrypted keystore** — no plaintext private key in any CLI command, `.env`, or shell history (§1) |

Re-verify current stable package versions before installing anything (`npm view <pkg> version`) — don't trust versions from memory.

---

## 1. Prerequisites

- Foundry installed (`forge --version`, `cast --version`)
- An **Ankr API key** (Ankr dashboard → create key) for the mainnet RPC
- A thirdweb account + **Client ID** for the frontend SDK
- A funded Electroneum mainnet wallet for deployment gas
- The deployer key imported into a Foundry **encrypted keystore** *before* touching any deploy command — this is the alternative to putting a raw private key in the CLI or `.env`:
  ```bash
  cast wallet import deployer --interactive
  # prompts: paste private key, set a password
  # stored encrypted at ~/.foundry/keystores/deployer — never touches shell history or .env
  cast wallet address --account deployer   # confirm the address, fund THIS address
  ```

---

## 2. Smart contract — `Recover.sol`

### 2.1 Data model (per PRD §6)
- `Status` enum: `Active`, `Lost`, `Recovered`
- `Item` struct: `registrationId`, `owner`, `itemHash`, `registeredAt`, `status`, `lastUpdated` — order fields for storage-slot packing
- Functions: `registerItem`, `verifyItem`, `markLost`, `markRecovered`, `getItem`
- Events: `ItemRegistered`, `ItemMarkedLost`, `ItemRecovered`, `ItemVerified`
- No payable/escrow logic, no PII on-chain (PRD §6.5)
- `onlyOwner(uint256 id)` modifier; short custom errors over long require strings

### 2.2 Tests — mandatory before any deploy, and mandatory for every future change
Every function, and every subsequent change or new feature added to the contract, must ship with a Foundry test in the same commit — no exceptions (`AGENTS.md` §6). Minimum coverage for v1:
- Happy path for each function
- Access-control revert (non-owner calling `markLost`/`markRecovered`)
- Invalid state-transition revert (e.g., `markLost` on an already-Lost item)
- Correct event emission (`vm.expectEmit`)
- `getItem`/`verifyItem` behavior on a non-existent ID (pick revert-or-zeroed deliberately, test it)
- Open state-machine question — **confirm with product owner before implementing**: can a `Recovered` item go straight back to `Lost`, or must it re-register? Implement and test whichever answer is confirmed.

```bash
cd smart-contract
forge build
forge test -vvv
forge snapshot
forge fmt --check
```

### 2.3 Mainnet safety net (stands in for a testnet pass)
```bash
forge test --fork-url https://rpc.ankr.com/electroneum/${ANKR_API_KEY}
```
Run the full suite against a mainnet fork as the final gate before broadcasting for real.

### 2.4 Foundry config — `smart-contract/foundry.toml`
```toml
[rpc_endpoints]
electroneum = "https://rpc.ankr.com/electroneum/${ANKR_API_KEY}"
```
`ANKR_API_KEY` goes in `smart-contract/.env` (gitignored) purely as the RPC URL param — it is **not** a signing credential, so it's fine there. The signing key never goes in `.env`; it lives only in the encrypted keystore from §1.

### 2.5 Deploy — keystore-based, no private key in the CLI
```bash
forge script script/Recover.s.sol:RecoverScript \
  --rpc-url electroneum \
  --account deployer \
  --sender $(cast wallet address --account deployer) \
  --broadcast
```
Foundry prompts for the keystore password at runtime; the raw key never appears in the command, an env file, or shell history.

*(Alternative if you'd rather sign via a browser wallet instead of a CLI password prompt: `npx thirdweb deploy` from `smart-contract/`, select Electroneum mainnet, connect via browser. Either is fine — pick one and stay consistent across deploys, don't mix.)*

**STOP.** Present the deployed mainnet address + `https://blockexplorer.electroneum.com/address/<addr>`. Wait for confirmation, then commit (§6).

---

## 3. Frontend — thirdweb wired to Electroneum mainnet

### 3.1 `frontend/.env.local` (gitignored)
```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS=0x...   # mainnet address from §2.5
NEXT_PUBLIC_ANKR_API_KEY=your_ankr_api_key   # used client-side for read RPC only
```

### 3.2 `frontend/lib/chain.ts`
```ts
import { defineChain } from "thirdweb/chains";

export const electroneum = defineChain({
  id: 52014,
  rpc: `https://rpc.ankr.com/electroneum/${process.env.NEXT_PUBLIC_ANKR_API_KEY}`,
  nativeCurrency: { name: "Electroneum", symbol: "ETN", decimals: 18 },
  blockExplorers: [
    { name: "Electroneum Explorer", url: "https://blockexplorer.electroneum.com" },
  ],
});
```

### 3.3 `frontend/lib/thirdweb-client.ts`
```ts
import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
});
```

### 3.4 Provider — `frontend/app/layout.tsx`
```tsx
import { ThirdwebProvider } from "thirdweb/react";
// wrap {children}
```

### 3.5 Contract handle — `frontend/lib/contract.ts`
```ts
import { getContract } from "thirdweb";
import { client } from "./thirdweb-client";
import { electroneum } from "./chain";

export const recoverContract = getContract({
  client,
  chain: electroneum,
  address: process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as string,
});
```
Generate ABI types from the Foundry build artifact or `npx thirdweb generate 52014/<address>` after deploy — never hand-write drifting interfaces, never `any`.

---

## 4. Frontend screens — build order

Every screen must be fully responsive (mobile-first: verify at ~375px, 768px, 1024px+ before calling it done — non-negotiable, since the public QR/found-item pages are overwhelmingly opened from a phone camera scan).

1. Wallet connect (`ConnectButton`, styled per `BRANDING.md`)
2. Register Item flow (form → client-side hash → `registerItem` → QR)
3. Lost Item Dashboard (`/dashboard`) — Active/Lost/Recovered tabs
4. Item Detail (`/items/[id]`) — QR download, Mark Lost/Recovered, finder inbox
5. Public QR landing page (`/verify/[id]`, no wallet, branches on status)
6. Found-item report form (off-chain, untrusted-input handling)
7. QR sticker generator (QR + fixed caption + optional logo, downloadable)

---

## 5. Off-chain services
Small backend (Route Handlers or separate service) + DB for item metadata, contact prefs, finder reports, notification queue. Distinct scope — plan and get sign-off before implementing (`AGENTS.md` §1).

---

## 6. After every implementation step (mandatory sequence)
1. `npm run lint` && `npm run build` (frontend), `forge fmt --check && forge test` (contract) — all must pass.
2. Present the result to you, including a note on mobile-responsiveness check for any UI step.
3. Wait for your explicit confirmation.
4. Only then: `git add -A && git commit -m "<scoped, descriptive message>"`. Never commit before confirmation; never bundle unconfirmed work into a confirmed commit.

---

## 7. Prompt messages — one per implementation step

Send one at a time; don't skip ahead. Each is designed to trigger the plan → approve → implement → test → lint/build → commit loop from `AGENTS.md`.

1. `"Plan the Recover.sol contract per PRD §6 — struct, enum, functions, events, access control, custom errors. Plan only, no code yet."`
2. `"Implement Recover.sol per the approved plan."`
3. `"Write the full Foundry test suite for Recover.sol — happy paths, access control, invalid transitions, event emission. Run forge test and forge snapshot, report results."`
4. `"Run forge fmt --check and fix any formatting issues."`
5. `"Set up foundry.toml with the Electroneum mainnet RPC using ANKR_API_KEY. Don't touch signing/keys."`
6. `"Write script/Recover.s.sol for deployment. Dry run only — no --broadcast — and show me the plan."`
7. `"Run the mainnet fork test suite and report results before we deploy for real."`
8. `"Deploy Recover.sol to Electroneum mainnet using the 'deployer' keystore account. Wait for my confirmation before --broadcast."`
9. `"Wire up frontend/lib/chain.ts, thirdweb-client.ts, and contract.ts per the build guide §3. Plan first."`
10. `"Build the wallet-connect header, mobile-responsive, styled per BRANDING.md. Plan first."`
11. `"Build the Register Item flow: form, off-chain hash, registerItem call, QR generation on success. Plan first."`
12. `"Build the Lost Item Dashboard with Active/Lost/Recovered tabs, mobile-responsive. Plan first."`
13. `"Build the Item Detail page: QR download, Mark Lost / Mark Recovered actions, finder-report inbox. Plan first."`
14. `"Build the public /verify/[id] QR landing page, no-wallet-required, branching on on-chain status, mobile-responsive. Plan first."`
15. `"Build the Found-Item report form with input validation and rate-limiting noted. Plan first."`
16. `"Build the QR sticker generator: QR + fixed 'SCAN IF FOUND' caption + optional logo, downloadable PNG/SVG. Plan first."`
17. `"Plan the off-chain backend (schema + endpoints) for item metadata, contact prefs, finder reports, notifications. Don't implement yet."`
18. `"Implement the off-chain backend per the approved schema."`

The §6 sequence (test → lint/build → present → wait for confirmation → commit) applies after every one of these before moving to the next prompt.

---

## Reference links
- Electroneum developer docs: https://developer.electroneum.com
- Ankr RPC docs: https://www.ankr.com/docs/rpc-service/chains/chains-list/
- thirdweb TypeScript SDK v5: https://portal.thirdweb.com/typescript/v5
- Foundry Book — wallet import/keystore: https://book.getfoundry.sh/reference/cast/cast-wallet-import
- `etn-forge`: https://www.npmjs.com/package/etn-forge
