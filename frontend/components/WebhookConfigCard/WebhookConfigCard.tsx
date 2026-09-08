"use client";

import { useState, useEffect } from "react";
import { Globe, Send, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useProfile } from "@/context/ProfileContext";
import { useActiveAccount } from "thirdweb/react";

interface WebhookConfigCardProps {
  variant?: "dark" | "light";
  className?: string;
}

export default function WebhookConfigCard({
  variant = "dark",
  className = "",
}: WebhookConfigCardProps) {
  const account = useActiveAccount();
  const { webhookUrl: savedWebhookUrl, refetchProfile } = useProfile();

  const [inputUrl, setInputUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    message: string;
    statusCode?: number;
    responseTimeMs?: number;
  } | null>(null);

  useEffect(() => {
    setInputUrl(savedWebhookUrl || "");
  }, [savedWebhookUrl]);

  const isDark = variant === "dark";
  const hasChanges = (inputUrl.trim() || "") !== (savedWebhookUrl || "");

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!account?.address) {
      toast.error("Please connect your wallet to save webhook settings.");
      return;
    }

    const trimmed = inputUrl.trim();
    if (trimmed && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      toast.error("Webhook URL must start with http:// or https://");
      return;
    }

    setIsSaving(true);
    setLastTestResult(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          walletAddress: account.address,
          webhookUrl: trimmed || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update webhook URL.");
      }

      toast.success(
        trimmed ? "Webhook URL configured successfully!" : "Webhook URL removed."
      );
      refetchProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    if (!account?.address) {
      toast.error("Please connect your wallet to test webhooks.");
      return;
    }

    const targetUrl = inputUrl.trim() || savedWebhookUrl || "";
    if (!targetUrl) {
      toast.error("Enter a valid Webhook URL before testing.");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      toast.error("Webhook URL must start with http:// or https://");
      return;
    }

    setIsTesting(true);
    setLastTestResult(null);

    try {
      const res = await fetch("/api/profile/webhook/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          webhookUrl: targetUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ping test failed");
      }

      setLastTestResult({
        success: true,
        message: data.message || "Webhook reachable!",
        statusCode: data.statusCode,
        responseTimeMs: data.responseTimeMs,
      });
      toast.success(`Webhook active! Response HTTP ${data.statusCode} in ${data.responseTimeMs}ms`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook unreachable";
      setLastTestResult({
        success: false,
        message: msg,
      });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setInputUrl("");
  };

  return (
    <div
      className={`rounded-2xl p-4 md:p-5 transition-all shadow-sm ${
        isDark
          ? "bg-slate-900/60 border border-slate-800/80 text-white backdrop-blur-md"
          : "bg-neutral-white border border-neutral-mist text-primary"
      } ${className}`}
    >
      {/* Main Single-Line Container on Desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Icon, Title & Status Badge on a Single Straight Line */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <Globe className={`w-5 h-5 shrink-0 ${isDark ? "text-blue-400" : "text-accent"}`} />
          <h3
            className={`text-sm sm:text-base font-bold whitespace-nowrap ${
              isDark ? "text-white" : "text-primary font-display"
            }`}
          >
            Merchant Webhook Configuration
          </h3>

          {savedWebhookUrl ? (
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                isDark
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span
              className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                isDark
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-neutral-mist text-neutral-slate border border-gray-200"
              }`}
            >
              Not Configured
            </span>
          )}
        </div>

        {/* Right: URL Input & Actions on a Straight Line */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col sm:flex-row items-center gap-2 lg:max-w-2xl w-full">
          <div className="relative flex-1 w-full">
            <input
              id="webhook-url-input"
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://api.yourdomain.com/webhooks/recover"
              className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-blue-500/20"
                  : "bg-neutral-mist border border-gray-300 text-primary placeholder-gray-400 focus:border-accent focus:ring-accent/20"
              }`}
            />
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear input"
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                  isDark
                    ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    : "text-neutral-slate hover:text-primary hover:bg-gray-200"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className={`flex-1 sm:flex-initial text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
                isDark
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                  : "bg-accent hover:bg-accent-light text-white shadow-xs"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </button>

            <button
              type="button"
              onClick={handleTestPing}
              disabled={isTesting || !inputUrl.trim()}
              title="Send a sample payload to verify connectivity"
              className={`flex-1 sm:flex-initial text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
                isDark
                  ? "border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200"
                  : "border-gray-300 bg-neutral-white hover:bg-neutral-mist text-primary"
              }`}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> Ping...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Test Ping
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Test Result Feedback Card */}
      {lastTestResult && (
        <div
          className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            lastTestResult.success
              ? isDark
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-green-50 border-green-200 text-emerald-800"
              : isDark
              ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {lastTestResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="flex-1 min-w-0">
            <span className="font-semibold block">{lastTestResult.message}</span>
            {lastTestResult.responseTimeMs !== undefined && (
              <span className="text-[10px] opacity-80 block mt-0.5 font-mono">
                Latency: {lastTestResult.responseTimeMs}ms · Status: {lastTestResult.statusCode}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
