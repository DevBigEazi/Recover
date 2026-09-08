"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

const TIER_RANKS: Record<string, number> = {
  free: 0,
  pro_lite: 1,
  pro_starter: 2,
  pro_growth: 3,
  pro_scale: 4,
};

const TIER_NAMES: Record<string, string> = {
  free: "Free Bootstrap",
  pro_lite: "Pro Lite",
  pro_starter: "Pro Starter",
  pro_growth: "Pro Growth",
  pro_scale: "Pro Scale",
};

interface MerchantUpgradeCardProps {
  walletAddress: string;
  plan: string;
  role: string;
  billingCycle: "monthly" | "yearly";
  subscriptionActive: boolean;
  userCurrency: UserCurrencyInfo | null;
}

export default function MerchantUpgradeCard({
  walletAddress,
  plan,
  role,
  billingCycle,
  subscriptionActive,
  userCurrency,
}: MerchantUpgradeCardProps) {
  const [selectedTier, setSelectedTier] = useState<"pro_lite" | "pro_starter" | "pro_growth" | "pro_scale">("pro_starter");
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!walletAddress) return;
    setIsUpgrading(true);
    try {
      const initRes = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          planTier: selectedTier,
          billingCycle: selectedCycle,
        }),
      });
      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Initialization failed");
      }
      const initData = await initRes.json();
      if (initData.url) {
        window.location.href = initData.url;
      } else {
        throw new Error("Stripe checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg);
      setIsUpgrading(false);
    }
  };

  const currentRank = TIER_RANKS[plan || "free"] || 0;
  const targetRank = TIER_RANKS[selectedTier] || 0;
  const isDowngrade = targetRank < currentRank;
  const isSameTier = targetRank === currentRank;
  const isSameCycle = billingCycle === selectedCycle;
  const isCycleDowngrade = isSameTier && billingCycle === "yearly" && selectedCycle === "monthly";
  const currentName = TIER_NAMES[plan || "free"] || "Current Plan";
  const targetName = TIER_NAMES[selectedTier] || "Selected Plan";

  return (
    <div className="bg-linear-to-b from-indigo-950/40 to-slate-950 border border-indigo-900/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-4">
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
        <AlertTriangle className="w-5 h-5 text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-white">
        {isDowngrade ? "Change Subscription Tier" : "Activate Your Subscription"}
      </h3>
      <p className="text-slate-400 text-xs leading-relaxed">
        Select a logistics plan tier and billing cycle to start creating tamper-proof shipments.
      </p>

      {/* Downgrade Notice */}
      {isDowngrade && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="font-semibold block text-amber-300">Plan Downgrade Notice</strong>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              You are currently on <strong>{currentName}</strong>. Downgrading to <strong>{targetName}</strong> will switch your plan tier upon checkout. All unused shipment capacity will automatically roll over.
            </p>
          </div>
        </div>
      )}

      {/* Monthly / Annual Cycle Toggle */}
      <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectedCycle("monthly")}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedCycle === "monthly" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setSelectedCycle("yearly")}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            selectedCycle === "yearly" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Annual</span>
          <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1 rounded-full">
            -10%
          </span>
        </button>
      </div>

      {/* Tier Selection Cards */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={TIER_RANKS["pro_starter"] < currentRank}
          onClick={() => setSelectedTier("pro_starter")}
          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
            TIER_RANKS["pro_starter"] < currentRank
              ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
              : selectedTier === "pro_starter"
              ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block text-xs font-bold text-white">Pro Starter</span>
              {plan === "pro_starter" && (
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Current Plan
                </span>
              )}
              {TIER_RANKS["pro_starter"] < currentRank && (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Lower Tier (Disabled)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">0 – 9,999 shipments / mo</span>
          </div>
          <span className="text-xs font-bold text-blue-400">
            {selectedCycle === "yearly"
              ? `${convertUsdPrice(162, userCurrency).formattedLocal} / yr`
              : `${convertUsdPrice(15, userCurrency).formattedLocal} / mo`}
          </span>
        </button>

        <button
          type="button"
          disabled={TIER_RANKS["pro_growth"] < currentRank}
          onClick={() => setSelectedTier("pro_growth")}
          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
            TIER_RANKS["pro_growth"] < currentRank
              ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
              : selectedTier === "pro_growth"
              ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block text-xs font-bold text-white">Pro Growth</span>
              {plan === "pro_growth" && (
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Current Plan
                </span>
              )}
              {TIER_RANKS["pro_growth"] < currentRank && (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Lower Tier (Disabled)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">10,000 – 99,999 shipments / mo</span>
          </div>
          <span className="text-xs font-bold text-blue-400">
            {selectedCycle === "yearly"
              ? `${convertUsdPrice(486, userCurrency).formattedLocal} / yr`
              : `${convertUsdPrice(45, userCurrency).formattedLocal} / mo`}
          </span>
        </button>

        <button
          type="button"
          disabled={TIER_RANKS["pro_scale"] < currentRank}
          onClick={() => setSelectedTier("pro_scale")}
          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
            TIER_RANKS["pro_scale"] < currentRank
              ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
              : selectedTier === "pro_scale"
              ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="block text-xs font-bold text-white">Pro Scale</span>
              {plan === "pro_scale" && (
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Current Plan
                </span>
              )}
              {TIER_RANKS["pro_scale"] < currentRank && (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                  Lower Tier (Disabled)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">500,000+ shipments / mo</span>
          </div>
          <span className="text-xs font-bold text-blue-400">
            {selectedCycle === "yearly"
              ? `${convertUsdPrice(1080, userCurrency).formattedLocal} / yr`
              : `${convertUsdPrice(100, userCurrency).formattedLocal} / mo`}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={
          isUpgrading ||
          (subscriptionActive && role === "merchant" && isSameTier && isSameCycle) ||
          targetRank < currentRank ||
          isCycleDowngrade
        }
        className="w-full text-center font-bold text-xs py-3 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
      >
        {isUpgrading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading Stripe Checkout...
          </>
        ) : subscriptionActive && role === "merchant" && isSameTier && isCycleDowngrade ? (
          "Annual Billing Active Until Renewal"
        ) : subscriptionActive && role === "merchant" && isSameTier && isSameCycle ? (
          "Current Active Plan"
        ) : (
          `${isSameTier ? "Switch to " : "Pay "} ${
            selectedTier === "pro_starter"
              ? selectedCycle === "yearly"
                ? convertUsdPrice(162, userCurrency).formattedLocal
                : convertUsdPrice(15, userCurrency).formattedLocal
              : selectedTier === "pro_growth"
              ? selectedCycle === "yearly"
                ? convertUsdPrice(486, userCurrency).formattedLocal
                : convertUsdPrice(45, userCurrency).formattedLocal
              : selectedCycle === "yearly"
              ? convertUsdPrice(1080, userCurrency).formattedLocal
              : convertUsdPrice(100, userCurrency).formattedLocal
          } / ${selectedCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe`
        )}
      </button>
    </div>
  );
}
