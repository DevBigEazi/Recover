"use client";

import React from "react";
import { Loader2, UserCheck } from "lucide-react";
import { convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

interface MerchantPlanStepProps {
  selectedPlan: "free" | "pro_lite" | "pro_starter" | "pro_growth" | "pro_scale";
  setSelectedPlan: (plan: "free" | "pro_lite" | "pro_starter" | "pro_growth" | "pro_scale") => void;
  billingCycle: "monthly" | "yearly";
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
  userCurrency: UserCurrencyInfo | null;
  isUpgrading: boolean;
  isLoading: boolean;
  onBack: () => void;
  onProPayment: () => void;
}

export default function MerchantPlanStep({
  selectedPlan,
  setSelectedPlan,
  billingCycle,
  setBillingCycle,
  userCurrency,
  isUpgrading,
  isLoading,
  onBack,
  onProPayment,
}: MerchantPlanStepProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
            Select Logistics Plan:
          </h3>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-neutral-slate hover:text-primary font-semibold cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Monthly vs Annual Billing Toggle */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-neutral-white text-primary shadow-xs"
                : "text-neutral-slate hover:text-primary"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-primary text-neutral-white shadow-xs"
                : "text-neutral-slate hover:text-primary"
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
              SAVE 10%
            </span>
          </button>
        </div>

        {/* Plan Tiers Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Pro Lite */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro_lite")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
              selectedPlan === "pro_lite"
                ? "border-accent bg-neutral-white ring-2 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
            }`}
          >
            <span className="block text-xs font-extrabold text-primary">Pro Lite</span>
            <span className="text-[10px] text-accent font-semibold block mt-0.5">2,500 shipments</span>
            <div className="mt-2 text-xs font-bold text-primary">
              {billingCycle === "yearly"
                ? convertUsdPrice(64.8, userCurrency).formattedLocal
                : convertUsdPrice(6, userCurrency).formattedLocal}
            </div>
            <span className="text-[9px] text-neutral-slate block mt-0.5">
              {billingCycle === "yearly"
                ? `${convertUsdPrice(5.4, userCurrency).formattedLocal} effective`
                : "Up to 2.5k pkgs"}
            </span>
          </button>

          {/* Pro Starter */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro_starter")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              selectedPlan === "pro_starter"
                ? "border-accent bg-neutral-white ring-2 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
            }`}
          >
            <span className="block text-xs font-extrabold text-primary">Pro Starter</span>
            <span className="text-[10px] text-accent font-semibold block mt-0.5">0 – 9,999 shipments</span>
            <div className="mt-2 text-xs font-bold text-primary">
              {billingCycle === "yearly"
                ? convertUsdPrice(162, userCurrency).formattedLocal
                : convertUsdPrice(15, userCurrency).formattedLocal}
            </div>
            <span className="text-[9px] text-neutral-slate block mt-0.5">
              {billingCycle === "yearly"
                ? `${convertUsdPrice(13.5, userCurrency).formattedLocal} effective`
                : "Up to 10k pkgs"}
            </span>
          </button>

          {/* Pro Growth */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro_growth")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              selectedPlan === "pro_growth"
                ? "border-accent bg-neutral-white ring-2 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
            }`}
          >
            <span className="block text-xs font-extrabold text-primary">Pro Growth</span>
            <span className="text-[10px] text-accent font-semibold block mt-0.5">10k – 99k shipments</span>
            <div className="mt-2 text-xs font-bold text-primary">
              {billingCycle === "yearly"
                ? convertUsdPrice(486, userCurrency).formattedLocal
                : convertUsdPrice(45, userCurrency).formattedLocal}
            </div>
            <span className="text-[9px] text-neutral-slate block mt-0.5">
              {billingCycle === "yearly"
                ? `${convertUsdPrice(40.5, userCurrency).formattedLocal} effective`
                : "Up to 100k pkgs"}
            </span>
          </button>

          {/* Pro Scale */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro_scale")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              selectedPlan === "pro_scale"
                ? "border-accent bg-neutral-white ring-2 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
            }`}
          >
            <span className="block text-xs font-extrabold text-primary">Pro Scale</span>
            <span className="text-[10px] text-accent font-semibold block mt-0.5">500k+ shipments</span>
            <div className="mt-2 text-xs font-bold text-primary">
              {billingCycle === "yearly"
                ? convertUsdPrice(1080, userCurrency).formattedLocal
                : convertUsdPrice(100, userCurrency).formattedLocal}
            </div>
            <span className="text-[9px] text-neutral-slate block mt-0.5">
              {billingCycle === "yearly"
                ? `${convertUsdPrice(90, userCurrency).formattedLocal} effective`
                : "Up to 500k pkgs"}
            </span>
          </button>
        </div>

        {/* Free bootstrap option */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setSelectedPlan("free")}
            className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              selectedPlan === "free"
                ? "border-accent bg-neutral-white ring-1 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white/50"
            }`}
          >
            <div>
              <span className="text-xs font-bold text-primary">Free Bootstrap Plan</span>
              <span className="text-[10px] text-neutral-slate ml-2">For initial testing (100 shipments/mo)</span>
            </div>
            <span className="text-xs font-extrabold text-primary">$0</span>
          </button>
        </div>

        <p className="text-[10px] text-neutral-slate leading-relaxed bg-neutral-mist/30 p-3 rounded-lg border border-neutral-mist/50">
          * Annual billing includes an automatic 10% discount off standard rates. Stripe Adaptive Pricing presents local currency pricing automatically.
        </p>
      </div>

      {selectedPlan !== "free" ? (
        <button
          type="button"
          onClick={onProPayment}
          disabled={isUpgrading}
          className="w-full bg-accent hover:bg-accent-light disabled:opacity-50 text-neutral-white font-bold py-3 rounded-xl text-sm transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mt-6"
        >
          {isUpgrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading Stripe Checkout...</span>
            </>
          ) : (
            <span>
              Pay {
                selectedPlan === "pro_lite"
                  ? (billingCycle === "yearly" ? convertUsdPrice(64.8, userCurrency).formattedLocal : convertUsdPrice(6, userCurrency).formattedLocal)
                  : selectedPlan === "pro_starter"
                  ? (billingCycle === "yearly" ? convertUsdPrice(162, userCurrency).formattedLocal : convertUsdPrice(15, userCurrency).formattedLocal)
                  : selectedPlan === "pro_growth"
                  ? (billingCycle === "yearly" ? convertUsdPrice(486, userCurrency).formattedLocal : convertUsdPrice(45, userCurrency).formattedLocal)
                  : (billingCycle === "yearly" ? convertUsdPrice(1080, userCurrency).formattedLocal : convertUsdPrice(100, userCurrency).formattedLocal)
              } / {billingCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe
            </span>
          )}
        </button>
      ) : (
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Confirm &amp; Start Tracking</span>
            </>
          )}
        </button>
      )}
    </>
  );
}
