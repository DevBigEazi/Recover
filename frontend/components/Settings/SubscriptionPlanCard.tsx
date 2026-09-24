"use client";

import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  detectUserCurrency,
  convertNgnPrice,
  formatOverageCharges,
  UserCurrencyInfo,
  PLAN_TIERS,
  OVERAGE_FEE_NGN,
} from "@/lib/currency";

interface SubscriptionPlanCardProps {
  walletAddress: string;
}

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

const TIER_NAMES: Record<string, string> = {
  free: "Free",
  starter_500: "Starter Plan",
  growth_1000: "Growth Plan",
  business_2500: "Business Plan",
  scale_5000: "Scale Plan",
  pro_lite: "Starter Plan",
  pro_starter: "Growth Plan",
  pro_growth: "Business Plan",
  pro_scale: "Scale Plan",
  pro: "Business Plan",
};

export default function SubscriptionPlanCard({ walletAddress }: SubscriptionPlanCardProps) {
  const {
    email,
    role,
    plan,
    billingCycleStart,
    shipmentsThisMonth,
    overageCharges,
    refetchProfile,
  } = useProfile();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<string>("growth_1000");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkoutWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);

    const handleResetUpgrade = () => {
      if (!checkoutWindowRef.current || checkoutWindowRef.current.closed) {
        setIsUpgrading(false);
      }
    };
    window.addEventListener("pageshow", handleResetUpgrade);
    window.addEventListener("focus", handleResetUpgrade);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "recover_subscription_confirmed") {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsUpgrading(false);
        setShowUpgradeModal(false);
        toast.success("Subscription upgraded successfully!");
        refetchProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("pageshow", handleResetUpgrade);
      window.removeEventListener("focus", handleResetUpgrade);
      window.removeEventListener("storage", handleStorageChange);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [refetchProfile]);

  const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";
  const activePlanConfig = PLAN_TIERS[plan] || PLAN_TIERS.free;
  const currentPlanQuota = activePlanConfig.quota;

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
          billingCycle: "monthly",
          gateway: isNigeria ? "paystack" : "stripe",
          countryCode: userCurrency?.countryCode,
          currency: userCurrency?.currency,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Initialization failed");
      }

      const initData = await initRes.json();

      if (initData.url) {
        const checkoutWindow = window.open(initData.url, "_blank");
        if (!checkoutWindow || checkoutWindow.closed || typeof checkoutWindow.closed === "undefined") {
          window.location.href = initData.url;
        } else {
          checkoutWindowRef.current = checkoutWindow;
          setIsUpgrading(true);
          toast("Checkout opened in a new tab. Complete payment to activate.", {
            icon: "💳",
            duration: 5000,
          });

          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          pollTimerRef.current = setInterval(() => {
            if (checkoutWindow.closed) {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              checkoutWindowRef.current = null;
              setIsUpgrading(false);
            }
          }, 800);
        }
      } else {
        throw new Error("Checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg, { id: "plan_upgrade" });
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

  const isOverQuota = shipmentsThisMonth > currentPlanQuota;

  return (
    <>
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            📦 Merchant Operations &amp; Subscription
          </h2>
          <p className="text-xs text-neutral-slate mt-1">
            Manage your active operations plan, multi-branch capacity, and team member limits.
          </p>
        </div>

        <div className="border border-neutral-mist rounded-2xl p-5 space-y-5 bg-neutral-mist/10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-mist pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">Active Plan</span>
              <h4 className="text-sm font-extrabold text-primary">
                {TIER_NAMES[plan] || "Free Tier"}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                Monthly Billing
              </span>
              {isOverQuota ? (
                <span className="bg-blue-50 text-blue-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                  Metered Overage Active
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Dispatches &amp; Receipts Quota</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">
                  {shipmentsThisMonth.toLocaleString()} / {currentPlanQuota.toLocaleString()}
                </span>
              </div>
              {billingCycleStart && (
                <span className="text-[10px] text-neutral-slate block mt-1">
                  📅 Cycle started {new Date(billingCycleStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>

            <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Branches &amp; Sales Reps</span>
              <div className="text-sm font-bold text-primary mt-1">
                {activePlanConfig.branches} {activePlanConfig.branches === 1 ? "branch" : "branches"} · {activePlanConfig.salesReps} sales {activePlanConfig.salesReps === 1 ? "rep" : "reps"}
              </div>
              <span className="text-[10px] text-neutral-slate block mt-1">
                1 manager per branch strictly enforced
              </span>
            </div>

            <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
              <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Metered Overage Fees</span>
              <span className="text-lg font-bold text-primary">
                {formatOverageCharges(overageCharges || 0, userCurrency)}
              </span>
              <span className="text-[10px] text-neutral-slate block mt-1">
                Flat {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} / excess unit
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-mist">
            <span className="text-xs text-neutral-slate">
              Need more monthly dispatches, extra branches, or more team seats?
            </span>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
            >
              Change / Upgrade Plan →
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (() => {
        const currentRank = TIER_RANKS[plan || "free"] || 0;
        const targetRank = TIER_RANKS[selectedUpgradeTier] || 0;
        const isSameTier = targetRank === currentRank;
        const paidTiers = ["starter_500", "growth_1000", "business_2500", "scale_5000"];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-mist pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-primary font-display">
                    Select Merchant Subscription Tier
                  </h3>
                  <p className="text-xs text-neutral-slate mt-0.5">
                    Monthly billing with clean quota reset. Payment routed via {isNigeria ? "Paystack" : "Stripe"}.
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

              {/* Tier Options */}
              <div className="space-y-2.5">
                {paidTiers.map((tierKey) => {
                  const t = PLAN_TIERS[tierKey];
                  if (!t) return null;
                  const isCurrent = plan === tierKey;
                  const isSelected = selectedUpgradeTier === tierKey;

                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => setSelectedUpgradeTier(tierKey)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-accent bg-neutral-white ring-2 ring-accent shadow-xs"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="block text-xs font-extrabold text-primary">{t.name} Plan</span>
                          {isCurrent && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-slate flex items-center gap-2">
                          <span>{t.quota.toLocaleString()} Ops/mo</span>
                          <span>·</span>
                          <span>{t.branches} {t.branches === 1 ? "branch" : "branches"}</span>
                          <span>·</span>
                          <span>{t.salesReps} sales reps</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-accent block">
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
                  disabled={isUpgrading || isSameTier}
                  className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Awaiting Checkout in Other Tab...</span>
                    </>
                  ) : isSameTier ? (
                    <span>Current Active Plan</span>
                  ) : (
                    <span>
                      Activate with {isNigeria ? "Paystack" : "Stripe"}
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
