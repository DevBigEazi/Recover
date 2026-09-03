"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, Lock, Smartphone, Bot } from "lucide-react";

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
                <span className="font-bold tracking-tight text-primary">Dual Protocol</span>
                <span className="text-neutral-slate/40 font-light">·</span>
                <span className="font-medium text-neutral-slate">Valuables &amp; Logistics Tracking</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl lg:text-6xl leading-tight">
                Smart Physical Item Protection &amp; Logistics Verification
              </h1>
              
              <p className="text-sm sm:text-lg text-neutral-slate leading-relaxed max-w-2xl mx-auto">
                Recover protects everyday personal valuables with scannable QR stickers and powers commercial logistics package tracking with tamper-proof dispatches and real-time Web Push alerts.
              </p>

              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  Personal Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                
                <Link
                  href="/shipments"
                  className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-gray-300 text-primary font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-xs text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4 text-indigo-600" /> Logistics Workspace
                </Link>
              </div>
            </div>
          </div>

          {/* Ambient background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 sm:w-125 h-87.5 sm:h-125 bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />
        </section>

        {/* Dual Capabilities Showcase Section */}
        <section className="py-10 sm:py-16 bg-neutral-white/60 border-t border-b border-neutral-mist/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-primary font-display sm:text-3xl">
                One Platform, Two Powerful Workspaces
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-slate">
                Whether protecting personal belongings or managing commercial package dispatches, Recover provides complete visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Personal Valuables Recovery */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-accent uppercase tracking-wider">For Individuals</span>
                  <h3 className="text-lg font-bold text-primary font-display mt-0.5">Personal Item Protection</h3>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Protect phones, laptops, keys, wallets, and pets. Print scannable QR stickers with private contact options. Finders scan without creating an account or paying fees.
                </p>
                <div className="pt-2">
                  <Link href="/register" className="text-xs font-bold text-accent hover:text-accent/80 inline-flex items-center gap-1">
                    Register a Valued Item →
                  </Link>
                </div>
              </div>

              {/* Option 2: Logistics & Package Tracking */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">For Logistics Merchants</span>
                  <h3 className="text-lg font-bold text-primary font-display mt-0.5">Delivery Package Verification</h3>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Manage commercial shipments with dual-layer QR sticker printing, real-time web push dispatch alerts, handover verification PINs, and developer REST APIs (`/api/v1/shipments`).
                </p>
                <div className="pt-2">
                  <Link href="/shipments" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1">
                    Open Logistics Workspace →
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
                Privacy-First Architecture
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-slate">
                Engineered with privacy defaults to keep your personal data safe while making item recovery effortless.
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
                  Your personal details stay protected by default. We never expose your home address or primary phone number publicly.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">No App Download Required</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Anyone scanning a lost item or package QR sticker views status and submits reports directly from their mobile browser.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Flexible Handover & PINs</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Coordinate safe public meetups or dispatch couriers. Verify physical handovers with secret PIN matches.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">AI Recovery Assistance</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Let AI suggest customized recovery instructions, help finders draft return notes, and summarize location coordinates.
                </p>
              </div>
            </div>

            {/* Bottom Callout Banner */}
            <div className="mt-12 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-neutral-mist hover:bg-neutral-mist/80 border border-neutral-mist text-primary font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                View Transparent Pricing & Subscription Tiers <ArrowRight className="w-4 h-4 text-accent" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
