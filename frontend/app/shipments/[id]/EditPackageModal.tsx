"use client";

import { useState, useEffect } from "react";
import { FileText, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface EditPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  initialValues: {
    packageName?: string | null;
    receiverName?: string | null;
    receiverPhone: string;
    destination?: string | null;
    weight?: string | number | null;
  };
  ownerAddress?: string;
  apiKey?: string | null;
  onSuccess: () => void;
}

function cleanWeightInput(raw: unknown): string {
  if (raw == null) return "";
  const str = String(raw).trim();
  if (!str || str.toLowerCase() === "unknown" || str.toLowerCase() === "n/a" || str.toLowerCase() === "nan") {
    return "";
  }
  const cleaned = str.replace(/kg/gi, "").trim();
  const num = parseFloat(cleaned);
  return !isNaN(num) && isFinite(num) ? String(num) : "";
}

export default function EditPackageModal({
  isOpen,
  onClose,
  shipmentId,
  initialValues,
  ownerAddress,
  apiKey,
  onSuccess,
}: EditPackageModalProps) {
  const [packageName, setPackageName] = useState(initialValues.packageName || "");
  const [receiverName, setReceiverName] = useState(initialValues.receiverName || "");
  const [receiverPhone, setReceiverPhone] = useState(initialValues.receiverPhone || "");
  const [destination, setDestination] = useState(initialValues.destination || "");
  const [weight, setWeight] = useState(cleanWeightInput(initialValues.weight));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPackageName(initialValues.packageName || "");
      setReceiverName(initialValues.receiverName || "");
      setReceiverPhone(initialValues.receiverPhone || "");
      setDestination(initialValues.destination || "");
      setWeight(cleanWeightInput(initialValues.weight));
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverPhone.trim()) {
      toast.error("Receiver phone is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const sessionToken = typeof window !== "undefined" && ownerAddress ? sessionStorage.getItem(`recover_session_jwt_${ownerAddress.toLowerCase()}`) : null;
      if (!sessionToken && (!apiKey || apiKey.includes("•"))) {
        toast.error("Authentication required: Please reconnect your wallet to establish a verified session.");
        setIsSubmitting(false);
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      } else if (apiKey && !apiKey.includes("•")) {
        headers["x-api-key"] = apiKey;
      }
      if (ownerAddress) {
        headers["x-owner-address"] = ownerAddress;
      }

      const response = await fetch(`/api/v1/shipments/${shipmentId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          packageName: packageName.trim() || undefined,
          receiverName: receiverName.trim() || undefined,
          receiverPhone: receiverPhone.trim(),
          destination: destination.trim() || undefined,
          weight: weight.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update package details.");
      }

      toast.success("Package details updated successfully!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Edit error";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-amber-400" /> Edit Package Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Package Name</label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="e.g. Express Parcel"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Receiver Name</label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="e.g. Alex Morgan"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Receiver Phone <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="e.g. +2348099887766"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="e.g. Lekki Phase 1, Lagos"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Weight (kg)</label>
            <input
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="e.g. 0.85"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !receiverPhone.trim()}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
