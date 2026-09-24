"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { HelpCircle, ArrowRight, ShieldCheck, Zap, Check } from "lucide-react";
import { detectUserCurrency, convertNgnPrice, convertUsdPrice, UserCurrencyInfo, PLAN_TIERS, OVERAGE_FEE_NGN } from "@/lib/currency";

export default function PricingPage() {
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);
  const [growthTierKey, setGrowthTierKey] = useState<"starter_500" | "growth_1000">("growth_1000");
  const [scaleTierKey, setScaleTierKey] = useState<"business_2500" | "scale_5000">("scale_5000");

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";
  const overageFeeFormatted = convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal;

  const freeTier = PLAN_TIERS.free;
  const growthTier = PLAN_TIERS[growthTierKey];
  const scaleTier = PLAN_TIERS[scaleTierKey];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-16 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          
          {/* Page Banner Header */}
          <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[10px] sm:text-xs text-primary shadow-2xs hover:border-accent/40 transition-all select-none backdrop-blur-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="font-bold tracking-tight text-primary">Transparent Pricing</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary font-display">
              Simple, Predictable Plans for Growing Merchants
            </h1>

            <p className="text-xs sm:text-base text-neutral-slate leading-relaxed">
              Unified dispatches &amp; receipts, branch management, and multi-user team roles with universal {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} overage.
            </p>
          </div>

          {/* Section 1: Individual Valuables Pay-As-You-Go */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-5 sm:p-10 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-mist pb-6">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">For Individuals</span>
                <h2 className="text-xl sm:text-2xl font-bold text-primary font-display mt-0.5">Personal Item Protection (Pay-As-You-Go)</h2>
                <p className="text-xs text-neutral-slate mt-1">
                  Register personal belongings with scannable QR stickers. Zero upfront subscription required.
                </p>
              </div>
              <Link
                href="/register"
                className="bg-primary hover:bg-primary-light text-neutral-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-xs text-center inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer w-full sm:w-auto"
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
                  <strong>Free</strong>. Register personal valuables (phones, keys, laptops, bags) and export printable QR stickers in Mini (~10mm), Standard (~25mm), or Large (~50mm) sizes.
                </p>
              </div>

              <div className="bg-neutral-mist/20 border border-neutral-mist rounded-xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
                  2
                </div>
                <h3 className="text-sm font-bold text-primary">Finder Report &amp; Location Alert</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  <strong>Free</strong>. When a lost item is scanned, finders submit location coordinates and return options. You receive instant Web Push alerts.
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
                  • <strong>Phone Category:</strong> {convertUsdPrice(3.5, userCurrency).formattedLocal}
                  <br />
                  • <strong>Other Categories:</strong> {convertUsdPrice(1.5, userCurrency).formattedLocal}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Merchant & Logistics SaaS Tiers */}
          <div className="space-y-6">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">For Merchants &amp; Logistics Operators</span>
              <h2 className="text-xl sm:text-3xl font-bold text-primary font-display">
                Dispatches, Receipts &amp; Multi-Branch Tiers
              </h2>
              <p className="text-xs sm:text-sm text-neutral-slate">
                Unified operations counter for package dispatches and POS receipts. Includes branch management and team roles with {overageFeeFormatted} universal overage.
              </p>
            </div>

            {/* Merchant Pricing Grid - 3 High-End Fintech Cards with Embedded Switchers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
              {/* Card 1: Free Tier */}
              <div className="bg-neutral-white border border-neutral-slate/15 hover:border-neutral-slate/30 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all shadow-xs">
                <div className="space-y-5">
                  {/* Header & Sub-tier context pill */}
                  <div className="flex items-center justify-between min-h-6">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-slate">
                      {freeTier.name}
                    </span>
                    <span className="bg-neutral-mist text-neutral-slate border border-neutral-mist text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Solo CEO
                    </span>
                  </div>

                  {/* Switcher Alignment Spacer / Baseline Tag */}
                  <div className="bg-neutral-mist/60 border border-neutral-slate/10 rounded-xl p-1.5 flex items-center justify-center text-center">
                    <span className="text-[11px] font-bold text-neutral-slate">
                      100 Ops (Single-User Pilot)
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-0.5">
                    <div className="text-3xl sm:text-4xl font-bold font-display text-primary tracking-tight">
                      {convertNgnPrice(0, userCurrency).formattedLocal}
                    </div>
                    <p className="text-xs text-neutral-slate font-medium">
                      forever free
                    </p>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-neutral-slate leading-relaxed min-h-10">
                    {freeTier.description}
                  </p>

                  {/* Operations Quota Highlight Pill */}
                  <div className="bg-neutral-mist/70 border border-neutral-slate/10 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-primary font-display truncate">
                        {freeTier.quota.toLocaleString()} Operations
                      </div>
                      <div className="text-[11px] text-neutral-slate truncate">
                        Dispatches &amp; POS receipts
                      </div>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="pt-3 border-t border-neutral-mist space-y-3 text-xs">
                    {/* Branches */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">0 Branches</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Headquarters only
                        </span>
                      </div>
                    </div>

                    {/* Branch Managers */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">No Branch Manager</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          CEO direct oversight
                        </span>
                      </div>
                    </div>

                    {/* Sales Reps */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">0 Sales Reps</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          CEO handles all POS sales
                        </span>
                      </div>
                    </div>

                    {/* Hard Cap */}
                    <div className="flex items-start gap-2.5 pt-1.5 border-t border-neutral-mist/60">
                      <ShieldCheck className="w-4 h-4 text-neutral-slate/60 shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">Hard Monthly Limit</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Strict 100 ops cap · CEO only
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-3">
                  <Link
                    href="/shipments"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer block bg-neutral-mist hover:bg-neutral-slate/10 text-primary border border-neutral-slate/15 shadow-xs"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>

              {/* Card 2: Growth Tier (Most Popular) with Switcher */}
              <div className="bg-neutral-white border-2 border-accent ring-1 ring-accent/30 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all shadow-sm relative">
                <div className="space-y-5">
                  {/* Header & Most Popular Badge */}
                  <div className="flex items-center justify-between min-h-6">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-slate">
                      {growthTier.name}
                    </span>
                    <span className="bg-accent/10 text-accent border border-accent/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
                      Most Popular
                    </span>
                  </div>

                  {/* Segmented Button Switcher */}
                  <div className="bg-neutral-mist p-1 rounded-xl flex items-center gap-1 border border-neutral-slate/10">
                    <button
                      type="button"
                      onClick={() => setGrowthTierKey("starter_500")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        growthTierKey === "starter_500"
                          ? "bg-primary text-neutral-white shadow-2xs"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-white/60"
                      }`}
                    >
                      500 Ops (Starter)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrowthTierKey("growth_1000")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        growthTierKey === "growth_1000"
                          ? "bg-primary text-neutral-white shadow-2xs"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-white/60"
                      }`}
                    >
                      1,000 Ops (Growth)
                    </button>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-0.5">
                    <div className="text-3xl sm:text-4xl font-bold font-display text-primary tracking-tight">
                      {convertNgnPrice(growthTier.ngnMonthly, userCurrency).formattedLocal}
                    </div>
                    <p className="text-xs text-neutral-slate font-medium">
                      / month
                    </p>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-neutral-slate leading-relaxed min-h-10">
                    {growthTier.description}
                  </p>

                  {/* Operations Quota Highlight Pill */}
                  <div className="bg-neutral-mist/70 border border-neutral-slate/10 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-primary font-display truncate">
                        {growthTier.quota.toLocaleString()} Operations
                      </div>
                      <div className="text-[11px] text-neutral-slate truncate">
                        Dispatches &amp; POS receipts
                      </div>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="pt-3 border-t border-neutral-mist space-y-3 text-xs">
                    {/* Branches */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {growthTier.branches} {growthTier.branches === 1 ? "Branch location" : "Branch locations"}
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          + {overageFeeFormatted} per extra branch
                        </span>
                      </div>
                    </div>

                    {/* Branch Managers */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {growthTier.managers} {growthTier.managers === 1 ? "Branch Manager" : "Branch Managers"}
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Strictly 1 manager / branch
                        </span>
                      </div>
                    </div>

                    {/* Sales Reps */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {growthTier.salesReps} Sales {growthTier.salesReps === 1 ? "rep" : "reps"}
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          + {overageFeeFormatted} per extra rep
                        </span>
                      </div>
                    </div>

                    {/* Universal Overage Line */}
                    <div className="flex items-start gap-2.5 pt-1.5 border-t border-neutral-mist/60">
                      <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">Universal Overage</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Flat {overageFeeFormatted} / excess unit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-3">
                  <Link
                    href={`/settings?plan=${growthTierKey}`}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer block bg-primary hover:bg-primary-light text-neutral-white shadow-xs"
                  >
                    Select {growthTier.name}
                  </Link>
                </div>
              </div>

              {/* Card 3: Scale Tier (High Volume) with Switcher */}
              <div className="bg-neutral-white border border-neutral-slate/15 hover:border-neutral-slate/30 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all shadow-xs">
                <div className="space-y-5">
                  {/* Header & High Volume Badge */}
                  <div className="flex items-center justify-between min-h-6">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-slate">
                      {scaleTier.name}
                    </span>
                    <span className="bg-neutral-mist text-neutral-slate border border-neutral-mist text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      High Volume
                    </span>
                  </div>

                  {/* Segmented Button Switcher */}
                  <div className="bg-neutral-mist p-1 rounded-xl flex items-center gap-1 border border-neutral-slate/10">
                    <button
                      type="button"
                      onClick={() => setScaleTierKey("business_2500")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        scaleTierKey === "business_2500"
                          ? "bg-primary text-neutral-white shadow-2xs"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-white/60"
                      }`}
                    >
                      2,500 Ops (Business)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleTierKey("scale_5000")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer ${
                        scaleTierKey === "scale_5000"
                          ? "bg-primary text-neutral-white shadow-2xs"
                          : "text-neutral-slate hover:text-primary hover:bg-neutral-white/60"
                      }`}
                    >
                      5,000 Ops (Scale)
                    </button>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-0.5">
                    <div className="text-3xl sm:text-4xl font-bold font-display text-primary tracking-tight">
                      {convertNgnPrice(scaleTier.ngnMonthly, userCurrency).formattedLocal}
                    </div>
                    <p className="text-xs text-neutral-slate font-medium">
                      / month
                    </p>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-neutral-slate leading-relaxed min-h-10">
                    {scaleTier.description}
                  </p>

                  {/* Operations Quota Highlight Pill */}
                  <div className="bg-neutral-mist/70 border border-neutral-slate/10 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-primary font-display truncate">
                        {scaleTier.quota.toLocaleString()} Operations
                      </div>
                      <div className="text-[11px] text-neutral-slate truncate">
                        Dispatches &amp; POS receipts
                      </div>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="pt-3 border-t border-neutral-mist space-y-3 text-xs">
                    {/* Branches */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {scaleTier.branches} Branch locations
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          + {overageFeeFormatted} per extra branch
                        </span>
                      </div>
                    </div>

                    {/* Branch Managers */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {scaleTier.managers} Branch Managers
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Strictly 1 manager / branch
                        </span>
                      </div>
                    </div>

                    {/* Sales Reps */}
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">
                          {scaleTier.salesReps} Sales reps
                        </span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          + {overageFeeFormatted} per extra rep
                        </span>
                      </div>
                    </div>

                    {/* Universal Overage Line */}
                    <div className="flex items-start gap-2.5 pt-1.5 border-t border-neutral-mist/60">
                      <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="leading-tight">
                        <span className="font-semibold text-primary">Universal Overage</span>
                        <span className="block text-[11px] text-neutral-slate mt-0.5">
                          Flat {overageFeeFormatted} / excess unit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-3">
                  <Link
                    href={`/settings?plan=${scaleTierKey}`}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer block bg-neutral-mist hover:bg-neutral-slate/10 text-primary border border-neutral-slate/15 shadow-xs"
                  >
                    Select {scaleTier.name}
                  </Link>
                </div>
              </div>
            </div>

            {/* Merchant Bottom Trust Bar - Responsive Mobile / Tablet / Desktop */}
            <div className="bg-neutral-white border border-neutral-slate/15 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 text-xs text-neutral-slate">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-primary">Supported Payments:</span>
                <span className="text-primary font-medium">
                  {isNigeria
                    ? "Paystack (Cards, Bank Transfer, USSD, OPay)"
                    : "Stripe (Credit / Debit Card, Apple Pay)"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
                <span className="bg-primary/5 text-primary font-semibold px-2 py-0.5 rounded-md border border-primary/10">
                  Universal Overage: {overageFeeFormatted} / unit
                </span>
                <span className="text-neutral-slate/50 hidden sm:inline">·</span>
                <span>Automatic monthly billing</span>
                <span className="text-neutral-slate/50 hidden sm:inline">·</span>
                <span>Cancel or switch anytime</span>
              </div>
            </div>
          </div>

          {/* Section 3: Universal Overage & Fair Pricing Guarantee */}
          <div className="bg-neutral-white border border-neutral-mist text-primary rounded-2xl p-5 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5 sm:mt-0" />
              <h2 className="text-base sm:text-xl font-bold font-display">Universal {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} Overage &amp; Predictable Monthly Billing</h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed max-w-3xl">
              Grow without unexpected barriers. Any operation or expansion beyond your tier quota—extra dispatches, extra digital receipts, extra branches, or additional sales reps—is billed at a flat <strong>{convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} per unit</strong>. Your full plan quota refreshes automatically at the start of each billing month.
            </p>
          </div>

          {/* Section 4: Frequently Asked Questions */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-5 sm:p-10 shadow-xs space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-primary font-display flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-accent shrink-0" /> Frequently Asked Questions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div className="space-y-2">
                <h4 className="font-bold text-primary">How do dispatches and receipts count toward my monthly quota?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  Both logistics shipments and POS receipts share a unified monthly operations counter. For example, on the Starter tier (500 Ops), you can create 300 receipts and 200 dispatches. Any excess is billed at {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} per unit.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">How are extra branches and sales reps handled?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  You can expand beyond your plan&apos;s base limits at any time. Extra branches and extra sales reps are billed at {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} each, while strictly maintaining the rule of 1 manager per branch.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">Which payment methods are supported?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  You can pay seamlessly using standard local debit cards, credit cards, bank transfers, or mobile payment channels based on your region.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-primary">Can I change my plan or cancel at any time?</h4>
                <p className="text-neutral-slate leading-relaxed">
                  Yes. You can upgrade, switch tiers, or cancel your subscription at any time directly from your merchant settings. Changes apply seamlessly to your account.
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
