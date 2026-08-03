"use client";

import { useState } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { Check, HelpCircle, ArrowRight, ShieldCheck, Zap, Sparkles, Truck } from "lucide-react";

export default function PricingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [proQuota, setProQuota] = useState<"pro_starter" | "pro_growth" | "pro_scale">("pro_growth");

  const proOptions = {
    pro_starter: {
      name: "Pro Starter",
      quota: "1,000 dispatches / mo",
      monthlyPrice: "₦15,000",
      yearlyPrice: "₦162,000",
      effectiveMonthly: "₦13,500",
      overage: "₦25 per excess shipment",
    },
    pro_growth: {
      name: "Pro Growth",
      quota: "5,000 dispatches / mo",
      monthlyPrice: "₦45,000",
      yearlyPrice: "₦486,000",
      effectiveMonthly: "₦40,500",
      overage: "₦25 per excess shipment",
    },
    pro_scale: {
      name: "Pro Scale",
      quota: "15,000 dispatches / mo",
      monthlyPrice: "₦100,000",
      yearlyPrice: "₦1,080,000",
      effectiveMonthly: "₦90,000",
      overage: "₦25 per excess shipment",
    },
  };

  const selectedPro = proOptions[proQuota];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-12">
          
          {/* Page Banner Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-accent uppercase tracking-wider select-none shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Transparent &amp; Flexible Pricing
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl">
              Simple Pricing for Individuals &amp; Businesses
            </h1>

            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              No hidden fees. Protect personal belongings for free with Pay-As-You-Go recovery unlocks, or power your logistics package dispatches with flexible Pro subscription tiers.
            </p>
          </div>

          {/* Section 1: Individual Valuables Pay-As-You-Go */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-mist pb-6">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">For Individuals</span>
                <h2 className="text-2xl font-bold text-primary font-display mt-0.5">Personal Item Protection (Pay-As-You-Go)</h2>
                <p className="text-xs text-neutral-slate mt-1">
                  Register an unlimited catalog of personal valuables with scannable QR stickers. Zero upfront subscription required.
                </p>
              </div>
              <Link
                href="/register"
                className="bg-primary hover:bg-primary-light text-neutral-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-sm text-center inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                Register Personal Items <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-neutral-mist/20 border border-neutral-mist rounded-xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
                  1
                </div>
                <h3 className="text-sm font-bold text-primary">Item Registration &amp; Sticker Export</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  <strong>Free (₦0)</strong>. Register unlimited items (phones, keys, laptops, pets) and export printable QR stickers in Mini (~10mm), Standard (~25mm), or Large (~50mm) sizes.
                </p>
              </div>

              <div className="bg-neutral-mist/20 border border-neutral-mist rounded-xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
                  2
                </div>
                <h3 className="text-sm font-bold text-primary">Finder Report &amp; Location Alert</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  <strong>Free (₦0)</strong>. When a lost item is scanned, finders submit location coordinates and notes. You receive instant Web Push alerts.
                </p>
              </div>

              <div className="bg-neutral-mist/20 border border-neutral-mist rounded-xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold">
                  3
                </div>
                <h3 className="text-sm font-bold text-primary">Report Detail Unlock Fee</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Pay only when your item is found to unmask finder contact details:
                  <br />
                  • <strong>Phone Category:</strong> ₦5,000 / report
                  <br />
                  • <strong>Other Categories:</strong> ₦2,000 / report
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Merchant & Logistics SaaS Tiers */}
          <div className="space-y-6">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">For Merchants &amp; Logistics Operators</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary font-display">
                Logistics &amp; Package Verification Tiers
              </h2>
              <p className="text-xs sm:text-sm text-neutral-slate">
                Scale your delivery package tracking with dual-layer QR sticker printing, real-time web push dispatch alerts, and automatic unused quota rollover.
              </p>

              {/* Billing Cycle Toggle */}
              <div className="pt-2 flex items-center justify-center">
                <div className="bg-neutral-white border border-neutral-mist p-1.5 rounded-2xl inline-flex items-center gap-2 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setCycle("monthly")}
                    className={`py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cycle === "monthly"
                        ? "bg-primary text-white shadow-sm"
                        : "text-neutral-slate hover:text-primary"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("yearly")}
                    className={`py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      cycle === "yearly"
                        ? "bg-primary text-white shadow-sm"
                        : "text-neutral-slate hover:text-primary"
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                      Save 10%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Merchant Pricing Grid - 3 Clean Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* Card 1: Free Bootstrap Tier */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-neutral-slate uppercase tracking-wider">Free Tier</span>
                    <h3 className="text-xl font-extrabold text-primary">Free Bootstrap Tier</h3>
                    <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                      For new e-commerce sellers and small merchant dispatch operations.
                    </p>
                  </div>

                  <div className="border-t border-b border-neutral-mist/60 py-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-display text-primary">₦0</span>
                      <span className="text-xs text-neutral-slate font-medium">/ forever</span>
                    </div>
                    <div className="pt-2 text-xs font-bold text-primary flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" /> 100 dispatches / month
                    </div>
                    <p className="text-[11px] text-neutral-slate">
                      Overage: Package creation pauses at 100
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-slate">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>100 Free Monthly Package Registrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Dual-Layer Package QR Sticker Generation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Real-Time Scan Web Push Alerts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Handover Verification PIN Match</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Public Package Tracking (`/scan/[id]`)</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/shipments"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all cursor-pointer bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-neutral-mist"
                >
                  Start Free (100 PKGs)
                </Link>
              </div>

              {/* Card 2: Pro Logistics Tier (Interactive Quota Selector) */}
              <div className="bg-neutral-white border-2 border-primary rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-md relative ring-4 ring-primary/10">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-neutral-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Pro Merchant Tier</span>
                    <h3 className="text-xl font-extrabold text-primary">Pro Logistics Tier</h3>
                    <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                      Scalable monthly package dispatches with automated quota rollover.
                    </p>
                  </div>

                  {/* Quota Volume Selector Tabs */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-slate uppercase tracking-wider">
                      Select Monthly Dispatch Volume:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-mist/50 border border-neutral-mist rounded-xl">
                      <button
                        type="button"
                        onClick={() => setProQuota("pro_starter")}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          proQuota === "pro_starter"
                            ? "bg-primary text-white shadow-xs"
                            : "text-neutral-slate hover:text-primary"
                        }`}
                      >
                        1,000 / mo
                      </button>
                      <button
                        type="button"
                        onClick={() => setProQuota("pro_growth")}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          proQuota === "pro_growth"
                            ? "bg-primary text-white shadow-xs"
                            : "text-neutral-slate hover:text-primary"
                        }`}
                      >
                        5,000 / mo
                      </button>
                      <button
                        type="button"
                        onClick={() => setProQuota("pro_scale")}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          proQuota === "pro_scale"
                            ? "bg-primary text-white shadow-xs"
                            : "text-neutral-slate hover:text-primary"
                        }`}
                      >
                        15,000 / mo
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-b border-neutral-mist/60 py-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-display text-primary">
                        {cycle === "yearly" ? selectedPro.yearlyPrice : selectedPro.monthlyPrice}
                      </span>
                      <span className="text-xs text-neutral-slate font-medium">
                        {cycle === "yearly" ? "/ yr" : "/ mo"}
                      </span>
                    </div>
                    {cycle === "yearly" && (
                      <p className="text-[11px] font-bold text-emerald-600">
                        Equivalent to {selectedPro.effectiveMonthly} / month (10% Saved)
                      </p>
                    )}
                    <div className="pt-2 text-xs font-extrabold text-primary flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-indigo-600" /> {selectedPro.quota}
                    </div>
                    <p className="text-[11px] text-neutral-slate">
                      Overage: {selectedPro.overage}
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-slate">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span><strong>{selectedPro.quota}</strong> Package Capacity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span><strong>Automatic Unused Quota Rollover</strong> on Renewal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Metered Overage Protection (₦25 / excess package)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>REST API &amp; Webhooks (`/api/v1/shipments`) Integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>Chain-of-Custody Dispute Logging Audit Trail</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/shipments"
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-center transition-all cursor-pointer bg-primary hover:bg-primary-light text-white shadow-md"
                >
                  Subscribe to {selectedPro.name}
                </Link>
              </div>

              {/* Card 3: Enterprise Custom Tier */}
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Enterprise Custom</span>
                    <h3 className="text-xl font-extrabold text-primary">Enterprise Tier</h3>
                    <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                      For high-volume couriers, nationwide fleets &amp; custom ERP integrations.
                    </p>
                  </div>

                  <div className="border-t border-b border-neutral-mist/60 py-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-display text-primary">Custom</span>
                      <span className="text-xs text-neutral-slate font-medium">/ SLA contract</span>
                    </div>
                    <div className="pt-2 text-xs font-bold text-primary flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-600" /> Unlimited / Custom Quota
                    </div>
                    <p className="text-[11px] text-neutral-slate">
                      Overage: Volume-discounted custom rates
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-slate">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>Unlimited Monthly Package Dispatch Volume</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>Dedicated Relayer Infrastructure &amp; High Throughput</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>Custom ERP &amp; On-Prem Webhooks (Shopify, WooCommerce)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>Dedicated Technical Account Manager &amp; 24/7 SLA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>Custom Net-30 Invoicing &amp; Enterprise Compliance</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="mailto:support@recover.protocol?subject=Enterprise%20Logistics%20Inquiry"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-all cursor-pointer bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-neutral-mist"
                >
                  Contact Enterprise Sales
                </a>
              </div>

            </div>
          </div>

          {/* Section 3: Quota Rollover Explainer */}
          <div className="bg-linear-to-r from-primary to-indigo-900 text-white rounded-2xl p-6 sm:p-10 shadow-lg space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-bold font-display">Unused Quota Rollover Guarantee</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              Never waste paid dispatch capacity! When you renew or upgrade your Pro logistics subscription, any unused shipments from your previous billing cycle automatically roll over into your new cycle capacity.
            </p>
            <div className="bg-white/10 border border-white/15 rounded-xl p-4 text-xs font-mono text-emerald-200">
              Total Monthly Available Capacity = New Tier Quota + Unused Rollover Quota
            </div>
          </div>

          {/* Section 4: Frequently Asked Questions */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary font-display flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-accent" /> Frequently Asked Questions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div className="space-y-2">
                <h4 className="font-bold text-primary">Do finders or recipients need to pay or download an app?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  No! Finders and package recipients do not need to download an app, create an account, or pay any fees. Anyone scanning a physical sticker can report a found item or verify a package instantly from their phone camera.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">How does the 10% Annual Discount work?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  When you select Annual Billing for Pro Starter, Pro Growth, or Pro Scale, you pay upfront for 12 months and receive a 10% discount off the total price compared to 12 monthly payments.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">What happens if a merchant exceeds their monthly shipment quota?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  On paid Pro tiers (Pro Starter, Pro Growth, Pro Scale), your dispatch features remain 100% uninterrupted! Excess shipments accrue a metered fee of ₦25 per package. On the Free Bootstrap Tier, package creation pauses until upgraded.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">Can I change my subscription tier at any time?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  Yes, you can upgrade your plan tier or switch billing cycles anytime from your Settings page (`/settings`). Your remaining quota will automatically roll over into your new subscription tier.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
