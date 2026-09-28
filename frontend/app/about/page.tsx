"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, Lock, Smartphone, Bot, CheckCircle2, ShieldCheck, Key } from "lucide-react";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Register Your Personal Valuables",
      desc: "Sign in with Google, Email, or Web3 wallet. Register your everyday valuables (phones, laptops, keys, wallets, bags, pets). For phones, an emergency alternate contact is configured to guarantee you can always be reached.",
    },
    {
      num: "02",
      title: "Print & Attach Scannable QR Sticker",
      desc: "Download and print your sticker in preferred size presets: Mini (~10mm for keychains & AirPods), Standard (~25mm for phones & wallets), or Large (~50mm for laptops & luggage).",
    },
    {
      num: "03",
      title: "Instant Mobile QR Scan & Real-Time Alerts",
      desc: "When an item is lost and scanned, anyone with a phone camera opens a lightweight verification page (`/verify/[id]`). Real-time Web Push and email alerts immediately notify you with GPS coordinates.",
    },
    {
      num: "04",
      title: "Private Handover & Handshake PIN Verification",
      desc: "Coordinate a safe public meetup or local drop-off. Complete the return by matching secret verification PINs to update the state to Recovered on the Electroneum smart contract.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          
          {/* Banner Section */}
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-5xl">
              How Recover Works
            </h1>
            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              Recover bridges physical belongings with decentralized digital protection. Protect personal valuables with scannable QR stickers and enable safe, confidential returns.
            </p>
          </div>

          {/* Step-by-Step Recovery Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-neutral-white border border-neutral-mist rounded-2xl p-5 sm:p-8 shadow-xs hover:shadow-md transition-shadow duration-200 flex gap-3.5 sm:gap-4"
              >
                <span className="text-xl sm:text-2xl font-bold font-mono text-accent shrink-0 select-none">
                  {step.num}
                </span>
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-primary font-display">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy & Security Safeguards Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">Built-In Security &amp; Privacy Safeguards</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Your security and personal privacy are protected by design at every step.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs leading-relaxed">
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-accent" /> Shielded Identity
                </h4>
                <p className="text-neutral-slate">
                  We never expose plain-text personal details (such as home address or primary phone numbers) on physical stickers. Your identity remains private.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-accent" /> No App Required
                </h4>
                <p className="text-neutral-slate">
                  Finders do not need to install an app, create an account, or complete a technical setup. They scan and communicate instantly from any mobile browser.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-accent" /> PIN-Gated Handshake
                </h4>
                <p className="text-neutral-slate">
                  Confirm physical custody before marking an item recovered with a one-time cryptographic handover PIN.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-accent" /> AI Location Insights
                </h4>
                <p className="text-neutral-slate">
                  Google Gemini 2.0 translates raw GPS coordinates into clear neighborhood context and safe recovery recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Sticker Guidelines Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">QR Code Sticker Guidelines</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Maximize the chances of your lost items being safely recovered.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs sm:text-sm">
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-bold text-primary">Best Placement Spots:</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-neutral-slate list-disc pl-5 leading-relaxed">
                  <li><strong>Wallets &amp; Purses:</strong> Place the sticker on the inside cover or a prominent card slot.</li>
                  <li><strong>Electronics:</strong> Back of laptops, tablets, or under transparent phone cases.</li>
                  <li><strong>Keys &amp; Bags:</strong> Attach to keychains, luggage tags, or backpack strap tags.</li>
                  <li><strong>Bicycles &amp; Gear:</strong> Underneath the seatpost, frame tube, or helmet exterior.</li>
                </ul>
              </div>
              
              <div className="space-y-2 sm:space-y-3 bg-neutral-mist/35 p-5 sm:p-6 rounded-xl border border-neutral-mist">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Ready to Protect Your Valuables?
                </h4>
                <p className="text-neutral-slate leading-relaxed">
                  Start protecting your belongings with scannable QR stickers today with zero upfront cost.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link href="/register" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    Register Personal Item <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/pricing" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    View Pricing &amp; Fees <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
