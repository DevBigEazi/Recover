"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useTeam } from "@/context/TeamContext";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";
import WebhookConfigCard from "@/components/WebhookConfigCard/WebhookConfigCard";
import { Shipment, HandoverResult } from "@/components/Shipments/types";
import ShipmentsTable from "@/components/Shipments/ShipmentsTable";
import CreateShipmentCard from "@/components/Shipments/CreateShipmentCard";
import MerchantUpgradeCard from "@/components/Shipments/MerchantUpgradeCard";
import StickerDownloadModal from "@/components/Shipments/StickerDownloadModal";
import LogHandoverModal from "@/components/Shipments/LogHandoverModal";
import HandoverSuccessModal from "@/components/Shipments/HandoverSuccessModal";
import { Truck } from "lucide-react";
import Link from "next/link";

export default function ShipmentsPanel() {
  const { account } = useAuthReady();
  const { openLogin } = useAuth();
  const { isStaffMode, workspaceSession } = useTeam();
  const {
    apiKey,
    subscriptionActive,
    plan,
    billingCycle,
    billingCycleStart,
    shipmentsThisMonth,
    rolloverQuota,
    refetchProfile,
  } = useProfile();
  const queryClient = useQueryClient();

  const effectiveAddress = workspaceSession?.merchantAddress || account?.address;

  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);
  const [showStickerDownload, setShowStickerDownload] = useState<Shipment | null>(null);
  const [createdInnerSecret, setCreatedInnerSecret] = useState<string | null>(null);
  const [selectedHandoverShipment, setSelectedHandoverShipment] = useState<Shipment | null>(null);
  const [lastHandoverResult, setLastHandoverResult] = useState<HandoverResult | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  // Fetch shipments — for authenticated merchants and workspace staff
  const { data: shipments = [], isLoading, error } = useQuery<Shipment[]>({
    queryKey: ["shipments", effectiveAddress],
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

      const headers: Record<string, string> = {};
      if (effectiveAddress) {
        headers["x-owner-address"] = effectiveAddress;
      }
      if (activeApiKey && !activeApiKey.includes("•")) {
        headers["x-api-key"] = activeApiKey;
      }

      const response = await fetch(`/api/v1/shipments`, { headers });
      if (!response.ok) throw new Error("Failed to load shipments");
      return response.json();
    },
    enabled: !!effectiveAddress,
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const isSubscriptionActive = subscriptionActive === true || plan === "free" || isStaffMode;

  if (!account && !isStaffMode) {
    return (
      <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center mx-auto">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">
            Connect Merchant Account
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Connect your merchant account to access package custody, tracking QR labels, and delivery dispatches.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={openLogin}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            Sign In as Merchant Owner
          </button>
          <Link
            href="/workspace/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 text-center"
          >
            Staff Member PIN Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Merchant Webhook Configuration (merchant owner only) */}
      {!isStaffMode && <WebhookConfigCard variant="dark" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              walletAddress={effectiveAddress || ""}
              plan={plan || "free"}
              billingCycle={billingCycle}
              subscriptionActive={subscriptionActive}
              userCurrency={userCurrency}
            />
          ) : (
            <CreateShipmentCard
              walletAddress={effectiveAddress || ""}
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

      {/* Label Sticker Print Modal */}
      {showStickerDownload && (
        <StickerDownloadModal
          shipment={showStickerDownload}
          createdInnerSecret={createdInnerSecret}
          onClose={() => setShowStickerDownload(null)}
        />
      )}

      {/* Log Custody Handover Modal */}
      {selectedHandoverShipment && effectiveAddress && (
        <LogHandoverModal
          selectedShipment={selectedHandoverShipment}
          walletAddress={effectiveAddress}
          apiKey={apiKey}
          onClose={() => setSelectedHandoverShipment(null)}
          onSuccess={(result) => {
            queryClient.invalidateQueries({ queryKey: ["shipments"] });
            setSelectedHandoverShipment(null);
            setLastHandoverResult(result);
          }}
        />
      )}

      {/* Custody Handover Success Modal */}
      {lastHandoverResult && (
        <HandoverSuccessModal
          result={lastHandoverResult}
          onClose={() => setLastHandoverResult(null)}
        />
      )}
    </div>
  );
}
