## Electroneum DApp Frontend - next-ts-thirdweb-foundry

This is the frontend of your Electroneum DApp, built with **Next.js 16**, **React 19**, and **thirdweb SDK v5**.

### Environment Setup

Before starting, create a `.env` or `.env.local` file in the root of the `frontend/` directory (or use your project root `.env` if workspaces share it):

```env
# Database, App URL & Web3
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_APP_URL=https://userecover.xyz
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here
NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS=0x67648938d99bd1809987F18a09f427D8da6C88fd
NEXT_PUBLIC_RECOVER_SHIPMENT_CONTRACT_ADDRESS=0xce4bF97e85212d9121e52c3F6fb2C8021Bf30012
BACKEND_SIGNER_PRIVATE_KEY=0x...   # Gasless relayer and serverAuth admin key

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI, Email & Push Notifications
GEMINI_API_KEY=your_gemini_api_key_here
RESEND_API_KEY=re_...
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Folder Structure

- `app/`: Next.js App Router pages and layouts (`/dashboard`, `/items/[id]`, `/verify/[id]`, `/shipments`, `/scan/[id]`, `/developers`, `/settings`).
- `components/`: UI components (including `Header` mobile sidebar drawer, `StickerStudioModal`, `BatchStickerStudioModal`, and pricing modals).
- `constants/`: ABI files, contract addresses, and centralized `sticker.ts` size specifications (`STICKER_SIZES`).
- `hooks/`: Custom thirdweb React hooks for contract interaction and TanStack Query state synchronization.
- `lib/`: Mongoose database schemas (`db.ts`), Open Graph and metadata origin helper (`metadata.ts`), Server auth and JWT signing (`server-auth.ts`), Stripe checkout client (`stripe.ts`), Currency FX engine (`currency.ts`), Web Push service utilities (`push.ts`), and AI engine helper (`ai.ts`).

### Core Features & Integrations

- **Enterprise Logistics Tracking (`/shipments`, `/scan/[id]`)**: Commercial package dispatching with scratch-off handover PINs (`RCVR-XXXX`), courier dispatch manifests, dual WhatsApp link generation, and real-time chain-of-custody updates.
- **Personal Lost & Found Recovery (`/items/[id]`, `/verify/[id]`)**: Item registration with category validation, trusted alternate contact prompts for phones, finder inbox, and Stripe report detail unlocks ($3.50 for Phone, $1.50 for Other).
- **Logistics Developer REST API (`/developers`, `/api/v1/shipments`)**: Standardized B2B endpoints for package dispatch, status querying, dispute handling, and webhooks with `x-api-key` header authorization.
- **Cryptographic Signed Wallet Challenge Session Auth (`/api/auth/token`)**: Secure server authentication flow requiring a signed wallet challenge (signature matching SIWE login payload or nonce) before issuing HTTP-only JWT session cookies.
- **Multi-Item Batch Sticker Studio (A4 Sheet)**: Enables users and merchants to register multiple items and print high-resolution sticker grids (Mini 10mm, Standard 25mm, Large 50mm) on single A4 sheets.
- **AI Suggested Recovery & Location Insights**: Gemini 2.0 Flash integration generating context-aware return instructions and semantic safety analysis for GPS coordinates.
- **Stripe & Adaptive Multi-Currency Engine**: Dynamic FX conversion (`lib/currency.ts`) formatting subscription plans ($6, $15, $45, $100/mo) and report unlocks into local currencies.
- **Progressive Web App (PWA)**: Mobile-optimized with service worker (`public/sw.js`) and web manifest (`public/manifest.json`).
