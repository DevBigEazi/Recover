"use client";

import { useState } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { Code, Terminal, Copy, Check, ArrowRight, Server, Globe, KeyRound, UserPlus, Package, Truck, ShieldCheck } from "lucide-react";

export default function DevelopersPage() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<"curl" | "javascript" | "python">("curl");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const codeExamples = {
    createShipment: {
      curl: `curl -X POST https://recoverprotocol.xyz/api/v1/shipments/create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -d '{
    "packageName": "iPhone 15 Pro Dispatch",
    "weight": "0.45",
    "receiverPhone": "+2348012345678"
  }'`,
      javascript: `const response = await fetch('https://recoverprotocol.xyz/api/v1/shipments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...'
  },
  body: JSON.stringify({
    packageName: 'iPhone 15 Pro Dispatch',
    receiverName: 'John Doe',
    receiverPhone: '+2348012345678',
    destination: 'Lekki, Lagos',
    weight: '0.45'
  })
});

const data = await response.json();
console.log('Dispatch Created:', data.packageId, data.innerSecret);`,
      python: `import requests

url = "https://recoverprotocol.xyz/api/v1/shipments/create"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer rec_live_8f921a4b901e23f..."
}
payload = {
    "packageName": "iPhone 15 Pro Dispatch",
    "receiverName": "John Doe",
    "receiverPhone": "+2348012345678",
    "destination": "Lekki, Lagos",
    "weight": "0.45"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
    },
    verifyShipment: {
      curl: `curl -X GET "https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify"`,
      javascript: `const res = await fetch('https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify');
const packageData = await res.json();
console.log('Package Status:', packageData.status); // InTransit | Delivered | Disputed`,
      python: `import requests

res = requests.get("https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify")
print(res.json())`,
    },
    handoverShipment: {
      curl: `curl -X POST "https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/handover" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "nextHandler": "0x3f12a8...", "location": "Ikeja Hub, Lagos" }'`,
      javascript: `const res = await fetch('https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/handover', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ nextHandler: '0x3f12a8...', location: 'Ikeja Hub, Lagos' })
});
const result = await res.json();
console.log('Handover Status:', result.shipment.status);`,
      python: `import requests

res = requests.post(
    "https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/handover",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"nextHandler": "0x3f12a8...", "location": "Ikeja Hub, Lagos"}
)
print(res.json())`,
    },
    confirmDelivery: {
      curl: `curl -X POST "https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos" }'`,
      javascript: `const res = await fetch('https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ innerSecret: 'RCVR-A8F2B1C0', location: 'Lekki, Lagos' })
});
const result = await res.json();
console.log('Delivery Verified:', result.shipment.status);`,
      python: `import requests

res = requests.post(
    "https://recoverprotocol.xyz/api/v1/shipments/pkg_8f912a/verify",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos"}
)
print(res.json())`,
    },

    listShipments: {
      curl: `curl -X GET "https://recoverprotocol.xyz/api/v1/shipments" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..."`,
      javascript: `const res = await fetch('https://recoverprotocol.xyz/api/v1/shipments', {
  headers: { 'Authorization': 'Bearer rec_live_8f921a4b901e23f...' }
});
const shipments = await res.json();
console.log('My Shipments:', shipments.length);`,
      python: `import requests

res = requests.get(
    "https://recoverprotocol.xyz/api/v1/shipments",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."}
)
print(res.json())`,
    },
  };

  const webhookPayloadExample = `{
  "event": "package.delivered",
  "timestamp": "2026-08-03T14:30:00Z",
  "data": {
    "packageId": "RCV-8F912A3B4C5D",
    "companyName": "Big Eazi Logistics",
    "shipperAddress": "0x6e799abd05b044acb6d9a59605de21ec845c2180",
    "packageName": "iPhone 15 Pro Dispatch",
    "status": "Verified",
    "recipient": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    "location": "Lagos, NG",
    "onChainTxHash": "0x8f912a3b4c5d..."
  }
}`;

  const gettingStartedSteps = [
    {
      step: 1,
      icon: <UserPlus className="w-5 h-5 text-indigo-600" />,
      title: "Create a Merchant Account",
      description: 'Sign up on Recover using Google, Email, Apple or Facebook. During profile setup, select "Logistics & Delivery Merchant" as your account type. This unlocks the shipment tracking workspace and API access.',
      action: "Sign Up as Merchant →",
      actionHref: "/",
    },
    {
      step: 2,
      icon: <KeyRound className="w-5 h-5 text-amber-600" />,
      title: "Generate Your Secret API Key",
      description: "Open your Settings page and scroll to the Developer REST API section. Click \"Generate API Key\" to create a secret key in the format rec_live_.... Copy this key securely — it authenticates all your server-to-server API calls.",
      action: "Go to Settings →",
      actionHref: "/settings",
    },
    {
      step: 3,
      icon: <Package className="w-5 h-5 text-emerald-600" />,
      title: "Register Your First Dispatch",
      description: "Call POST /api/v1/shipments/create with your API key in the Authorization header. The response returns a unique packageId, consumer trackingCode, RCVR-prefixed handover secret (innerSecret), and shipment record.",
      action: "See Code Example ↓",
      actionHref: "#endpoints",
    },
    {
      step: 4,
      icon: <Truck className="w-5 h-5 text-blue-600" />,
      title: "Print & Affix QR Sticker to Package",
      description: "Use the tracking code URL to generate or print a tamper-proof label onto the shipping box or poly-mailer. When anyone (rider, warehouse, recipient) scans the QR, Recover shows the live package status without any app install.",
    },
    {
      step: 5,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Complete Delivery with PIN Handover",
      description: "At delivery, the recipient provides their secret scratch-off PIN. The recipient or rider enters it on the scan page (or your backend calls POST /api/v1/shipments/[id]/verify). On match, the package status updates to Verified and your webhook fires.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-12">
          
          {/* Hero Banner Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider select-none shadow-xs">
              <Terminal className="w-3.5 h-3.5 text-indigo-600" /> Developer REST API &amp; Webhooks
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl">
              Integrate Recover Package Tracking
            </h1>

            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              Programmatically create tamper-proof dispatches, generate dual-layer QR stickers, verify PIN handovers, and stream real-time logistics webhooks directly into your ERP or e-commerce store.
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

                  <p className="text-xs text-neutral-slate leading-relaxed">
                    {s.description}
                  </p>

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
              <strong>🔒 Security:</strong> Never expose your API key in client-side browser code. Only use it in server-to-server calls from your backend (Node.js, Python, PHP, etc.). If your key is compromised, roll it immediately from <Link href="/settings" className="font-bold underline">Settings</Link>.
            </div>
          </div>

          {/* Language Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-white border border-neutral-mist rounded-2xl p-4 shadow-xs gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Code className="w-4 h-4 text-accent" /> API Request Code Examples:
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
              <button
                type="button"
                onClick={() => setActiveLang("curl")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "curl" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("javascript")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "javascript" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                JavaScript (Node)
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("python")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "python" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {/* Endpoints Reference Section */}
          <div id="endpoints" className="space-y-8">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display flex items-center gap-2">
                <Server className="w-6 h-6 text-indigo-600" /> REST API Endpoint Reference
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Base URL: <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-0.5 rounded text-xs">https://recoverprotocol.xyz/api/v1</code>
              </p>
            </div>

            {/* Endpoint 1: Create Shipment */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/create</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Registers a new commercial shipment, reserves your monthly quota, writes a tamper-proof record to the Electroneum blockchain, and returns a unique packageId, trackingCode, RCVR-prefixed handover secret (innerSecret), and shipment object.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.createShipment[activeLang], "create")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "create" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.createShipment[activeLang]}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-neutral-mist/30 p-3.5 rounded-xl border border-neutral-mist space-y-1">
                  <span className="font-bold text-primary block">Request Body Parameters:</span>
                  <ul className="space-y-1 text-neutral-slate font-mono">
                    <li>• <strong className="text-primary">packageName</strong> (string, required): Reference title</li>
                    <li>• <strong className="text-primary">receiverName</strong> (string, optional): Recipient full name</li>
                    <li>• <strong className="text-primary">receiverPhone</strong> (string, optional): Recipient phone number</li>
                    <li>• <strong className="text-primary">destination</strong> (string, optional): Destination city / area</li>
                    <li>• <strong className="text-primary">weight</strong> (string, optional): Weight in kg</li>
                    <li>• <strong className="text-primary">metadata</strong> (object, optional): Custom key-value data</li>
                    <li>• <strong className="text-primary">webhookUrl</strong> (string, optional): Per-shipment callback URL</li>
                  </ul>
                </div>
                <div className="bg-neutral-mist/30 p-3.5 rounded-xl border border-neutral-mist space-y-1">
                  <span className="font-bold text-primary block">200 OK Response:</span>
                  <ul className="space-y-1 text-neutral-slate font-mono">
                    <li>• <strong className="text-emerald-600">success</strong>: true</li>
                    <li>• <strong className="text-emerald-600">packageId</strong>: &quot;0x4a91b2...&quot; (internal package ID)</li>
                    <li>• <strong className="text-emerald-600">trackingCode</strong>: &quot;RCV-4A91B2C3E8F0&quot; (consumer-facing tracking code)</li>
                    <li>• <strong className="text-emerald-600">innerSecret</strong>: &quot;RCVR-A8F2B1C0&quot; (8-character RCVR-prefixed hex handover secret)</li>
                    <li>• <strong className="text-emerald-600">shipment</strong>: Full Shipment Object (status: &quot;Created&quot;, metadata, events)</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Endpoint 2: List Shipments */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Returns all shipments belonging to your merchant account, sorted by most recent first. Useful for syncing your order management system or building custom dashboards.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.listShipments[activeLang], "list")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "list" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.listShipments[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 3: Verify Shipment Scan */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/verify</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Public · No Auth Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Public endpoint for QR scan verification. Returns package weight, carrier info, current status (InTransit, Delivered, Disputed), and chain-of-custody timeline. This is the same endpoint called when anyone scans a physical QR sticker.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.verifyShipment[activeLang], "verify")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "verify" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.verifyShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 4: Log Custody Handover */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/handover</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Transfers package custody to a courier, rider, or warehouse handler. Updates status to &quot;InTransit&quot;, logs an on-chain event, and fires a <code className="bg-neutral-mist px-1 rounded">package.handover</code> webhook callback.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.handoverShipment[activeLang], "handover")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "handover" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.handoverShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 5: Verify PIN & Confirm Delivery */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/verify</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  PIN Verification
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Verifies the 8-character Secret Handover PIN at physical delivery. On a match, status updates to &quot;Verified&quot; and a <code className="bg-neutral-mist px-1 rounded">package.delivered</code> webhook callback fires with company details.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.confirmDelivery[activeLang], "confirmDelivery")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "confirmDelivery" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.confirmDelivery[activeLang]}</pre>
              </div>
            </div>

          </div>

          {/* HTTP Status Codes Reference */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display">HTTP Status Codes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-emerald-600 block">200</span>
                <span className="text-neutral-slate font-semibold">Success</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-emerald-600 block">201</span>
                <span className="text-neutral-slate font-semibold">Created</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">401</span>
                <span className="text-neutral-slate font-semibold">Invalid API Key</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-amber-600 block">402</span>
                <span className="text-neutral-slate font-semibold">Quota Exhausted</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">403</span>
                <span className="text-neutral-slate font-semibold">Not a Merchant</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-neutral-slate block">404</span>
                <span className="text-neutral-slate font-semibold">Package Not Found</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">400</span>
                <span className="text-neutral-slate font-semibold">Bad Request</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">500</span>
                <span className="text-neutral-slate font-semibold">Server Error</span>
              </div>
            </div>
          </div>

          {/* Webhooks Integration Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display flex items-center gap-2">
                <Globe className="w-6 h-6 text-accent" /> Real-Time Webhook Subscriptions
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Receive instant HTTP POST callbacks when dispatches are created, scanned, delivered, or disputed.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3 text-xs sm:text-sm text-neutral-slate">
                <h4 className="font-bold text-primary text-base">Supported Event Types:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 bg-neutral-mist/30 p-2.5 rounded-lg border border-neutral-mist">
                    <span className="font-mono font-bold text-emerald-600">package.delivered</span>
                    <span className="text-xs text-neutral-slate">— Triggered on successful PIN verification & delivery</span>
                  </li>
                  <li className="flex items-center gap-2 bg-neutral-mist/30 p-2.5 rounded-lg border border-neutral-mist">
                    <span className="font-mono font-bold text-red-600">shipment.disputed</span>
                    <span className="text-xs text-neutral-slate">— Triggered when a delivery dispute is logged</span>
                  </li>
                </ul>
                <p className="pt-2 text-xs leading-relaxed">
                  Configure your target webhook URL in your <Link href="/settings" className="font-bold text-accent underline">Settings Page</Link> or pass a per-shipment <code className="bg-neutral-mist px-1 rounded">webhookUrl</code> in the create request body.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-primary block">Example Webhook JSON Body:</span>
                <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookPayloadExample, "webhook")}
                    className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSnippet === "webhook" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre>{webhookPayloadExample}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limits & Quota */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display">Rate Limits &amp; Quota</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Free Bootstrap</span>
                <span className="text-2xl font-extrabold text-primary block">100</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Starter</span>
                <span className="text-2xl font-extrabold text-primary block">10,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Growth</span>
                <span className="text-2xl font-extrabold text-primary block">100,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Scale</span>
                <span className="text-2xl font-extrabold text-primary block">500,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
            </div>

            <p className="text-xs text-neutral-slate">
              When your monthly quota is exhausted on the Free tier, the API returns <code className="bg-neutral-mist px-1 rounded">402 Payment Required</code>. Pro tiers automatically apply metered overage auto-billing ($0.02–$0.01/package). <Link href="/pricing" className="font-bold text-accent underline">View all tier details →</Link>
            </p>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
