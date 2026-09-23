"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, Truck, Lock, Smartphone, Bot, Receipt, Users, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  const steps = [
    {
      num: "01",
      title: "Issue Digital Receipts or Register Physical Assets",
      desc: "Retailers issue itemized digital receipts via the POS terminal, logistics operators create commercial package dispatches, and individuals protect everyday valuables. Retail buyers can instantly convert purchased items into protected vault items with 1-tap.",
    },
    {
      num: "02",
      title: "Smart Scannable QR Codes & Labels",
      desc: "Receipts embed cryptographic verification QRs, packages receive dual-layer dispatch labels with inner scratch-off secrets, and personal items use precision QR stickers (Mini ~10mm, Standard ~25mm, or Large ~50mm).",
    },
    {
      num: "03",
      title: "Zero-App Mobile Scan & Real-Time Alerts",
      desc: "When a receipt is checked, a shipment scanned in transit, or a lost item found, scanning with any smartphone camera opens an instant mobile web page. Real-time Web Push alerts immediately notify the owner, merchant, or recipient.",
    },
    {
      num: "04",
      title: "Cryptographic Handshakes, Audits & Handovers",
      desc: "Verify physical handovers and deliveries using secret scratch-off PIN matches. Every merchant sale, void action, and custody event is permanently captured in an immutable audit trail with multi-branch actor tracking.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          
          {/* Banner Section */}
          <div className="text-center space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] sm:text-xs text-primary shadow-2xs select-none backdrop-blur-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="font-bold tracking-tight text-primary">Protocol Overview</span>
              <span className="text-neutral-slate/40 font-light">·</span>
              <span className="font-medium text-neutral-slate">Trust &amp; Commerce Protocol</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-5xl">
              How Recover Works
            </h1>
            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              Recover bridges physical items with smart digital proof across three interconnected pillars — Point-of-Sale digital receipts for retailers, tamperproof commercial package tracking for delivery teams and dispatch riders, and privacy-first recovery for personal valuables.
            </p>
          </div>

          {/* Step-by-Step Architecture Section */}
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
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">Built-In Security &amp; Trust Safeguards</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Your data integrity, enterprise roles, and personal privacy are protected by design at every step.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-xs leading-relaxed">
              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-accent" /> Privacy-First Protection
                </h4>
                <p className="text-neutral-slate">
                  We never expose plain-text personal details (such as home address, personal phone numbers, or receipts) publicly. Identity stays private.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-accent" /> Zero-App Mobile Access
                </h4>
                <p className="text-neutral-slate">
                  Finders, delivery drivers, dispatch riders, and retail customers scan and communicate instantly from any standard mobile browser without app downloads.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" /> Multi-Branch Team Roles
                </h4>
                <p className="text-neutral-slate">
                  SME merchants collaborate securely with Owner, Manager, and Sales Rep role permissions, multi-branch store controls, and PIN-based staff logins.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" /> Permanent Audit Trails
                </h4>
                <p className="text-neutral-slate">
                  Every transaction issuance, void with reason, or credit settlement captures an immutable snapshot of the actor and branch for complete accountability.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" /> Commercial Logistics REST API
                </h4>
                <p className="text-neutral-slate">
                  Logistics merchants can programmatically create tamperproof dispatches, generate dual-layer QR shipping labels, and verify deliveries via API.
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h4 className="font-bold text-primary flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-accent" /> AI Safety &amp; Recovery Insights
                </h4>
                <p className="text-neutral-slate">
                  Google Gemini 2.0 automatically analyzes report coordinates to offer semantic safety context and assists owners with tailored recovery guidance.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Pathways */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-4 sm:space-y-6">
            <div className="border-b border-neutral-mist pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display">Get Started with Recover</h2>
              <p className="text-xs text-neutral-slate mt-1">
                Choose the workspace that fits your workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm">
              <div className="space-y-2 bg-neutral-mist/35 p-5 rounded-xl border border-neutral-mist flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-primary flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" /> Merchant POS &amp; Receipts
                  </h4>
                  <p className="text-xs text-neutral-slate leading-relaxed mt-1">
                    Issue digital receipts, track debtors, review analytics, and manage store branches.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/workspace" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                    Open Merchant Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="space-y-2 bg-neutral-mist/35 p-5 rounded-xl border border-neutral-mist flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-primary flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" /> Logistics Dispatch
                  </h4>
                  <p className="text-xs text-neutral-slate leading-relaxed mt-1">
                    Dispatch commercial packages, print rider delivery manifests, and track chain of custody.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/shipments" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    Open Logistics Dispatch <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="space-y-2 bg-neutral-mist/35 p-5 rounded-xl border border-neutral-mist flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-accent" /> Personal Valuables
                  </h4>
                  <p className="text-xs text-neutral-slate leading-relaxed mt-1">
                    Protect smartphones, laptops, keys, and pets with scannable QR stickers.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/register" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                    Register Personal Item <ArrowRight className="w-3.5 h-3.5" />
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
