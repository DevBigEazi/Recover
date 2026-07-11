"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { client } from "@/lib/client";
import { electroneum } from "@/lib/chain";
import { recoverContract } from "@/lib/contract";
import { readContract } from "thirdweb";

interface SyncedItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  instructions: string;
  owner: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VerifyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const [item, setItem] = useState<SyncedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle state to reveal finder report form
  const [showReportForm, setShowReportForm] = useState(false);

  const syncOnChainStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Read local cached metadata if available
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      let localItem = storedItems[itemId] as SyncedItem | undefined;

      // 2. Read live status on-chain (wallet-free read using RPC)
      const statusMap: ("Active" | "Lost" | "Recovered")[] = ["Active", "Lost", "Recovered"];
      let onChainStatus: "Active" | "Lost" | "Recovered" = "Active";
      let lastUpdatedTime = Date.now();
      let onChainOwner = "";
      let onChainHash = "";

      try {
        const data = await readContract({
          contract: recoverContract,
          method:
            "function getItem(uint256 registrationId) view returns ((uint256 registrationId, address owner, uint8 status, uint40 registeredAt, uint40 lastUpdated, bytes32 itemHash) item)",
          params: [BigInt(itemId)],
        });

        onChainStatus = statusMap[data.status];
        lastUpdatedTime = Number(data.lastUpdated) * 1000;
        onChainOwner = data.owner;
        onChainHash = data.itemHash;
      } catch (err) {
        console.error("On-chain query failed:", err);
        // If contract query fails and no local metadata is found, the item doesn't exist
        if (!localItem) {
          setItem(null);
          setIsLoading(false);
          return;
        }
      }

      // 3. Assemble synced item
      if (!localItem) {
        // Fallback if metadata is missing locally, but exists on-chain
        localItem = {
          registrationId: itemId,
          name: `Recover Item #${itemId}`,
          brand: "",
          serial: "",
          reward: "",
          contact: "",
          instructions: "",
          owner: onChainOwner,
          status: onChainStatus,
          itemHash: onChainHash,
          registeredAt: lastUpdatedTime,
          lastUpdated: lastUpdatedTime,
        };
      } else {
        // Sync cached metadata with live on-chain status
        localItem.status = onChainStatus;
        localItem.lastUpdated = lastUpdatedTime;
        storedItems[itemId] = localItem;
        localStorage.setItem("recover_items", JSON.stringify(storedItems));
      }

      setItem(localItem);
    } catch (err) {
      console.error(err);
      setError("Failed to verify item status on the Electroneum network.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncOnChainStatus();
  }, [itemId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-neutral-slate font-medium">Verifying item on-chain...</span>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-50 rounded-full border border-red-100">
              <svg className="w-8 h-8 text-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary font-display mb-2">Invalid QR Code</h2>
          <p className="text-sm text-neutral-slate mb-6">
            This QR code is not registered on the Recover platform. Please check the sticker or contact support.
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-light text-neutral-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const maskAddress = (addr: string) => {
    if (!addr || addr.length < 10) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Branch on Status */}
        {item.status !== "Lost" ? (
          /* ACTIVE / RECOVERED CARD STATE (Teal Theme) */
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-green-50 rounded-full border border-green-100">
                {/* Shield Check Icon */}
                <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs font-bold text-accent uppercase tracking-wider">
                ✅ Verified Active
              </span>
              <h2 className="text-2xl font-bold text-primary font-display mt-2">Verified Owner Ownership</h2>
              <p className="text-sm text-neutral-slate max-w-md mx-auto">
                This item is registered on the Recover registry. It belongs to the verified wallet address below.
              </p>
            </div>

            {/* Item Details block */}
            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
              <div className="flex justify-between border-b border-neutral-mist pb-2">
                <span className="text-neutral-slate">Item name:</span>
                <span className="font-semibold text-primary">{item.name}</span>
              </div>
              {item.brand && (
                <div className="flex justify-between border-b border-neutral-mist pb-2">
                  <span className="text-neutral-slate">Brand:</span>
                  <span className="font-semibold text-primary">{item.brand}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-slate">Owner Wallet:</span>
                <span className="font-mono font-medium text-primary bg-neutral-mist px-2 py-0.5 rounded-sm">
                  {maskAddress(item.owner)}
                </span>
              </div>
            </div>

            <div className="text-xs text-neutral-slate max-w-sm mx-auto">
              If this is your item, you can toggle its status or edit metadata via the{" "}
              <Link href="/dashboard" className="text-accent hover:underline font-semibold">
                Dashboard
              </Link>
              .
            </div>
          </div>
        ) : (
          /* LOST CARD STATE (Amber Theme) */
          <div className="space-y-6">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
              
              {/* Alert Warning icon */}
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                  <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold text-warning uppercase tracking-wider">
                  ⚠️ Reported Lost
                </span>
                <h2 className="text-2xl font-bold text-primary font-display mt-2">This Item is Missing</h2>
                <p className="text-sm text-neutral-slate max-w-md mx-auto">
                  The owner of this item has flagged it as missing. If you have found it, please contact them using the buttons below.
                </p>
              </div>

              {/* Reward info */}
              {item.reward && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto flex items-center justify-center gap-2">
                  <span className="text-lg">🎁</span>
                  <span className="text-sm font-bold text-warning">
                    Recovery Reward offered: {item.reward}
                  </span>
                </div>
              )}

              {/* Item Details block */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
                <div className="flex justify-between border-b border-neutral-mist pb-2">
                  <span className="text-neutral-slate">Item name:</span>
                  <span className="font-semibold text-primary">{item.name}</span>
                </div>
                {item.brand && (
                  <div className="flex justify-between border-b border-neutral-mist pb-2">
                    <span className="text-neutral-slate">Brand:</span>
                    <span className="font-semibold text-primary">{item.brand}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-slate">Lost Since:</span>
                  <span className="font-semibold text-primary">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Custom Recovery Instructions */}
              {item.instructions && (
                <div className="bg-neutral-mist/35 border border-neutral-mist p-6 rounded-xl text-left max-w-md mx-auto">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Instructions from Owner</h4>
                  <p className="text-sm text-neutral-slate leading-relaxed font-sans">{item.instructions}</p>
                </div>
              )}

              {/* Action Trigger Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  onClick={() => setShowReportForm(true)}
                  className="flex-1 bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                  <span>I Found This Item</span>
                </button>
                
                {item.contact && (
                  <a
                    href={`mailto:${item.contact}`} // simple contact fallback
                    className="flex-1 bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-6 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Contact Owner</span>
                  </a>
                )}
              </div>
            </div>

            {/* Placeholder / Form Container for found reports (to be completed in Step 15) */}
            {showReportForm && (
              <div id="report-form-container" className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs space-y-4 animate-slide-up">
                <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
                  <h3 className="text-lg font-bold text-primary font-display">Submit Found Report</h3>
                  <button
                    onClick={() => setShowReportForm(false)}
                    className="text-neutral-slate hover:text-primary text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Form fields placeholder (to be fully integrated with validation/actions in next step) */}
                <div className="p-6 border border-dashed border-neutral-mist rounded-xl text-center text-xs text-neutral-slate">
                  Found report details form will be fully active in the next step.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
