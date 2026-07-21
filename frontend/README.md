## Electroneum DApp Frontend - next-ts-thirdweb-foundry

This is the frontend of your Electroneum DApp, built with **Next.js 16**, **React 19**, and **thirdweb SDK v5**.

### Environment Setup

Before starting, create a `.env` or `.env.local` file in the root of the `frontend/` directory (or use your project root `.env` if workspaces share it):

```env
# Required for thirdweb client initialization (get it from thirdweb.com/dashboard)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here
```

### Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Folder Structure

- `app/`: Next.js App Router pages and layouts (including `/settings` with Push Notification toggle preferences).
- `components/`: UI components (including `Header` with responsive mobile slide-out sidebar drawer).
- `hooks/`: Custom thirdweb React hooks for contract interaction.
- `lib/`: thirdweb client configuration and Web Push service utilities.
- `constants/`: ABI files and deployed contract addresses.

### PWA & Notification Features

- **Push Notification Toggle**: Manage real-time VAPID push notification subscriptions directly on the `/settings` page.
- **Mobile Navigation Sidebar Drawer**: Touch-friendly, slide-out sidebar navigation with backdrop overlay.

