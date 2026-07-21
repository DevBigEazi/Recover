"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

export interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    registrationId: string;
    name: string;
  } | null;
  ownerAddress: string;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  "Sold item to a new owner",
  "Gifted / Given away ('Dashed') to someone",
  "Item broken, destroyed, or no longer useful",
  "Re-registering item under another account",
  "Other reason (specify below)",
];

export default function DeleteItemModal({
  isOpen,
  onClose,
  item,
  ownerAddress,
  onSuccess,
}: DeleteItemModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const finalReason =
    selectedReason === "Other reason (specify below)"
      ? customReason.trim()
      : selectedReason;

  const isConfirmValid = confirmInput.trim() === item.registrationId;

  const handleDelete = async () => {
    if (!finalReason) {
      setError("Please specify a valid deletion reason.");
      return;
    }

    if (!isConfirmValid) {
      setError(`Please type "${item.registrationId}" to confirm deletion.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/items/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": ownerAddress,
        },
        body: JSON.stringify({
          registrationId: item.registrationId,
          reason: finalReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item on-chain.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-neutral-white border-2 border-red-200 rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto animate-scale-up">
        {/* Critical Warning Header */}
        <div className="flex items-start justify-between border-b border-red-100 pb-3 sm:pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-red-700 font-display">
                Permanent Item Deletion
              </h3>
              <p className="text-[11px] sm:text-xs text-red-600 font-medium">
                Reflected permanently on Electroneum Blockchain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-neutral-slate hover:text-primary rounded-lg hover:bg-neutral-mist transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1.5 text-xs text-red-800 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5">
            ⚠️ CRITICAL WARNING: This action cannot be undone!
          </p>
          <p>
            You are deleting <strong>"{item.name}"</strong> (ID: #{item.registrationId}). This will permanently burn its registry record on the <strong>Electroneum Blockchain</strong> and invalidate any attached QR code stickers immediately.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Deletion Reason Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-primary uppercase tracking-wider">
            1. Select Mandatory Reason for Deletion <span className="text-red-500">*</span>
          </label>

          <div className="space-y-1.5">
            {PRESET_REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors select-none ${
                  selectedReason === r
                    ? "bg-red-50 border-red-300 text-red-900 font-bold"
                    : "bg-neutral-white border-gray-200 text-neutral-slate hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="deletionReason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                  className="accent-red-600"
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Text Box */}
          {selectedReason === "Other reason (specify below)" && (
            <div className="pt-1">
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Write your specific reason here (e.g., Sold to John, donated to charity)..."
                className="w-full rounded-xl border border-red-300 p-3 text-xs focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500 bg-neutral-white text-primary"
                rows={2}
                required
              />
            </div>
          )}
        </div>

        {/* Typing Confirmation Requirement */}
        <div className="space-y-1.5 pt-1 border-t border-neutral-mist">
          <label className="block text-[11px] sm:text-xs font-bold text-primary">
            2. Type Registration ID <span className="font-mono text-red-600">{item.registrationId}</span> to confirm deletion:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type ${item.registrationId}`}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-mono focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || !isConfirmValid || !finalReason}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-neutral-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Broadcasting to Blockchain...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
