"use client";

import Header from "@/components/Header/Header";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-mist">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-xs font-bold text-accent uppercase tracking-wider select-none animate-pulse">
              🛡️ Electroneum Mainnet Registry
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-primary font-display sm:text-5xl lg:text-6xl leading-tight">
              On-Chain Security for Your Physical Valuables
            </h1>
            
            <p className="text-md sm:text-lg text-neutral-slate leading-relaxed max-w-2xl mx-auto">
              Recover is a decentralized lost-and-found protocol. Attach secure, cryptographic QR stickers to your bags, keys, and devices, and coordinate recoveries privately without exposing your identity.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-8 py-3.5 text-sm transition-colors shadow-xs text-center cursor-pointer"
              >
                Go to Dashboard
              </Link>
              
              <Link
                href="/about"
                className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-gray-300 text-primary font-semibold rounded-lg px-8 py-3.5 text-sm transition-colors shadow-xs text-center cursor-pointer"
              >
                How It Works
              </Link>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />
      </section>

      {/* Feature Grid */}
      <section className="bg-neutral-white border-t border-neutral-mist py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-primary font-display sm:text-4xl">
              Privacy-First Recoveries
            </h2>
            <p className="mt-2 text-sm text-neutral-slate">
              Engineered with security defaults to protect user identities and coordinate drop-offs safely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-8 space-y-4">
              <div className="p-3 bg-[#1e2a4a0a] rounded-xl w-max text-2xl">
                🔒
              </div>
              <h3 className="text-lg font-bold text-primary font-display">On-Chain Signatures</h3>
              <p className="text-sm text-neutral-slate leading-relaxed">
                We never store personal details on-chain. Only secure, client-side cryptographic metadata hashes are committed to Electroneum, preserving ledger privacy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-8 space-y-4">
              <div className="p-3 bg-[#1e2a4a0a] rounded-xl w-max text-2xl">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-primary font-display">Frictionless Scanner Portal</h3>
              <p className="text-sm text-neutral-slate leading-relaxed">
                Strangers scanning the physical sticker require zero wallets, extensions, or gas coins. The verify portal is public, instant, and mobile-optimized.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-8 space-y-4">
              <div className="p-3 bg-[#1e2a4a0a] rounded-xl w-max text-2xl">
                📬
              </div>
              <h3 className="text-lg font-bold text-primary font-display">Anonymous Inbox</h3>
              <p className="text-sm text-neutral-slate leading-relaxed">
                Finder reports are processed entirely off-chain. Coordinate meetup locations and receive email alerts without exposing phone numbers or private accounts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
