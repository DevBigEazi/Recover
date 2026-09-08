"use client";

import React, { useState } from "react";
import { ArrowRightLeft, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Shipment, HandoverResult } from "./types";
import { formatTrackingCode } from "@/lib/format";

interface LogHandoverModalProps {
  selectedShipment: Shipment;
  walletAddress: string;
  apiKey?: string | null;
  onClose: () => void;
  onSuccess: (result: HandoverResult) => void;
}

export default function LogHandoverModal({
  selectedShipment,
  walletAddress,
  apiKey,
  onClose,
  onSuccess,
}: LogHandoverModalProps) {
  const [handoverRiderName, setHandoverRiderName] = useState("");
  const [handoverRiderPhone, setHandoverRiderPhone] = useState("");
  const [handoverRiderPlateNumber, setHandoverRiderPlateNumber] = useState("");
  const [handoverLocation, setHandoverLocation] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  const handleLogHandoverMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !selectedShipment || !selectedShipment._id) return;
    if (!handoverRiderPhone.trim()) {
      toast.error("Please provide the rider's contact phone number.");
      return;
    }

    setIsSubmittingHandover(true);
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

      const response = await fetch(`/api/v1/shipments/${selectedShipment._id}/handover`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          operatorAddress: walletAddress,
          riderName: handoverRiderName.trim() || undefined,
          riderPhone: handoverRiderPhone.trim(),
          riderPlateNumber: handoverRiderPlateNumber.trim() || undefined,
          locationContext: handoverLocation.trim() || undefined,
          notes: handoverNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to record custody handover.");
      }

      const data = await response.json();
      toast.success("Custody handover logged successfully!");
      onSuccess({
        riderLink: data.riderLink,
        recipientLink: data.recipientLink,
        courierPin: data.courierPin,
        riderPhone: data.riderPhone || handoverRiderPhone.trim() || null,
        riderName: data.riderName || handoverRiderName.trim() || null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Handover error";
      toast.error(msg);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <ArrowRightLeft className="w-5 h-5 text-blue-400" /> Log Custody Handover
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Package:{" "}
              <span className="font-mono text-slate-300 font-bold">
                {selectedShipment.trackingCode || formatTrackingCode(selectedShipment._id)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Record custody transfer to a delivery rider or driver. The event will be logged onto the tamper-proof ledger.
        </p>

        <form onSubmit={handleLogHandoverMain} className="space-y-4">
          <div>
            <label htmlFor="rider-phone" className="block text-xs font-semibold text-slate-400 mb-1.5">
              Rider Contact Phone Number *
            </label>
            <input
              id="rider-phone"
              type="tel"
              value={handoverRiderPhone}
              onChange={(e) => setHandoverRiderPhone(e.target.value)}
              placeholder="e.g. +234 802 123 4567"
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="rider-name" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Rider Full Name (Optional)
              </label>
              <input
                id="rider-name"
                type="text"
                value={handoverRiderName}
                onChange={(e) => setHandoverRiderName(e.target.value)}
                placeholder="e.g. Abubakar Sanusi"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="rider-plate" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Ride / Vehicle Plate No. (Optional)
              </label>
              <input
                id="rider-plate"
                type="text"
                value={handoverRiderPlateNumber}
                onChange={(e) => setHandoverRiderPlateNumber(e.target.value)}
                placeholder="e.g. KJA-492-XY"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="handover-loc" className="block text-xs font-semibold text-slate-400 mb-1.5">
              Delivery Location / Checkpoint (Optional)
            </label>
            <input
              id="handover-loc"
              type="text"
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
              placeholder="e.g. Lekki Phase 1 Hub, Lagos"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="handover-notes" className="block text-xs font-semibold text-slate-400 mb-1.5">
              Handover Notes / Instructions (Optional)
            </label>
            <input
              id="handover-notes"
              type="text"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="e.g. Handle with care, fragile items enclosed"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingHandover || !handoverRiderPhone.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-white"
            >
              {isSubmittingHandover ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Logging...
                </>
              ) : (
                "Record Handover"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
