"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useProfile } from "@/context/ProfileContext";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";
import WebhookConfigCard from "@/components/WebhookConfigCard/WebhookConfigCard";
import { Shipment, HandoverResult } from "@/components/Shipments/types";
import ShipmentsTable from "@/components/Shipments/ShipmentsTable";
import CreateShipmentCard from "@/components/Shipments/CreateShipmentCard";
import MerchantUpgradeCard from "@/components/Shipments/MerchantUpgradeCard";
import StickerDownloadModal from "@/components/Shipments/StickerDownloadModal";
import LogHandoverModal from "@/components/Shipments/LogHandoverModal";
import HandoverSuccessModal from "@/components/Shipments/HandoverSuccessModal";

export default function ShipmentsPanel() {
  const { account } = useAuthReady();
  const {
    apiKey,
    subscriptionActive,
    role,
    plan,
    billingCycle,
    billingCycleStart,
    shipmentsThisMonth,
    rolloverQuota,
    refetchProfile,
  } = useProfile();
  const queryClient = useQueryClient();

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

  if (!account) {
    return (
      <div className="p-12 text-center bg-neutral-white dark:bg-neutral-dark rounded-2xl border border-neutral-slate/15 dark:border-neutral-white/10 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-neutral-dark dark:text-neutral-white">
          Sign In Required
        </h3>
        <p className="text-xs text-neutral-slate dark:text-neutral-white/60 max-w-md mx-auto">
          Please connect your merchant account to access package custody and delivery dispatches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Merchant Webhook Configuration */}
      <WebhookConfigCard variant="dark" />

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
