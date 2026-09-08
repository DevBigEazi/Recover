"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/context/ProfileContext";
import { Loader2, ShieldAlert, KeyRound, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface ApiKeyCardProps {
  walletAddress: string;
}

export default function ApiKeyCard({ walletAddress }: ApiKeyCardProps) {
  const {
    role,
    apiKey,
    testApiKey,
    apiKeyMasked,
    testApiKeyMasked,
    refetchProfile,
  } = useProfile();

  const [localApiKeyMasked, setLocalApiKeyMasked] = useState<string | null>(null);
  const [localTestApiKeyMasked, setLocalTestApiKeyMasked] = useState<string | null>(null);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [isGeneratingTestApiKey, setIsGeneratingTestApiKey] = useState(false);
  const [showRollKeyModal, setShowRollKeyModal] = useState(false);
  const [rollTargetKeyType, setRollTargetKeyType] = useState<"live" | "test">("live");
  const [newlyGeneratedSecretKey, setNewlyGeneratedSecretKey] = useState<{ key: string; type: "live" | "test" } | null>(null);
  const [hasCopiedSecretKey, setHasCopiedSecretKey] = useState(false);

  useEffect(() => {
    if (apiKeyMasked) setLocalApiKeyMasked(apiKeyMasked);
    if (testApiKeyMasked) setLocalTestApiKeyMasked(testApiKeyMasked);
  }, [apiKeyMasked, testApiKeyMasked]);

  const activeApiKeyMasked =
    apiKeyMasked ||
    localApiKeyMasked ||
    (apiKey ? `${apiKey.substring(0, 13)}••••${apiKey.slice(-4)}` : null);

  const activeTestApiKeyMasked =
    testApiKeyMasked ||
    localTestApiKeyMasked ||
    (testApiKey ? `${testApiKey.substring(0, 13)}••••${testApiKey.slice(-4)}` : null);

  const handleGenerateApiKey = async (keyType: "live" | "test" = "live") => {
    if (!walletAddress) return;
    if (keyType === "test") setIsGeneratingTestApiKey(true);
    else setIsGeneratingApiKey(true);

    try {
      const res = await fetch("/api/profile/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-owner-address": walletAddress },
        body: JSON.stringify({ keyType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate API Key");
      }
      const data = await res.json();
      if (keyType === "test") {
        setLocalTestApiKeyMasked(data.testApiKeyMasked || data.apiKeyMasked);
      } else {
        setLocalApiKeyMasked(data.apiKeyMasked);
      }
      if (data.generatedKey) {
        try {
          if (keyType === "test" || data.generatedKey.startsWith("rec_test_")) {
            sessionStorage.setItem("last_generated_test_api_key", data.generatedKey);
          }
        } catch {
          // ignore session storage errors
        }
        setNewlyGeneratedSecretKey({ key: data.generatedKey, type: keyType });
        setHasCopiedSecretKey(false);
      }
      toast.success(`${keyType === "test" ? "Test Sandbox" : "Live Production"} API Key generated!`);
      refetchProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setIsGeneratingApiKey(false);
      setIsGeneratingTestApiKey(false);
    }
  };

  if (role !== "merchant") return null;

  return (
    <>
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            🔌 Developer REST API Keys &amp; Sandbox Environment
          </h2>
          <p className="text-xs text-neutral-slate mt-1">
            Authenticate server-to-server requests from your e-commerce backend (Shopify, WooCommerce, ERP) without logging in.
          </p>
        </div>

        {/* Rule 9 Security Notice */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Secret API Key Security Notice:</strong> Treat your Secret API keys like passwords. Store them securely in server environment variables. Never expose live keys in client-side browser code or public repositories.
          </div>
        </div>

        <div className="space-y-4">
          {/* 1. Test Sandbox API Key Card */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider block">🧪 Test Sandbox API Key</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Free Simulation</span>
                </div>
                <code className="text-xs sm:text-sm font-mono font-bold text-indigo-950 bg-neutral-white px-2.5 py-1 rounded border border-indigo-200 inline-block mt-1">
                  {activeTestApiKeyMasked || "No Test API Key generated"}
                </code>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTestApiKeyMasked) {
                      setRollTargetKeyType("test");
                      setShowRollKeyModal(true);
                    } else {
                      handleGenerateApiKey("test");
                    }
                  }}
                  disabled={isGeneratingTestApiKey}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingTestApiKey ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                  ) : activeTestApiKeyMasked ? (
                    "Roll Test Key 🔄"
                  ) : (
                    "Generate Test Key ✨"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 2. Live Production API Key Card */}
          <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider block">🚀 Live Production API Key</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Mainnet Live</span>
                </div>
                <code className="text-xs sm:text-sm font-mono font-bold text-primary bg-neutral-white px-2.5 py-1 rounded border border-neutral-mist inline-block mt-1">
                  {activeApiKeyMasked || "No Live API Key generated yet"}
                </code>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeApiKeyMasked) {
                      setRollTargetKeyType("live");
                      setShowRollKeyModal(true);
                    } else {
                      handleGenerateApiKey("live");
                    }
                  }}
                  disabled={isGeneratingApiKey}
                  className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingApiKey ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                  ) : activeApiKeyMasked ? (
                    "Roll Live Key 🔄"
                  ) : (
                    "Generate Live Key ✨"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Link href="/developers" className="text-xs font-bold text-accent underline inline-flex items-center gap-1">
          Explore Developer API Documentation &amp; Live Testing Playground →
        </Link>
      </div>

      {/* Roll API Key Confirmation Modal */}
      {showRollKeyModal && (
        <div className="fixed inset-0 bg-neutral-primary/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold font-display">
                Roll {rollTargetKeyType === "test" ? "Test Sandbox" : "Live Production"} API Key?
              </h3>
            </div>

            <p className="text-xs text-neutral-slate leading-relaxed">
              Rolling your {rollTargetKeyType === "test" ? "Test Sandbox" : "Live Production"} API key will <strong>immediately revoke and invalidate your current key</strong>. Any server, script, or testing environment using the old API key will be disconnected until updated with the new key.
            </p>

            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-3 text-[11px] font-mono text-neutral-slate">
              Current Key: {rollTargetKeyType === "test" ? (activeTestApiKeyMasked || "None") : (activeApiKeyMasked || "None")}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-mist">
              <button
                type="button"
                onClick={() => setShowRollKeyModal(false)}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRollKeyModal(false);
                  await handleGenerateApiKey(rollTargetKeyType);
                }}
                disabled={isGeneratingApiKey || isGeneratingTestApiKey}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isGeneratingApiKey || isGeneratingTestApiKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, Revoke & Roll Key 🔄"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Secret API Key Reveal Modal */}
      {newlyGeneratedSecretKey && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-primary font-display">
                Save Your {newlyGeneratedSecretKey.type === "test" ? "Test Sandbox" : "Live Production"} API Key
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Please copy and store your API key securely now. For your protection, this key is hashed with <strong>SHA-256</strong> in our database and <strong className="text-red-600 font-bold">will never be shown again</strong>.
              </p>
            </div>

            <div className="bg-slate-950 text-emerald-400 font-mono p-4 rounded-xl text-xs sm:text-sm break-all flex items-center justify-between gap-3 border border-slate-800">
              <span className="select-all font-bold">{newlyGeneratedSecretKey.key}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(newlyGeneratedSecretKey.key);
                    setHasCopiedSecretKey(true);
                    toast.success("API Key copied to clipboard!");
                  } catch {
                    toast.error("Copy failed. Select the key and copy it manually.");
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {hasCopiedSecretKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopiedSecretKey ? "Copied!" : "Copy API Key"}</span>
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Once you close this dialog, you cannot retrieve this raw API key again.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNewlyGeneratedSecretKey(null)}
              className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done — I Have Saved My API Key
            </button>
          </div>
        </div>
      )}
    </>
  );
}
