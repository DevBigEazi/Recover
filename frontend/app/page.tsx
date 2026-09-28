"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, Smartphone, Sparkles, QrCode, Key, CheckCircle } from "lucide-react";

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
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-accent uppercase tracking-wider select-none shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Decentralized Lost &amp; Found Protocol
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl lg:text-6xl leading-tight">
                Protect Your Everyday Valuables. <br />
                <span className="text-accent">Recover What Matters.</span>
              </h1>
              
              <p className="text-sm sm:text-lg text-neutral-slate leading-relaxed max-w-2xl mx-auto">
                Recover pairs your physical belongings — phones, laptops, keys, wallets, and bags — with printable QR stickers and a privacy-preserving smart contract. Good samaritans can report found items in seconds with zero apps to install.
              </p>

              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  href="/register"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  Protect Items Free <ArrowRight className="w-4 h-4" />
                </Link>
                
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-neutral-white hover:bg-neutral-mist border border-gray-300 text-primary font-semibold rounded-xl px-8 py-3.5 text-sm transition-all shadow-xs text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-accent" /> Owner Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Ambient background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-87.5 sm:w-125 h-87.5 sm:h-125 bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />
        </section>

        {/* 3-Step Visual Recovery Workflow */}
        <section className="py-10 sm:py-16 bg-neutral-white border-t border-b border-neutral-mist/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">How It Works</span>
              <h2 className="text-2xl font-bold text-primary font-display sm:text-3xl">
                Peace of Mind in Three Simple Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold font-mono text-lg">
                  1
                </div>
                <h3 className="text-lg font-bold text-primary font-display">Register &amp; Print Stickers</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Add your valuables to your private dashboard. Download high-resolution vector QR stickers in Mini (10mm), Standard (25mm), or Large (50mm).
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold font-mono text-lg">
                  2
                </div>
                <h3 className="text-lg font-bold text-primary font-display">Zero-Friction Finder Scan</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  If your item is lost, anyone with a smartphone camera scans your sticker. They land on a secure mobile page to send GPS coordinates and return notes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold font-mono text-lg">
                  3
                </div>
                <h3 className="text-lg font-bold text-primary font-display">Safe Handshake &amp; Return</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Receive instant Web Push and email alerts. Coordinate a public meetup or courier handover verified by your secret one-time PIN.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16 space-y-2">
              <h2 className="text-2xl font-bold text-primary font-display sm:text-4xl">
                Privacy-First Architecture
              </h2>
              <p className="text-xs sm:text-sm text-neutral-slate">
                Engineered with privacy defaults to keep your personal data safe while making item recovery effortless.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Shielded Identity</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Your personal phone number and home address are never written on physical stickers. All initial communications pass through the secure inbox platform.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">No App Download</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Finders never need to download an app or sign up. Any mobile browser loads the verification page in under 1.5 seconds.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">Handover PIN Verification</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Ensure physical possession is restored with a secret verification PIN before the item status is finalized on-chain as Recovered.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-accent/40 transition-colors shadow-xs">
                <div className="p-2.5 bg-accent/10 rounded-xl w-max text-accent">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary font-display">AI Location Insights</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Google Gemini 2.0 automatically translates raw finder GPS coordinates into clear, recognizable landmarks and neighborhood summaries.
                </p>
              </div>
            </div>

            {/* Bottom Callout Banner */}
            <div className="mt-12 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                View Transparent Pricing &amp; Details <ArrowRight className="w-4 h-4 text-accent" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
