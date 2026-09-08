"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "react-hot-toast";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";
import WebhookConfigCard from "@/components/WebhookConfigCard/WebhookConfigCard";

import { Shipment, HandoverResult } from "@/components/Shipments/types";
import ShipmentsTable from "@/components/Shipments/ShipmentsTable";
import CreateShipmentCard from "@/components/Shipments/CreateShipmentCard";
import MerchantUpgradeCard from "@/components/Shipments/MerchantUpgradeCard";
import StickerDownloadModal from "@/components/Shipments/StickerDownloadModal";
import LogHandoverModal from "@/components/Shipments/LogHandoverModal";
import HandoverSuccessModal from "@/components/Shipments/HandoverSuccessModal";

export default function ShipmentsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const {
    apiKey,
    subscriptionActive,
    role,
    companyName,
    plan,
    billingCycle,
    billingCycleStart,
    shipmentsThisMonth,
    rolloverQuota,
    isProfileLoaded,
    refetchProfile,
  } = useProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (account && role && role !== "merchant") {
      router.replace("/dashboard");
    }
  }, [account, role, router]);

  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);
  const [showStickerDownload, setShowStickerDownload] = useState<Shipment | null>(null);
  const [createdInnerSecret, setCreatedInnerSecret] = useState<string | null>(null);
  const [selectedHandoverShipment, setSelectedHandoverShipment] = useState<Shipment | null>(null);
  const [lastHandoverResult, setLastHandoverResult] = useState<HandoverResult | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  // Fetch shipments — only for authenticated merchants
  const { data: shipments = [], isLoading, error } = useQuery<Shipment[]>({
    queryKey: ["shipments", account?.address],
    queryFn: async () => {
      let activeApiKey = apiKey;
      if (!activeApiKey && account?.address) {
        try {
          const keyRes = await fetch("/api/profile/api-key", {
            method: "POST",
            headers: { "x-owner-address": account.address },
          });
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            activeApiKey = keyData.apiKey;
          }
        } catch (err) {
          console.error("Failed to auto-provision API key:", err);
        }
      }

      const headers: Record<string, string> = {
        "x-owner-address": account!.address,
      };
      if (activeApiKey && !activeApiKey.includes("•")) {
        headers["x-api-key"] = activeApiKey;
      }

      const response = await fetch(`/api/v1/shipments`, { headers });
      if (!response.ok) throw new Error("Failed to load shipments");
      return response.json();
    },
    enabled: !!account && role === "merchant",
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const isSubscriptionActive = subscriptionActive === true || plan === "free";

  // Handle return verification from Stripe checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    if (sessionId && account?.address) {
      const verifySub = async () => {
        try {
          toast.loading("Verifying subscription checkout...");
          const res = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, walletAddress: account.address }),
          });
          toast.dismiss();
          if (res.ok) {
            toast.success("Subscription activated successfully!");
            queryClient.invalidateQueries({ queryKey: ["profile", account.address] });
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
  }, [account?.address, queryClient]);

  if (isAuthLoading || !isProfileLoaded) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pb-12">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      </main>
    );
  }

  if (account && role !== "merchant") {
    return (
      <main className="min-h-screen bg-slate-950 text-white pb-12">
        <Header />
        <div className="flex flex-col justify-center items-center py-32 gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <p className="text-xs font-medium text-slate-400">Redirecting to your personal dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white pb-12">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {/* Banner with Premium Aesthetics */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-slate-800 p-8 mb-8 backdrop-blur-md shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent mb-2">
            {companyName ? `${companyName} · Shipments` : "Tamper-Proof Shipments"}
          </h1>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            {companyName
              ? `Welcome back, ${companyName}. Monitor your package chain-of-custody and verify delivery integrity in real-time.`
              : "Monitor chain of custody logs and verify package integrity in real-time. Secure deliveries using physical scratch-off QR verification codes."}
          </p>
        </div>

        {!account ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl backdrop-blur-sm">
            <ShieldAlert className="w-12 h-12 text-blue-400 mx-auto mb-4 opacity-80 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
            <button
              type="button"
              onClick={openLogin}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-md cursor-pointer"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Merchant Webhook Configuration - Straight Full-Width Line */}
            <WebhookConfigCard variant="dark" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left/Middle Column: Shipment List */}
              <div className="order-2 lg:order-1 lg:col-span-2">
                <ShipmentsTable
                  shipments={shipments}
                  isLoading={isLoading}
                  error={error}
                  onHandover={(shipment) => setSelectedHandoverShipment(shipment)}
                  onShowLinks={(result) => setLastHandoverResult(result)}
                  onShowSticker={(shipment) => setShowStickerDownload(shipment)}
                />
              </div>

              {/* Right Column: Register Form or Subscription Paywall */}
              <div className="order-1 lg:order-2 space-y-6">
                {!isSubscriptionActive ? (
                  <MerchantUpgradeCard
                    walletAddress={account.address}
                    plan={plan || "free"}
                    role={role || "merchant"}
                    billingCycle={billingCycle}
                    subscriptionActive={subscriptionActive}
                    userCurrency={userCurrency}
                  />
                ) : (
                  <CreateShipmentCard
                    walletAddress={account.address}
                    apiKey={apiKey}
                    plan={plan}
                    shipmentsThisMonth={shipmentsThisMonth}
                    rolloverQuota={rolloverQuota}
                    billingCycleStart={billingCycleStart}
                    onSuccess={(shipment, secret) => {
                      queryClient.invalidateQueries({ queryKey: ["shipments"] });
                      queryClient.invalidateQueries({ queryKey: ["profile"] });
                      setCreatedInnerSecret(secret);
                      setShowStickerDownload(shipment);
                    }}
                    refetchProfile={refetchProfile}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Label Sticker Print Modal */}
      {showStickerDownload && (
        <StickerDownloadModal
          shipment={showStickerDownload}
          createdInnerSecret={createdInnerSecret}
          onClose={() => setShowStickerDownload(null)}
        />
      )}

      {/* Log Custody Handover Modal */}
      {selectedHandoverShipment && account && (
        <LogHandoverModal
          selectedShipment={selectedHandoverShipment}
          walletAddress={account.address}
          apiKey={apiKey}
          onClose={() => setSelectedHandoverShipment(null)}
          onSuccess={(result) => {
            queryClient.invalidateQueries({ queryKey: ["shipments"] });
            setSelectedHandoverShipment(null);
            setLastHandoverResult(result);
          }}
        />
      )}

      {/* Handover Success & Dual Dedicated Link Sharing Modal */}
      {lastHandoverResult && (
        <HandoverSuccessModal
          result={lastHandoverResult}
          onClose={() => setLastHandoverResult(null)}
        />
      )}
    </div>
  );
}
