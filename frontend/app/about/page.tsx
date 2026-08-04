"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, Truck, Lock, Smartphone, Bot, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Register Your Valuables or Commercial Packages",
      desc: "Sign in with Google, Email, or Social account. Register personal items (phones, laptops, keys) or commercial logistics packages (`/shipments`). Leverage AI to automatically generate context-specific recovery instructions.",
    },
    {
      num: "02",
      title: "Print & Attach Scannable QR Sticker",
      desc: "Download and print your sticker in preferred size presets: Mini (~10mm for keychains & chargers), Standard (~25mm for phones & wallets), or Large (~50mm for laptops & luggage dispatches).",
    },
    {
      num: "03",
      title: "Instant Mobile QR Scan & Real-Time Alerts",
      desc: "When an item is lost or package scanned in transit, anyone with a phone camera lands on a mobile verification page (`/verify/[id]` or `/scan/[id]`). Real-time Web Push alerts immediately notify the owner/merchant.",
    },
    {
      num: "04",
      title: "Private Handover & Handshake PIN Verification",
      desc: "Coordinate a safe public meetup, arrange a local courier, or verify package delivery. Complete the return by matching secret verification PINs to update the state to Recovered or Delivered.",
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
              Recover bridges physical items with smart digital protection. Protect personal valuables with scannable QR stickers and power commercial logistics dispatches with tamper-proof package tracking.
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
                  <Lock className="w-4 h-4 text-accent" /> Privacy-First Protection
                </h4>
                <p className="text-neutral-slate">
                  We never expose plain-text personal details (such as home address or primary phone numbers) on the public internet. Your identity remains private.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-accent" /> No App Required
                </h4>
                <p className="text-neutral-slate">
                  Finders and package handlers do not need to install an app, create an account, or complete a technical setup. They scan and communicate instantly from any mobile browser.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" /> Commercial Logistics API
                </h4>
                <p className="text-neutral-slate">
                  Merchants can programmatically create dispatches, track chain of custody, and receive instant webhooks via `/api/v1/shipments`.
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-accent" /> AI Safety Insights
                </h4>
                <p className="text-neutral-slate">
                  Our system automatically analyzes report coordinates and translates them into semantic context to give you clear safety guidance.
                </p>
              </div>
            </div>
          </div>

          {/* Sticker Guidelines Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">QR Code Sticker Guidelines</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Maximize the chances of your lost items being safely recovered or commercial packages verified.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-xs sm:text-sm">
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-bold text-primary">Best Placement Spots:</h4>
                <ul className="space-y-1.5 sm:space-y-2 text-neutral-slate list-disc pl-5 leading-relaxed">
                  <li><strong>Wallets &amp; Purses:</strong> Place the sticker on the inside cover or a prominent card slot.</li>
                  <li><strong>Electronics:</strong> Back of laptops, tablets, or under phone cases.</li>
                  <li><strong>Keys &amp; Bags:</strong> Attach to keychains, luggage tags, or backpack strap tags.</li>
                  <li><strong>Commercial Shipping Containers:</strong> Top-right corner of package boxes or tamper seals.</li>
                </ul>
              </div>
              
              <div className="space-y-2 sm:space-y-3 bg-neutral-mist/35 p-5 sm:p-6 rounded-xl border border-neutral-mist">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ready to Protect Your Valuables?
                </h4>
                <p className="text-neutral-slate leading-relaxed">
                  Start protecting your belongings with scannable QR stickers today, or check out our transparent pricing plans.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link href="/register" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    Register Personal Item <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href="/pricing" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    View Pricing Tiers <ArrowRight className="w-3.5 h-3.5" />
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
