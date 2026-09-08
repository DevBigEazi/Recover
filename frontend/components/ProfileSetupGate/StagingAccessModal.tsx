"use client";

import React, { useState } from "react";

interface StagingAccessModalProps {
  onVerified: () => void;
}

export default function StagingAccessModal({ onVerified }: StagingAccessModalProps) {
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);

  const handleVerifyAccess = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const trimmed = accessCode.trim().toUpperCase();
    const validCodes = ["RECOVER2026", "ALPHA2026", "INVITE2026"];
    if (process.env.NEXT_PUBLIC_ACCESS_CODE) {
      validCodes.push(process.env.NEXT_PUBLIC_ACCESS_CODE.trim().toUpperCase());
    }

    if (validCodes.includes(trimmed)) {
      if (typeof window !== "undefined") {
        localStorage.setItem("recover_access_unlocked", "true");
      }
      onVerified();
    } else {
      setAccessError("Invalid invite or access code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-mist flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-4 bg-amber-50 rounded-full text-amber-500 border border-amber-100 animate-pulse">
            <span className="text-2xl">🔒</span>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary font-display">Alpha-Testing Access</h2>
          <p className="text-xs text-neutral-slate max-w-xs mx-auto leading-normal">
            Recover is currently in invite-only alpha-testing. Please enter your invite code to continue.
          </p>
        </div>

        <form onSubmit={handleVerifyAccess} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="invite-code" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              required
              placeholder="Enter invite code (e.g. ACCESS2026)"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setAccessError(null);
              }}
              className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono text-center tracking-widest uppercase font-semibold"
            />
          </div>

          {accessError && (
            <p className="text-xs font-medium text-red-600 animate-fade-in">
              {accessError}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            Verify & Enter
          </button>
        </form>
      </div>
    </div>
  );
}
