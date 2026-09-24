"use client";

import { useState, useRef, FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useQueryClient } from "@tanstack/react-query";

export default function WorkspaceLoginPage() {
  const router = useRouter();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handlePinChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = [...pin];
      const slice = digits.slice(0, 6 - index);
      for (let i = 0; i < slice.length; i++) {
        if (index + i < 6) {
          next[index + i] = slice[i];
        }
      }
      setPin(next);
      const nextFocus = Math.min(index + slice.length, 5);
      pinRefs.current[nextFocus]?.focus();
      return;
    }

    const digit = digits.slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    if (digit && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const next = [...pin];
    for (let i = 0; i < 6; i++) {
      next[i] = pastedData[i] || "";
    }
    setPin(next);

    const targetFocus = Math.min(pastedData.length, 5);
    pinRefs.current[targetFocus]?.focus();
  }

  function handlePinKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const pinValue = pin.join("");
    if (!email || pinValue.length !== 6) {
      toast.error("Please enter your email and 6-digit PIN.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/workspace/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), pin: pinValue }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; token?: string };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Invalid email or PIN.");
        return;
      }

      // Persist workspace token in localStorage as reliable fallback for environments where cookies are dropped
      if (data.token) {
        try {
          localStorage.setItem("workspace_token", data.token);
        } catch {
          // ignore
        }
      }

      // Log out of personal wallet if connected to isolate workspace session
      if (activeWallet) {
        try {
          disconnect(activeWallet);
        } catch (walletErr) {
          console.warn("Could not disconnect personal wallet:", walletErr);
        }
      }

      // Reset profile/wallet queries and re-fetch workspace session
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-session"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-presets"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-analytics"] });

      toast.success("Welcome to your workspace!");
      router.push("/workspace");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in duration-150">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800/80 p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Recover
            </span>
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 uppercase tracking-wider">
              Staff Workspace
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Sign in to access your assigned POS terminal & digital sales register.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 sm:space-y-6">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="ws-email"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
            >
              Work Email
            </label>
            <input
              id="ws-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-hidden text-white placeholder-slate-500 transition-colors"
            />
          </div>

          {/* 6-Digit PIN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                6-Digit Access PIN
              </label>
              <span className="text-[11px] text-slate-500">Sent to your inbox</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`ws-pin-${i}`}
                  ref={(el) => {
                    pinRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  onPaste={handlePinPaste}
                  className={`w-full aspect-square text-center text-lg sm:text-xl font-bold border rounded-xl outline-hidden transition-all text-white min-w-0 ${
                    digit
                      ? "border-blue-500 bg-blue-950/50 text-blue-300 shadow-2xs"
                      : "border-slate-800 bg-slate-950 focus:border-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            id="ws-login-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-11"
          >
            <span>{loading ? "Signing in..." : "Sign in to Workspace"}</span>
            <span aria-hidden="true">→</span>
          </button>

          {/* Link back */}
          <p className="text-center text-xs text-slate-500 pt-1">
            Not a workspace team member?{" "}
            <Link
              href="/"
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Open Recover App
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
