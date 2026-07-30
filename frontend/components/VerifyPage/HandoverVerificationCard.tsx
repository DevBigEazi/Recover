"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface HandoverVerificationCardProps {
  itemId: string;
}

export default function HandoverVerificationCard({ itemId }: HandoverVerificationCardProps) {
  const [inputPin, setInputPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{ valid: boolean; message: string } | null>(null);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin.trim()) return;

    setIsVerifyingPin(true);
    setPinResult(null);

    try {
      const res = await fetch(`/api/items/${itemId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: inputPin.trim() }),
      });

      const data = await res.json();
      setPinResult({ valid: data.valid, message: data.message });
    } catch (err) {
      console.error("Failed to verify PIN:", err);
      setPinResult({ valid: false, message: "Failed to connect to verification server." });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="mt-8 bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
      <div className="flex items-center gap-3 border-b border-neutral-mist pb-4">
        <div className="p-2.5 bg-accent/10 rounded-xl text-accent shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-primary font-display">In-Person Handover PIN Verification</h3>
          <p className="text-xs text-neutral-slate mt-0.5">
            Meeting the owner? Ask them for their 4-6 digit Handover PIN code and enter it below to confirm authentic ownership before handing over the item.
          </p>
        </div>
      </div>

      <form onSubmit={handleVerifyPin} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <input
            type="text"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="Enter owner's PIN code (e.g. 849232)"
            maxLength={10}
            className="flex-1 bg-neutral-mist/30 border border-neutral-mist rounded-xl px-2 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isVerifyingPin || !inputPin.trim()}
            className="bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2"
          >
            {isVerifyingPin ? (
              <Loader2 className="animate-spin h-4 w-4 text-white" />
            ) : (
              "Verify PIN"
            )}
          </button>
        </div>

        {pinResult && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              pinResult.valid
                ? "bg-green-50 border border-green-200 text-accent"
                : "bg-red-50 border border-red-200 text-critical"
            }`}
          >
            <span>{pinResult.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}
