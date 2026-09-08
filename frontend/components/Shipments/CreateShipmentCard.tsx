"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Shipment } from "./types";

interface CreateShipmentCardProps {
  walletAddress: string;
  apiKey?: string | null;
  plan: string;
  shipmentsThisMonth: number;
  rolloverQuota: number;
  billingCycleStart: string | null;
  onSuccess: (shipment: Shipment, innerSecret: string | null) => void;
  refetchProfile: () => void;
}

export default function CreateShipmentCard({
  walletAddress,
  apiKey,
  plan,
  shipmentsThisMonth,
  rolloverQuota,
  billingCycleStart,
  onSuccess,
  refetchProfile,
}: CreateShipmentCardProps) {
  const [packageName, setPackageName] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isMobileRegisterOpen, setIsMobileRegisterOpen] = useState(false);

  const handleRegisterShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    if (packageWeight && (isNaN(Number(packageWeight)) || Number(packageWeight) <= 0)) {
      toast.error("Package weight must be a valid positive number in kg.");
      return;
    }

    setIsRegistering(true);
    try {
      let activeApiKey = apiKey;
      if (!activeApiKey && walletAddress) {
        try {
          const keyRes = await fetch("/api/profile/api-key", {
            method: "POST",
            headers: { "x-owner-address": walletAddress },
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
        "Content-Type": "application/json",
        "x-owner-address": walletAddress,
      };
      if (activeApiKey && !activeApiKey.includes("•")) {
        headers["x-api-key"] = activeApiKey;
      }

      const response = await fetch("/api/v1/shipments/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          shipperAddress: walletAddress,
          packageName: packageName.trim() || "General Package",
          weight: packageWeight.trim() || "unknown",
          receiverName: receiverName.trim() || null,
          receiverPhone: receiverPhone.trim() || null,
          destination: destination.trim() || null,
          metadata: {
            name: packageName.trim() || "General Package",
            weight: packageWeight.trim() || "unknown",
            receiverName: receiverName.trim() || null,
            receiverPhone: receiverPhone.trim() || null,
            destination: destination.trim() || null,
          },
        }),
      });

      if (response.status === 402) {
        toast.error("Active subscription required. Please upgrade to create shipments.");
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to register shipment");
      }

      const data = await response.json();
      toast.success("Package registered and secured successfully!");
      setPackageName("");
      setPackageWeight("");
      setReceiverName("");
      setReceiverPhone("");
      setDestination("");
      refetchProfile();
      onSuccess(data.shipment, data.innerSecret || null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error creating shipment";
      toast.error(errMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  const baseLimit =
    plan === "pro_lite"
      ? 2500
      : plan === "pro_starter"
      ? 10000
      : plan === "pro_growth"
      ? 100000
      : plan === "pro_scale"
      ? 500000
      : plan === "pro"
      ? 100000
      : 100;
  const totalCap = baseLimit + (rolloverQuota || 0);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-lg">
      {/* Card Header — Interactive toggle on mobile (< lg), static on desktop (≥ lg) */}
      <button
        type="button"
        onClick={() => setIsMobileRegisterOpen(!isMobileRegisterOpen)}
        className="w-full flex items-center justify-between text-left lg:pointer-events-none mb-1 lg:mb-4 group cursor-pointer lg:cursor-default select-none"
      >
        <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
          <Plus className="w-5 h-5 text-blue-400" /> Register Package
        </h3>
        <span className="lg:hidden p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 group-hover:text-white transition-colors flex items-center shrink-0">
          {isMobileRegisterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Form Body — Collapsible on mobile, always visible on desktop (lg:block) */}
      <div className={`mt-3 lg:mt-0 space-y-4 ${isMobileRegisterOpen ? "block" : "hidden lg:block"}`}>
        <div className="mb-4 p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-xs flex items-center justify-between text-blue-200">
          <span>
            🏷️{" "}
            <strong>
              {plan === "free"
                ? "Free Tier"
                : plan === "pro_lite"
                ? "Pro Lite"
                : plan === "pro_starter"
                ? "Pro Starter"
                : plan === "pro_growth"
                ? "Pro Growth"
                : plan === "pro_scale"
                ? "Pro Scale"
                : "Pro Tier"}
              :
            </strong>{" "}
            {shipmentsThisMonth.toLocaleString()} / {totalCap.toLocaleString()} shipments used{" "}
            {billingCycleStart
              ? `(Since ${new Date(billingCycleStart).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })})`
              : ""}
          </span>
          <Link href="/settings" className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline">
            Manage →
          </Link>
        </div>

        <form onSubmit={handleRegisterShipment} className="space-y-4">
          <div>
            <label htmlFor="pkg-name" className="block text-xs font-semibold text-slate-400 mb-1.5">
              Package Reference Name *
            </label>
            <input
              id="pkg-name"
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. iPhone 15 Pro, Shipment A"
              required
              className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rec-name" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Recipient Name (Optional)
              </label>
              <input
                id="rec-name"
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="rec-phone" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Recipient Phone Number (Optional)
              </label>
              <input
                id="rec-phone"
                type="tel"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pkg-weight" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Weight in kg (Optional)
              </label>
              <input
                id="pkg-weight"
                type="text"
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
                placeholder="e.g. 0.8"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="pkg-dest" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Destination City / Area (Optional)
              </label>
              <input
                id="pkg-dest"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Lekki, Lagos"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:bg-slate-800 disabled:text-slate-600 cursor-pointer"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Registering...
              </>
            ) : (
              "Register Package"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
