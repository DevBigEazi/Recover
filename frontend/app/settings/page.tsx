"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

import ProfileDetailsCard from "./components/ProfileDetailsCard";
import SubscriptionPlanCard from "./components/SubscriptionPlanCard";
import ApiKeyCard from "./components/ApiKeyCard";
import WebhookConfigCard from "@/components/WebhookConfigCard/WebhookConfigCard";
import CredentialsBackupCard from "./components/CredentialsBackupCard";
import SessionAndDangerCard from "./components/SessionAndDangerCard";

export default function SettingsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const { role, isProfileLoaded, refetchProfile } = useProfile();
  const hasVerifiedSubRef = useRef(false);

  // Handle Stripe checkout return verification (runs strictly once per page visit)
  useEffect(() => {
    if (typeof window === "undefined" || hasVerifiedSubRef.current) return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    if (sessionId) {
      hasVerifiedSubRef.current = true;
      const verifySub = async () => {
        try {
          toast.loading("Verifying subscription checkout...");
          const res = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          toast.dismiss();
          if (res.ok) {
            toast.success("Subscription updated successfully!");
            refetchProfile();
          }
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) {
          toast.dismiss();
          console.error("Subscription verification error:", e);
        }
      };
      verifySub();
    }
  }, [refetchProfile]);

  // 1. Auth loading — don't flash the "not signed in" UI while thirdweb restores the session
  if (isAuthLoading || !isProfileLoaded) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </main>
    );
  }

  // 2. Not Connected State Gating
  if (!account) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-12 text-center mt-12">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary font-display mb-2">Sign In to View Settings</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Please connect your account to view and manage your profile settings.
            </p>
            <div className="flex justify-center">
              <button
                onClick={openLogin}
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors shadow-xs cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href={role === "merchant" ? "/shipments" : "/dashboard"}
            className="text-sm font-medium text-neutral-slate hover:text-primary flex items-center gap-1"
          >
            ← Back to {role === "merchant" ? "Shipments" : "Dashboard"}
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-primary font-display mb-8">
          Account Settings
        </h1>

        <div className="space-y-8">
          {/* 1. Profile Details Card */}
          <ProfileDetailsCard walletAddress={account.address} />

          {/* 1.5. Billing & Subscription Section */}
          <SubscriptionPlanCard walletAddress={account.address} />

          {/* Developer API Key Card for Merchants */}
          <ApiKeyCard walletAddress={account.address} />

          {/* Merchant Global Webhook Configuration Card */}
          {role === "merchant" && <WebhookConfigCard variant="light" />}

          {/* 2. Account Credentials Backup Card */}
          <CredentialsBackupCard hasAccount={Boolean(account)} />

          {/* 3 & 4. Linked Session & Danger Zone Cards */}
          <SessionAndDangerCard walletAddress={account.address} />
        </div>
      </div>
    </main>
  );
}
