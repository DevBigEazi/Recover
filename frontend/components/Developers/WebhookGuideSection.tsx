"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Copy, Check } from "lucide-react";
import { webhookPayloadExample } from "./codeSnippets";

export default function WebhookGuideSection() {
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-12">
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-2xl font-extrabold text-amber-600 block">409</span>
            <span className="text-neutral-slate font-semibold">State Conflict</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-2xl font-extrabold text-amber-600 block">429</span>
            <span className="text-neutral-slate font-semibold">Rate Limited</span>
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
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-blue-600 text-xs shrink-0">recover.ping</span>
                <span className="text-xs text-neutral-slate">— Connectivity &amp; latency test ping</span>
              </li>
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-indigo-600 text-xs shrink-0">shipment.created</span>
                <span className="text-xs text-neutral-slate">— New package registered via API or Dashboard</span>
              </li>
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-purple-600 text-xs shrink-0">shipment.scanned</span>
                <span className="text-xs text-neutral-slate">— QR sticker scanned in the field</span>
              </li>
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-amber-600 text-xs shrink-0">shipment.handover</span>
                <span className="text-xs text-neutral-slate">— Custody transferred to courier / rider</span>
              </li>
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-emerald-600 text-xs shrink-0">shipment.delivered</span>
                <span className="text-xs text-neutral-slate">— Successful PIN verification &amp; physical delivery</span>
              </li>
              <li className="flex items-center gap-2 bg-neutral-mist/30 p-2 rounded-lg border border-neutral-mist">
                <span className="font-mono font-bold text-red-600 text-xs shrink-0">shipment.disputed</span>
                <span className="text-xs text-neutral-slate">— Delivery dispute reported for damage / tampering</span>
              </li>
            </ul>
            <p className="pt-2 text-xs leading-relaxed">
              Configure your target webhook URL once on your{" "}
              <Link href="/shipments" className="font-bold text-accent underline">
                Merchant Dashboard
              </Link>{" "}
              or{" "}
              <Link href="/settings" className="font-bold text-accent underline">
                Settings Page
              </Link>
              . All dispatches created under your merchant profile automatically stream status events to your
              configured endpoint.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-primary block">Example Webhook JSON Body:</span>
            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
              <button
                type="button"
                onClick={() => copyToClipboard(webhookPayloadExample)}
                className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
          When your monthly quota is exhausted on the Free tier, the API returns{" "}
          <code className="bg-neutral-mist px-1 rounded">402 Payment Required</code>. Pro tiers automatically apply
          metered overage auto-billing ($0.02–$0.01/package).{" "}
          <Link href="/pricing" className="font-bold text-accent underline">
            View all tier details →
          </Link>
        </p>
      </div>
    </div>
  );
}
