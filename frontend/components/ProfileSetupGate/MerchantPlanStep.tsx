"use client";

import React from "react";
import { Loader2, UserCheck } from "lucide-react";
import { convertNgnPrice, UserCurrencyInfo, PLAN_TIERS, OVERAGE_FEE_NGN } from "@/lib/currency";

interface MerchantPlanStepProps {
  selectedPlan: string;
  setSelectedPlan: (plan: string) => void;
  billingCycle: "monthly";
  setBillingCycle: (cycle: "monthly") => void;
  userCurrency: UserCurrencyInfo | null;
  isUpgrading: boolean;
  isLoading: boolean;
  onBack: () => void;
  onProPayment: () => void;
}

export default function MerchantPlanStep({
  selectedPlan,
  setSelectedPlan,
  userCurrency,
  isUpgrading,
  isLoading,
  onBack,
  onProPayment,
}: MerchantPlanStepProps) {
  const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";
  const paidTierKeys = ["starter_500", "growth_1000", "business_2500", "scale_5000"];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
            Select Merchant Operations Plan:
          </h3>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-neutral-slate hover:text-primary font-semibold cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Plan Tiers Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {paidTierKeys.map((tierKey) => {
            const t = PLAN_TIERS[tierKey];
            if (!t) return null;
            const isSelected = selectedPlan === tierKey;

            return (
              <button
                key={tierKey}
                type="button"
                onClick={() => setSelectedPlan(tierKey)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-accent bg-neutral-white ring-2 ring-accent"
                    : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-extrabold text-primary">{t.name} Plan</span>
                  <span className="text-xs font-bold text-primary">
                    {convertNgnPrice(t.ngnMonthly, userCurrency).formattedLocal} / mo
                  </span>
                </div>
                <span className="text-[10px] text-accent font-semibold block mt-0.5">
                  {t.quota.toLocaleString()} Dispatches &amp; Receipts
                </span>
                <span className="text-[9px] text-neutral-slate block mt-1">
                  {t.branches} {t.branches === 1 ? "branch" : "branches"} · {t.salesReps} reps · 1 manager/branch
                </span>
              </button>
            );
          })}
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
              <span className="text-xs font-bold text-primary">Free Plan</span>
              <span className="text-[10px] text-neutral-slate ml-2">CEO only · 100 dispatches &amp; receipts/mo</span>
            </div>
            <span className="text-xs font-extrabold text-primary">{convertNgnPrice(0, userCurrency).formattedLocal}</span>
          </button>
        </div>

        <p className="text-[10px] text-neutral-slate leading-relaxed bg-neutral-mist/30 p-3 rounded-lg border border-neutral-mist/50">
          * Flat {convertNgnPrice(OVERAGE_FEE_NGN, userCurrency).formattedLocal} universal overage applies for extra dispatches, receipts, branches, or sales reps. Payment gateway: {isNigeria ? "Flutterwave" : "Stripe"}.
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
              <span>Processing Checkout...</span>
            </>
          ) : (
            <span>
              Pay {convertNgnPrice(PLAN_TIERS[selectedPlan]?.ngnMonthly || 1000, userCurrency).formattedLocal} / month with {isNigeria ? "Flutterwave" : "Stripe"}
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
              <span>Confirm Free Account</span>
            </>
          )}
        </button>
      )}
    </>
  );
}
