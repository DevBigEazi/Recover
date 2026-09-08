"use client";

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { ArrowRight, KeyRound, UserPlus, Package, ShieldCheck, QrCode } from "lucide-react";
import ApiSandboxConsole from "@/components/Developers/ApiSandboxConsole";
import ApiEndpointsReference from "@/components/Developers/ApiEndpointsReference";
import WebhookGuideSection from "@/components/Developers/WebhookGuideSection";

export default function DevelopersPage() {
  const gettingStartedSteps = [
    {
      step: 1,
      icon: <UserPlus className="w-5 h-5 text-indigo-600" />,
      title: "Create a Merchant Account",
      description:
        'Sign up on Recover using Google, Email, Apple or Facebook. During profile setup, select "Logistics & Delivery Merchant" as your account type. This unlocks the shipment tracking workspace and API access.',
      action: "Sign Up as Merchant →",
      actionHref: "/",
    },
    {
      step: 2,
      icon: <KeyRound className="w-5 h-5 text-amber-600" />,
      title: "Generate Your Secret API Key",
      description:
        'Open your Settings page and scroll to the Developer REST API section. Click "Generate API Key" to create a secret key in the format rec_live_.... Copy this key securely — it authenticates all your server-to-server API calls.',
      action: "Go to Settings →",
      actionHref: "/settings",
    },
    {
      step: 3,
      icon: <Package className="w-5 h-5 text-emerald-600" />,
      title: "Register Your First Dispatch",
      description:
        "Call POST /api/v1/shipments/create with your API key in the Authorization header. The response returns a unique packageId, consumer trackingCode, RCVR-prefixed handover secret (innerSecret), and shipment record.",
      action: "See Code Example ↓",
      actionHref: "#endpoints",
    },
    {
      step: 4,
      icon: <QrCode className="w-5 h-5 text-indigo-600" />,
      title: "Print & Affix API-Generated QR Sticker",
      description:
        "Every shipment creation call automatically returns ready-to-print `qrImageUrl` and `scanUrl` links, plus a dedicated `GET /api/v1/shipments/[id]/qr` endpoint for SVG/PNG label printing onto boxes or poly-mailers.",
    },
    {
      step: 5,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Complete Delivery with PIN Handover",
      description:
        "At delivery, the recipient provides their secret scratch-off PIN. The recipient or rider enters it on the scan page (or your backend calls POST /api/v1/shipments/[id]/verify). On match, the package status updates to Verified and your webhook fires.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-12">
          {/* Hero Banner Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] sm:text-xs text-primary shadow-2xs hover:border-indigo-500/40 transition-all select-none backdrop-blur-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="font-bold tracking-tight text-primary">Developer API</span>
              <span className="text-neutral-slate/40 font-light">·</span>
              <span className="font-medium text-neutral-slate">REST API &amp; Webhooks</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl">
              Integrate Recover Package Tracking
            </h1>

            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              Programmatically create tamper-proof dispatches, generate dual-layer QR stickers, verify PIN handovers,
              and stream real-time logistics webhooks directly into your ERP or e-commerce store.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <a
                href="#getting-started"
                className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                Getting Started Guide <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#endpoints"
                className="bg-neutral-white border border-neutral-mist text-primary text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                API Reference
              </a>
              <Link
                href="/pricing"
                className="bg-neutral-white border border-neutral-mist text-primary text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                View Quota Tiers
              </Link>
            </div>
          </div>

          {/* Getting Started: Step-by-Step Guide */}
          <div id="getting-started" className="space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display">
                Getting Started: From Sign-Up to First Dispatch
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Follow these 5 steps to go from zero to a fully automated package tracking integration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gettingStartedSteps.map((s) => (
                <div
                  key={s.step}
                  className={`bg-neutral-white border border-neutral-mist rounded-2xl p-5 shadow-xs space-y-3 relative ${
                    s.step <= 3 ? "" : "md:col-span-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-white font-extrabold text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-xs">
                      {s.step}
                    </span>
                    {s.icon}
                    <h3 className="text-sm font-bold text-primary">{s.title}</h3>
                  </div>

                  <p className="text-xs text-neutral-slate leading-relaxed">{s.description}</p>

                  {s.action && s.actionHref && (
                    <Link
                      href={s.actionHref}
                      className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {s.action}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Authentication Guide */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" /> Authentication
            </h2>

            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
              All authenticated endpoints require your secret API key. You can pass it in one of two ways:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-2">
                <span className="font-bold text-primary block">Option 1: Authorization Header (Recommended)</span>
                <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-1 rounded block text-[11px]">
                  Authorization: Bearer rec_live_8f921a4b901e23f...
                </code>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-2">
                <span className="font-bold text-primary block">Option 2: Custom Header</span>
                <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-1 rounded block text-[11px]">
                  x-api-key: rec_live_8f921a4b901e23f...
                </code>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
              <strong>🔒 Security:</strong> Never expose your API key in client-side browser code. Only use it in
              server-to-server calls from your backend (Node.js, Python, PHP, etc.). If your key is compromised, roll it
              immediately from{" "}
              <Link href="/settings" className="font-bold underline">
                Settings
              </Link>
              .
            </div>
          </div>

          {/* Interactive REST API Console / Playground */}
          <ApiSandboxConsole />

          {/* Endpoints Reference Section with Language Switcher */}
          <ApiEndpointsReference />

          {/* Webhook Guide, Status Codes, and Quotas */}
          <WebhookGuideSection />
        </div>
      </div>

      <Footer />
    </main>
  );
}
