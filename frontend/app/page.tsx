"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Lock, Smartphone, Bot, Receipt, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto">
              {/* Tagline Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] sm:text-xs text-primary shadow-2xs hover:border-accent/40 transition-all select-none backdrop-blur-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="font-bold tracking-tight text-primary">Three-Pillar Protocol</span>
                <span className="text-neutral-slate/40 font-light">·</span>
                <span className="font-medium text-neutral-slate">Receipts, Shipments &amp; Asset Protection</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl lg:text-6xl leading-tight">
                Smart Physical Item Protection, Digital Receipts &amp; Logistics
              </h1>
              
              <p className="text-sm sm:text-lg text-neutral-slate leading-relaxed max-w-2xl mx-auto">
                Recover bridges physical assets with digital certainty — empowering SME merchants with fast digital POS receipts, securing commercial packages with tamperproof custody tracking, and protecting everyday valuables with scannable QR stickers.
              </p>

              {/* 3 Core Action CTAs */}
              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  href="/workspace"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-6 py-3.5 text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" /> POS &amp; Receipts Workspace
                </Link>
                
                <Link
                  href="/shipments"
                  className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-neutral-slate/20 text-primary font-semibold rounded-xl px-6 py-3.5 text-sm transition-all shadow-xs text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4 text-indigo-600" /> Logistics Dispatch
                </Link>

                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-neutral-slate/20 text-primary font-semibold rounded-xl px-6 py-3.5 text-sm transition-all shadow-xs text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-accent" /> Personal Items Vault
                </Link>
              </div>
            </div>
          </div>

          {/* Ambient background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 sm:w-125 h-87.5 sm:h-125 bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />
        </section>

        {/* Three Capabilities Showcase Section */}
        <section className="py-10 sm:py-16 bg-neutral-white/60 border-t border-b border-neutral-mist/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-primary font-display sm:text-3xl">
                One Platform, Three Interconnected Pillars
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-slate">
                Whether issuing retail receipts, managing commercial package dispatches, or securing personal belongings, Recover provides complete visibility and trust.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1: Digital Receipts & POS */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">For Retailers &amp; SMEs</span>
                    <h3 className="text-lg font-bold text-primary font-display mt-0.5">Proof of Purchase (Receipts)</h3>
                  </div>
                  <p className="text-xs text-neutral-slate leading-relaxed">
                    Rapid point-of-sale receipt terminal with multi-item carts, credit sales, debtor tracking, automated sales analytics, and a 1-tap consumer protection bridge.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-mist/60">
                  <Link href="/workspace" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1">
                    Open Receipts Workspace →
                  </Link>
                </div>
              </div>

              {/* Pillar 2: Logistics & Commercial Shipments */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">For Logistics &amp; Couriers</span>
                    <h3 className="text-lg font-bold text-primary font-display mt-0.5">Proof of Custody (Shipments)</h3>
                  </div>
                  <p className="text-xs text-neutral-slate leading-relaxed">
                    Tamperproof package dispatches with dual-layer QR stickers, courier delivery manifests, real-time web push dispatch alerts, and scratch-off PIN handovers.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-mist/60">
                  <Link href="/shipments" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                    Open Logistics Dispatch →
                  </Link>
                </div>
              </div>

              {/* Pillar 3: Personal Valuables Recovery */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider">For Individuals &amp; Families</span>
                    <h3 className="text-lg font-bold text-primary font-display mt-0.5">Proof of Ownership (Items)</h3>
                  </div>
                  <p className="text-xs text-neutral-slate leading-relaxed">
                    Protect smartphones, laptops, keys, wallets, and pets. Print scannable QR stickers with private contact options. Finders scan with zero apps or fees.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-mist/60">
                  <Link href="/register" className="text-xs font-bold text-accent hover:text-accent/80 inline-flex items-center gap-1">
                    Register a Valued Item →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-neutral-white py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
              <h2 className="text-2xl font-bold text-primary font-display sm:text-4xl">
                Privacy-First Architecture &amp; Team Controls
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-slate">
                Engineered with privacy defaults, multi-user role boundaries, and permanent immutable audit trails.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Privacy-First Protection</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Your personal details stay protected by default. We never expose your home address, primary phone number, or receipt receipts publicly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">No App Download Required</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Anyone scanning a lost item sticker, package QR, or digital receipt views status and submits updates directly from their mobile browser.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-emerald-500/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl w-max text-emerald-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Teams &amp; Branch Controls</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Collaborate securely with granular Owner, Manager, and Sales Rep roles, multi-branch store support, and PIN-based email staff logins.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">AI Recovery Assistance</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Let Google Gemini suggest tailored recovery instructions, assist finders with return notes, and summarize location coordinates.
                </p>
              </div>
            </div>

            {/* Bottom Callout Banner */}
            <div className="mt-12 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-neutral-mist hover:bg-neutral-mist/80 border border-neutral-mist text-primary font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                View Transparent Pricing &amp; Merchant Plans <ArrowRight className="w-4 h-4 text-accent" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
