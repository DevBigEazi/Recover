"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { detectUserCurrency, convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

interface SubscriptionPlanCardProps {
  walletAddress: string;
}

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

export default function SubscriptionPlanCard({ walletAddress }: SubscriptionPlanCardProps) {
  const {
    email,
    role,
    plan,
    billingCycle,
    billingCycleStart,
    shipmentsThisMonth,
    rolloverQuota,
    overageCharges,
  } = useProfile();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<"pro_lite" | "pro_starter" | "pro_growth" | "pro_scale">("pro_starter");
  const [selectedUpgradeCycle, setSelectedUpgradeCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  const handleUpgradePlan = async () => {
    if (!walletAddress) return;
    setIsUpgrading(true);
    try {
      const initRes = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          email: email || "",
          planTier: selectedUpgradeTier,
          billingCycle: selectedUpgradeCycle,
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

  if (role !== "merchant") {
    return (
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            🏷️ Account Billing Model: Pay-As-You-Go
          </h2>
          <p className="text-xs text-neutral-slate mt-1">
            Individual accounts operate strictly on a Pay-As-You-Go basis per physical sticker registered. No monthly subscriptions, recurring fees, or lock-in contracts.
          </p>
        </div>
        <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">Current Model: Pay-As-You-Go</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
            Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            📦 Logistics &amp; Delivery Subscription
          </h2>
          <p className="text-xs text-neutral-slate mt-1">
            Manage your active SaaS shipments subscription tier and monthly dispatch quota.
          </p>
        </div>

        <div className="border border-neutral-mist rounded-2xl p-5 space-y-5 bg-neutral-mist/10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-mist pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">Active Plan</span>
              <h4 className="text-sm font-extrabold text-primary">
                {plan === "pro_lite"
                  ? "Pro Lite Tier"
                  : plan === "pro_starter"
                  ? "Pro Starter Tier"
                  : plan === "pro_growth"
                  ? "Pro Growth Tier"
                  : plan === "pro_scale"
                  ? "Pro Scale Tier"
                  : plan === "pro"
                  ? "Pro Tier"
                  : "Free Bootstrap Tier"}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {plan !== "free" ? (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                  {billingCycle === "yearly" ? "Annual Billing · 10% Discount Applied" : "Monthly Billing"}
                </span>
              ) : (
                <span className="bg-neutral-100 text-neutral-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-neutral-200 uppercase">
                  Free Tier
                </span>
              )}
              {(() => {
                const baseLimit = plan === "pro_lite" ? 2500 : plan === "pro_starter" ? 10000 : plan === "pro_growth" ? 100000 : plan === "pro_scale" ? 500000 : plan === "pro" ? 100000 : 100;
                const totalCap = baseLimit + (rolloverQuota || 0);
                const isFreeLimitReached = plan === "free" && shipmentsThisMonth >= totalCap;
                const isProOverQuota = plan !== "free" && shipmentsThisMonth >= totalCap;

                if (isFreeLimitReached) {
                  return (
                    <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-red-200 uppercase">
                      Limit Reached
                    </span>
                  );
                }
                if (isProOverQuota) {
                  return (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase">
                      Metered Overage Active
                    </span>
                  );
                }
                return (
                  <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-green-200 uppercase">
                    Active
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Shipment Quota &amp; Usage</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">
                  {shipmentsThisMonth.toLocaleString()} / {(
                    (plan === "pro_lite" ? 2500 : plan === "pro_starter" ? 10000 : plan === "pro_growth" ? 100000 : plan === "pro_scale" ? 500000 : plan === "pro" ? 100000 : 100) + (rolloverQuota || 0)
                  ).toLocaleString()}
                </span>
              </div>
              {billingCycleStart && (
                <span className="text-[10px] text-neutral-slate block mt-1">
                  📅 Cycle started {new Date(billingCycleStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {rolloverQuota > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                  ✨ +{rolloverQuota.toLocaleString()} unused shipments rolled over from previous plan
                </span>
              )}
            </div>
            <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Metered Overage Fees</span>
              <span className="text-lg font-bold text-primary">{convertUsdPrice(overageCharges, userCurrency).formattedLocal}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-mist">
            <span className="text-xs text-neutral-slate">
              Need to adjust your dispatch volume limit or switch billing cycles?
            </span>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
            >
              Upgrade Plan →
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Upgrade Plan Modal */}
      {showUpgradeModal && (() => {
        const currentRank = TIER_RANKS[plan || "free"] || 0;
        const targetRank = TIER_RANKS[selectedUpgradeTier] || 0;
        const isDowngrade = targetRank < currentRank;
        const isSameTier = targetRank === currentRank;
        const isSameCycle = billingCycle === selectedUpgradeCycle;
        const currentName = TIER_NAMES[plan || "free"] || "Current Plan";
        const targetName = TIER_NAMES[selectedUpgradeTier] || "Selected Plan";
        const isCycleDowngrade = isSameTier && billingCycle === "yearly" && selectedUpgradeCycle === "monthly";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-mist pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-primary font-display">
                    {isDowngrade ? "Change Logistics Subscription Tier" : "Upgrade Logistics Subscription Tier"}
                  </h3>
                  <p className="text-xs text-neutral-slate mt-0.5">
                    Select a plan tier and cycle. Changes take effect in real time upon payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-neutral-slate hover:text-primary font-bold text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isDowngrade && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="shrink-0 text-base mt-0.5">⚠️</span>
                  <div className="space-y-0.5">
                    <strong className="font-bold text-amber-950 block text-xs">Plan Downgrade &amp; Rollover Notice</strong>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You are currently active on <strong>{currentName}</strong>. Selecting <strong>{targetName}</strong> will switch your plan tier upon checkout. All remaining unused shipment capacity from your current plan will automatically roll over into your account so no paid quota is lost.
                    </p>
                  </div>
                </div>
              )}

              {/* Monthly vs Annual Cycle Toggle */}
              <div className="flex items-center justify-center gap-2 p-1.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedUpgradeCycle("monthly")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedUpgradeCycle === "monthly"
                      ? "bg-neutral-white text-primary shadow-xs"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUpgradeCycle("yearly")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedUpgradeCycle === "yearly"
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

              {/* Pro Tier Options */}
              <div className="space-y-2.5">
                {/* Pro Starter */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_starter"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_starter")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_starter"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_starter"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Starter Tier</span>
                      {plan === "pro_starter" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                      {TIER_RANKS["pro_starter"] < currentRank && (
                        <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Lower Tier (Disabled)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">0 – 9,999 shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(162, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(15, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(13.5, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>

                {/* Pro Growth */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_growth"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_growth")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_growth"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_growth"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Growth Tier</span>
                      {plan === "pro_growth" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                      {TIER_RANKS["pro_growth"] < currentRank && (
                        <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Lower Tier (Disabled)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">10,000 – 99,999 shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(486, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(45, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(40.5, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>

                {/* Pro Scale */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_scale"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_scale")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_scale"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_scale"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Scale Tier</span>
                      {plan === "pro_scale" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">500,000+ shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(1080, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(100, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(90, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpgradePlan}
                  disabled={isUpgrading || (isSameTier && isSameCycle) || targetRank < currentRank || isCycleDowngrade}
                  className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading Stripe Checkout...</span>
                    </>
                  ) : isSameTier && isCycleDowngrade ? (
                    <span>Annual Billing Active Until Renewal</span>
                  ) : isSameTier && isSameCycle ? (
                    <span>Current Active Plan</span>
                  ) : (
                    <span>
                      {isSameTier ? "Switch to " : "Upgrade to "}
                      {selectedUpgradeTier === "pro_starter"
                        ? (selectedUpgradeCycle === "yearly" ? convertUsdPrice(162, userCurrency).formattedLocal : convertUsdPrice(15, userCurrency).formattedLocal)
                        : selectedUpgradeTier === "pro_growth"
                        ? (selectedUpgradeCycle === "yearly" ? convertUsdPrice(486, userCurrency).formattedLocal : convertUsdPrice(45, userCurrency).formattedLocal)
                        : (selectedUpgradeCycle === "yearly" ? convertUsdPrice(1080, userCurrency).formattedLocal : convertUsdPrice(100, userCurrency).formattedLocal)
                      } / {selectedUpgradeCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
