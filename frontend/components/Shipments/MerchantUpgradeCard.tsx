"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { convertNgnPrice, UserCurrencyInfo, PLAN_TIERS, OVERAGE_FEE_NGN } from "@/lib/currency";

const TIER_RANKS: Record<string, number> = {
  free: 0,
  starter_500: 1,
  growth_1000: 2,
  business_2500: 3,
  scale_5000: 4,
  pro_lite: 1,
  pro_starter: 2,
  pro_growth: 3,
  pro_scale: 4,
  pro: 3,
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
  subscriptionActive,
  userCurrency,
}: MerchantUpgradeCardProps) {
  const [selectedTier, setSelectedTier] = useState<string>("growth_1000");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";
  const paidTierKeys = ["starter_500", "growth_1000", "business_2500", "scale_5000"];

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
          billingCycle: "monthly",
          gateway: isNigeria ? "flutterwave" : "stripe",
          countryCode: userCurrency?.countryCode,
          currency: userCurrency?.currency,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Initialization failed");
      }

      const initData = await initRes.json();

      if (initData.gateway === "flutterwave") {
        toast.loading("Verifying Flutterwave transaction...", { id: "flw_card_verify" });
        const verifyRes = await fetch("/api/subscription/flutterwave/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: initData.reference,
            walletAddress,
            planTier: selectedTier,
          }),
        });

        if (!verifyRes.ok) {
          const vErr = await verifyRes.json();
          throw new Error(vErr.error || "Verification failed");
        }

        toast.success("Subscription updated successfully with Flutterwave!", { id: "flw_card_verify" });
        window.location.reload();
        return;
      }

      if (initData.url) {
        window.location.href = initData.url;
      } else {
        throw new Error("Stripe checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg, { id: "flw_card_verify" });
      setIsUpgrading(false);
    }
  };

  const currentRank = TIER_RANKS[plan || "free"] || 0;
  const targetRank = TIER_RANKS[selectedTier] || 0;
  const isSameTier = targetRank === currentRank;

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 space-y-4 shadow-xs">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
        <AlertCircle className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-primary">
          {subscriptionActive ? "Manage Operations Subscription" : "Activate Merchant Subscription"}
        </h3>
        <p className="text-neutral-slate text-xs leading-relaxed mt-0.5">
          Select a monthly plan tier to unlock unified dispatches &amp; receipts, multi-branch tracking, and team roles.
        </p>
      </div>

      {/* Tier Selection Cards */}
      <div className="space-y-2">
        {paidTierKeys.map((tierKey) => {
          const t = PLAN_TIERS[tierKey];
          if (!t) return null;
          const isCurrent = plan === tierKey;
          const isSelected = selectedTier === tierKey;

          return (
            <button
              key={tierKey}
              type="button"
              onClick={() => setSelectedTier(tierKey)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "border-neutral-mist bg-neutral-white hover:border-neutral-slate/30"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="block text-xs font-bold text-primary">{t.name} Plan</span>
                  {isCurrent && (
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-slate">
                  {t.quota.toLocaleString()} Ops/mo · {t.branches} {t.branches === 1 ? "branch" : "branches"} · {t.salesReps} reps
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary block">
                  {convertNgnPrice(t.ngnMonthly, userCurrency).formattedLocal} / mo
                </span>
                <span className="text-[10px] text-neutral-slate">
                  +{convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} overage
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isUpgrading || (subscriptionActive && role === "merchant" && isSameTier)}
        className="w-full text-center font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer bg-primary hover:bg-primary-light text-white shadow-xs"
      >
        {isUpgrading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing Checkout...
          </>
        ) : subscriptionActive && role === "merchant" && isSameTier ? (
          "Current Active Plan"
        ) : (
          `Pay ${convertNgnPrice(PLAN_TIERS[selectedTier]?.ngnMonthly || 1000, userCurrency).formattedLocal} / mo with ${isNigeria ? "Flutterwave" : "Stripe"}`
        )}
      </button>
    </div>
  );
}
