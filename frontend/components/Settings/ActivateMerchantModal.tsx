"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";
import MerchantPlanStep from "../ProfileSetupGate/MerchantPlanStep";

interface ActivateMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  businessDetails: {
    fullName: string;
    companyName: string;
    businessHandle?: string;
    businessLogo?: string | null;
    businessPhone?: string;
    businessEmail?: string;
  };
  userEmail?: string | null;
  onSuccess: () => void;
}

export default function ActivateMerchantModal({
  isOpen,
  onClose,
  walletAddress,
  businessDetails,
  userEmail,
  onSuccess,
}: ActivateMerchantModalProps) {
  const [billingEmail, setBillingEmail] = useState(
    businessDetails.businessEmail?.trim() || userEmail?.trim() || ""
  );
  const [selectedPlan, setSelectedPlan] = useState<string>("growth_1000");
  const [billingCycle, setBillingCycle] = useState<"monthly">("monthly");
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  useEffect(() => {
    const defaultEmail = businessDetails.businessEmail?.trim() || userEmail?.trim() || "";
    if (defaultEmail && !billingEmail) {
      setBillingEmail(defaultEmail);
    }
  }, [businessDetails.businessEmail, userEmail, billingEmail]);

  if (!isOpen) return null;

  const effectiveEmail = (billingEmail || businessDetails.businessEmail || userEmail || "").trim();

  const handleProPayment = async () => {
    if (!effectiveEmail) {
      toast.error("Please provide a business support email or personal email to proceed with checkout.");
      return;
    }

    setIsUpgrading(true);

    try {
      const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";
      const initRes = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          email: effectiveEmail,
          businessEmail: effectiveEmail,
          planTier: selectedPlan,
          billingCycle: "monthly",
          gateway: isNigeria ? "paystack" : "stripe",
          countryCode: userCurrency?.countryCode,
          currency: userCurrency?.currency,
          isOnboarding: true,
          companyName: businessDetails.companyName.trim(),
          businessHandle: businessDetails.businessHandle?.trim().toLowerCase() || undefined,
          phone: businessDetails.businessPhone?.trim(),
          fullName: businessDetails.fullName.trim() || businessDetails.companyName.trim(),
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({ error: "Failed to initialize payment." }));
        throw new Error(err.error || "Initialization failed");
      }

      const initData = await initRes.json();
      const redirectUrl = initData.checkoutUrl || initData.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err: unknown) {
      console.error("Payment initialization error:", err);
      const msg = err instanceof Error ? err.message : "Payment initialization failed.";
      toast.error(msg);
      setIsUpgrading(false);
    }
  };

  const handleFreeActivation = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          fullName: businessDetails.fullName.trim(),
          companyName: businessDetails.companyName.trim(),
          businessHandle: businessDetails.businessHandle?.trim().toLowerCase() || undefined,
          businessLogo: businessDetails.businessLogo || undefined,
          businessPhone: businessDetails.businessPhone?.trim() || undefined,
          businessEmail: effectiveEmail || businessDetails.businessEmail?.trim() || undefined,
          role: "merchant",
          activeMode: "merchant",
          hasMerchantProfile: true,
          plan: "free",
          billingCycle: "monthly",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to activate business profile." }));
        throw new Error(errorData.error || "Failed to activate business profile.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("recover_active_mode", "merchant");
      }

      toast.success("Business profile activated with Free Plan!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to activate business profile.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-lg relative my-8">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading || isUpgrading}
          className="absolute top-5 right-5 text-neutral-slate hover:text-primary transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedPlan === "free") {
              handleFreeActivation();
            } else {
              handleProPayment();
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="modal-business-email" className="block text-xs font-semibold text-primary mb-1">
              Business / Billing Email <span className="text-red-500">*</span>
            </label>
            <input
              id="modal-business-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="e.g. accounts@acme.com"
              required
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-mist rounded-xl focus:outline-none focus:ring-1 focus:ring-accent bg-neutral-white text-primary"
            />
            <p className="text-[10px] text-neutral-slate mt-1">
              Your subscription invoices, receipts, and operations notifications will be sent here.
            </p>
          </div>

          <MerchantPlanStep
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
            userCurrency={userCurrency}
            isUpgrading={isUpgrading}
            isLoading={isLoading}
            onBack={onClose}
            onProPayment={handleProPayment}
          />
        </form>
      </div>
    </div>
  );
}
