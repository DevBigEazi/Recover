# AGENTS.md — Recover

These rules govern any AI coding agent (Claude Code, Cursor, Copilot agent, etc.) working in this repo. They are not suggestions. If a rule below conflicts with speed or convenience, the rule wins.

## 1. Plan before you build — always
- Before writing or editing any file, produce a short written plan: what you're about to do, which files it touches, and why.
- **Stop and wait for explicit approval** before executing the plan. "Looks good, proceed" or equivalent is required — silence is not approval.
- Never batch multiple unrelated changes into one unreviewed pass. One reviewable unit of work at a time (one contract function, one screen, one refactor).
- If a task is ambiguous (e.g., "can a Recovered item go straight back to Lost, or must it re-register?"), ask. Do not silently pick an interpretation for anything that touches the contract's state machine, money/rewards, or user privacy.

## 2. TypeScript — strict, no exceptions
- `tsconfig.json` must have `"strict": true` and `"noImplicitAny": true`. Do not weaken these to make an error go away.
- **Never use `any`.** Not `as any`, not implicit `any`, not `@ts-ignore` to silence a type error. If a type is genuinely unknown, use `unknown` and narrow it properly.
- No `@ts-nocheck`, no `@ts-expect-error` used as a substitute for fixing a real type problem (it's acceptable only for genuinely-known, documented upstream type bugs — comment why).
- Prefer explicit return types on exported functions.
- Generate contract types from the actual ABI (Foundry build artifact or `npx thirdweb generate`) rather than hand-writing interfaces that can drift from the deployed contract.

## 3. Git commits — only after your explicit confirmation
- After any implementation step is complete, tested, linted, and built successfully, present it and **wait**.
- Only after you explicitly confirm it's correct and approved does the agent run `git add -A && git commit -m "<scoped message>"`.
- Never commit before confirmation. Never fold unconfirmed work into an already-confirmed commit. One confirmed unit of work = one commit.
- Commit messages are scoped and descriptive (e.g., `feat(contract): add markLost with owner-only access control + tests`, not `update stuff`).

## 4. Mobile responsiveness — non-negotiable
- Every frontend page/component must work correctly at mobile widths (~375px) as well as tablet/desktop, checked before a step is presented as done.
- This applies with extra weight to the public, no-wallet pages (`/verify/[id]`, the found-item report form) — these are opened almost exclusively from a phone camera scanning a physical sticker. A broken mobile layout there defeats the product's purpose.
- Use Tailwind's responsive utilities; don't ship a desktop-only layout and call mobile support a follow-up.

## 5. Lint and build — mandatory after every implementation step
After any code change, before reporting it as done:
```bash
npm run lint
npm run build
```
Both must pass. If either fails, fix it before moving on — do not present broken code as finished and do not ask the user to fix lint/build errors themselves.
For the contract workspace:
```bash
forge fmt --check
forge build
forge test
```
All must pass before a contract change is considered complete.

## 6. Minimal, focused changes
- Touch only the files necessary for the current approved step.
- No speculative abstractions, no "while I'm in here" refactors, no unused config/dependencies added "for later."
- If you notice something that seems like it should also change, note it and ask — don't fix it silently in the same diff.

## 7. Dependencies — verify, don't assume
- Before adding or recommending any package, check its current stable version and maintenance status (`npm view <pkg> version`, check for recent publishes / open critical issues) rather than relying on training data, which may be stale.
- Prefer the latest **stable** release, not bleeding-edge pre-releases, unless explicitly asked.
- Do not add a new dependency for something 10–20 lines of code can solve.
- Justify each new dependency in the plan step (§1) before installing it.

## 8. Smart contract discipline
- No `any`-equivalent laziness in Solidity either: explicit visibility on every function/state variable, explicit types (no relying on default `int`/`uint` assumptions), custom errors preferred over long require strings where gas matters.
- No payable/fund-custody logic unless explicitly requested and separately scoped (see PRD §6.5) — Recover v1 does not escrow rewards.
- No PII or unbounded-growth data structures written to chain storage.
- Every state-changing function needs an access-control check and a test proving unauthorized calls revert.
- **Every new feature or change to the contract ships with a Foundry test in the same commit — no exceptions.** No test coverage means the change isn't done, regardless of how small it looks.
- Re-run `forge snapshot` after changes to gas-sensitive functions and flag material regressions.
- This project deploys directly to Electroneum **mainnet** (no testnet stop-over, by explicit choice), so `forge test` passing plus a mainnet-fork run (`forge test --fork-url electroneum`) is the mandatory gate before any `--broadcast`. Mainnet deploys require an explicit, separate approval step — never bundle a deploy into a "finish the feature" request.
- **Never put a plaintext private key in a CLI command, `.env` file, or script.** Deployment signing goes through a Foundry encrypted keystore (`cast wallet import <name> --interactive`, then `--account <name>` on `forge script`/`forge create`), or a browser-wallet flow (`npx thirdweb deploy`). If asked to deploy and no keystore exists yet, stop and ask the user to run `cast wallet import` themselves interactively — the agent should never handle a raw private key at all, even transiently.
- **OpenZeppelin Best Practices & Security Guidelines:**
  - Follow the **Checks-Effects-Interactions (CEI)** pattern strictly to prevent reentrancy and ensure state predictability (see [OpenZeppelin Security Checklist](https://docs.openzeppelin.com/learn/preparing-for-mainnet)).
  - Validate all inputs thoroughly (e.g. check for zero-address `address(0)` or zero-hash `bytes32(0)` before using/storing them) (see [OpenZeppelin Contracts Documentation](https://docs.openzeppelin.com/contracts/)).
  - Order state variables and struct members efficiently to optimize EVM storage layout packing and minimize gas consumption.
  - Group functions logically (external, public, internal, private, views/pures) and document every parameter and return value using full NatSpec syntax.
  - Use custom errors instead of verbose require strings to minimize deployment and runtime gas overhead.


## 9. Security & privacy defaults
- Owner PII (name, phone, exact address, photos) never goes into contract calldata or public API responses unless the owner explicitly opted that field into "public."
- The finder-facing "I Found This Item" flow has no auth by design — treat every input from it as untrusted: validate, sanitize, rate-limit.
- Never log or print private keys, client secrets, or `.env` contents. Never commit `.env*` files.

## 10. Communication style
- Lead with the command or the diff, not a preamble explaining what you're about to explain.
- Skip restating requirements back at length; skip explanations unless asked for one.
- When reporting completion: state what changed, the lint/build/test results, and what the next proposed step is — then stop and wait.
