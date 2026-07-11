# Recover — Product Requirements Document (PRD)

## 1. Overview
Recover is a decentralized Lost & Found platform. Every physical item registered on Recover gets an on-chain identity (via a smart contract) and a printable QR sticker. Scanning the sticker proves ownership, and — if the item is lost — connects a finder to the owner without exposing the owner's private data.

## 2. Goals
- Let owners prove ownership of valuable items on-chain.
- Let anyone who finds a lost item make safe, private contact with the owner.
- Keep the finder/owner flow frictionless: no app install required to report a find (mobile web page from QR scan).
- Keep sensitive data off-chain; only status + hashes/pointers live on-chain.

## 3. Core Concept: Item Status
Every item has exactly one status at a time:

| Status | Meaning | What a scanner sees |
|---|---|---|
| **Active** | Registered, owned, not lost | ✅ Verified Item, "Registered on Recover", ownership verified, optional "Contact owner" |
| **Lost** | Owner reported it missing | ⚠️ "This item has been reported as LOST", date lost, optional reward, safe contact options, "I Found This Item" button |
| **Recovered** | Owner got it back | Returns to the standard Active verification page |

## 4. User Stories

### 4.1 Report Lost Item
*As an owner*, I want to mark my item as lost so that anyone who finds it knows it belongs to someone and can contact me.

**Acceptance criteria**
- Owner can toggle status Active → Lost from the dashboard or item detail page.
- Owner can optionally add: reward amount, last known location, recovery instructions, preferred contact method.
- Action triggers `markLost()` on-chain and updates `ItemMarkedLost` event.
- QR page reflects the new status within one block confirmation (optimistic UI update, then confirmed).

### 4.2 Report Found Item
*As a finder*, I want to notify the owner after scanning the QR code so I can help return the item.

**Acceptance criteria**
- Scanning a Lost item's QR opens a public "Found Item" page — no wallet or login required to view it.
- Finder can tap "I Found This Item" → send a message, optionally share current location and a photo.
- Finder never sees the owner's personal contact info unless the owner explicitly made it public.
- Submission creates an off-chain "finder report" tied to the item's on-chain ID, and notifies the owner.

### 4.3 Recover Item
*As an owner*, I want to mark my item as recovered so people know it's no longer missing.

**Acceptance criteria**
- Owner taps "Mark as Recovered" → calls `markRecovered()`.
- Lost alert, reward banner, and finder-report inbox badge clear from the public QR page.
- Ownership history (registration timestamp, past lost/recovered cycles) is preserved, not deleted.

## 5. Functional Requirements

### 5.1 Mark as Lost
- Mark item Lost.
- Add optional reward (in ETN, display-only — see §9 on escrow scope).
- Enter last known location (free text or map pin).
- Add recovery instructions (free text, sanitized/length-capped).
- Update preferred contact method (in-app message, email, phone — owner's choice of what's public).
- Write status + `lastUpdated` timestamp to chain.

### 5.2 Report Found
- "I Found This Item" CTA on the public Lost page.
- Message to owner (required, min/max length).
- Share current location (optional, browser geolocation, explicit consent prompt).
- Upload a photo (optional, client-side compressed before upload).
- Owner identity stays private by default; only surfaced fields the owner opted into "public" are shown.

### 5.3 Mark as Recovered
- One-tap action from dashboard or item detail.
- Clears Lost alert and public reward/instructions.
- Keeps full ownership + status-change history for audit/trust purposes.

## 6. Smart Contract Requirements

### 6.1 Data model — `Item` struct
| Field | Type | Notes |
|---|---|---|
| `registrationId` | `uint256` | Auto-incrementing / derived ID |
| `owner` | `address` | Current owner wallet |
| `itemHash` | `bytes32` | Hash of off-chain metadata (name, photo, serial) — keeps PII off-chain |
| `registeredAt` | `uint256` | Block timestamp at registration |
| `status` | `Status` enum | Active / Lost / Recovered |
| `lastUpdated` | `uint256` | Block timestamp of last status change |

### 6.2 Status enum
```solidity
enum Status { Active, Lost, Recovered }
```

### 6.3 Functions
- `registerItem(bytes32 itemHash) → uint256 registrationId`
- `verifyItem(uint256 registrationId) → Item` (view)
- `markLost(uint256 registrationId)` — only owner
- `markRecovered(uint256 registrationId)` — only owner
- `getItem(uint256 registrationId) → Item` (view)

### 6.4 Events
- `ItemRegistered(uint256 indexed registrationId, address indexed owner, bytes32 itemHash, uint256 timestamp)`
- `ItemMarkedLost(uint256 indexed registrationId, uint256 timestamp)`
- `ItemRecovered(uint256 indexed registrationId, uint256 timestamp)`
- `ItemVerified(uint256 indexed registrationId, address indexed verifier, uint256 timestamp)`

### 6.5 Explicit non-goals for v1 contract
- **No on-chain reward escrow.** Reward amounts are display-only metadata for v1; do not build a payable escrow/claim flow unless the client explicitly asks — that's a distinct, higher-risk feature (fund custody, dispute resolution, anti-fraud) and should be scoped separately.
- **No PII on-chain.** Names, phone numbers, exact addresses, and photos never go into contract storage or calldata that's cheaply readable as plaintext — only hashes/pointers (e.g., an off-chain DB row ID or IPFS CID of encrypted metadata).

## 7. QR Sticker Requirements
- Every sticker prints a static caption regardless of item status, so a finder unfamiliar with Recover knows what to do: **"SCAN IF FOUND — recover.app"** (default, editable per item).
- Caption is independent of on-chain status — only the destination page content changes.
- Sticker template (PNG/SVG, downloadable) includes: QR code, caption, optional Recover logo, adequate quiet-zone margin so print/lamination doesn't break scannability.

## 8. Screens

### 8.1 Lost Item Dashboard
- Lists Active / Lost / Recovered items (tabs or filter).
- Quick actions per item: Mark Lost, Mark Recovered, Download QR Code, Edit contact preferences.

### 8.2 Lost Item Details
- Item info, QR code, lost date, last known location, reward (if any), finder contact requests (inbox), recovery timeline (registered → lost → found reports → recovered).

### 8.3 Found Item Page (public, no auth)
- ⚠️ Lost Item notice, item photo, basic description, reward (optional), "Contact Owner" button, "I Found This Item" button.
- No sensitive owner data unless owner made it public.

## 9. Notifications
Owners are notified when:
- Someone scans their QR code (rate-limited/deduped so this isn't spammy — e.g., digest, not per-scan).
- Someone submits a "found" report.
- A message is received from a finder.
- Their item is marked recovered.

## 10. Future Enhancements (not in v1 scope)
- Live location sharing between owner and finder (opt-in, time-boxed).
- Integration with university/corporate lost-and-found offices.
- Police and transport-terminal portals.
- NFC tags as a QR alternative.
- AI-assisted matching of found items without a QR sticker (image similarity search).

## 11. Non-Functional Requirements
- **Privacy by default:** owner PII never public unless explicitly opted in.
- **No wallet required to report a find.** The finder flow must work for a non-crypto-native person scanning with a phone camera.
- **Low-cost writes.** Electroneum's low, predictable fees make frequent status updates (`markLost`/`markRecovered`) economically viable — design the contract to avoid unnecessary storage writes (pack struct fields, avoid arrays that grow unbounded on-chain — keep the finder-report inbox off-chain).
- **Accessibility:** WCAG 2.1 AA for all public-facing pages (QR landing pages especially — a finder is a first-time, possibly non-technical visitor).
