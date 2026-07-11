"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { ConnectButton, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { client } from "@/lib/client";
import { electroneum } from "@/lib/chain";
import { recoverContract } from "@/lib/contract";
import { readContract, prepareContractCall, waitForReceipt } from "thirdweb";

interface LocalItem {
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

export default function DashboardPage() {
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [items, setItems] = useState<LocalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Lost" | "Recovered">("All");

  // Loading state per item ID during quick-actions
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!account) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setActionError(null);

    try {
      // 1. Read from localStorage
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);

      // 2. Filter items owned by current user
      const userItems: LocalItem[] = Object.values(storedItems).filter(
        (item: any) => item.owner.toLowerCase() === account.address.toLowerCase()
      ) as LocalItem[];

      // 3. Query on-chain status for each item in parallel
      const statusMap: ("Active" | "Lost" | "Recovered")[] = ["Active", "Lost", "Recovered"];
      const syncedItems = await Promise.all(
        userItems.map(async (item) => {
          try {
            // Read status and lastUpdated from contract
            const data = await readContract({
              contract: recoverContract,
              method:
                "function getItem(uint256 registrationId) view returns ((uint256 registrationId, address owner, uint8 status, uint40 registeredAt, uint40 lastUpdated, bytes32 itemHash) item)",
              params: [BigInt(item.registrationId)],
            });

            // Map on-chain enum status
            const onChainStatus = statusMap[data.status];
            const lastUpdatedTime = Number(data.lastUpdated) * 1000;

            // Sync localStorage if needed
            if (item.status !== onChainStatus || item.lastUpdated !== lastUpdatedTime) {
              item.status = onChainStatus;
              item.lastUpdated = lastUpdatedTime;
              storedItems[item.registrationId] = item;
            }

            return item;
          } catch (err) {
            console.error(`Failed to fetch on-chain status for ID ${item.registrationId}:`, err);
            return item; // Fallback to local data
          }
        })
      );

      // Save synced items back to localStorage
      localStorage.setItem("recover_items", JSON.stringify(storedItems));
      setItems(syncedItems.sort((a, b) => b.registeredAt - a.registeredAt));
    } catch (err) {
      console.error("Error fetching items:", err);
      setActionError("Failed to sync item list with Electroneum chain.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [account?.address]);

  const handleMarkLost = async (registrationId: string) => {
    if (!account) return;
    setActionLoadingId(registrationId);
    setActionError(null);

    try {
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function markLost(uint256 registrationId)",
        params: [BigInt(registrationId)],
      });

      const txResult = await sendTx(transaction);
      await waitForReceipt({
        client,
        chain: electroneum,
        transactionHash: txResult.transactionHash,
      });

      // Update localStorage local copy
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      if (storedItems[registrationId]) {
        storedItems[registrationId].status = "Lost";
        storedItems[registrationId].lastUpdated = Date.now();
        localStorage.setItem("recover_items", JSON.stringify(storedItems));
      }

      await fetchItems();
    } catch (err: any) {
      console.error("Failed to mark lost:", err);
      setActionError(err?.message || "Failed to execute markLost on-chain.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkRecovered = async (registrationId: string) => {
    if (!account) return;
    setActionLoadingId(registrationId);
    setActionError(null);

    try {
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function markRecovered(uint256 registrationId)",
        params: [BigInt(registrationId)],
      });

      const txResult = await sendTx(transaction);
      await waitForReceipt({
        client,
        chain: electroneum,
        transactionHash: txResult.transactionHash,
      });

      // Update localStorage local copy
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      if (storedItems[registrationId]) {
        storedItems[registrationId].status = "Recovered";
        storedItems[registrationId].lastUpdated = Date.now();
        localStorage.setItem("recover_items", JSON.stringify(storedItems));
      }

      await fetchItems();
    } catch (err: any) {
      console.error("Failed to mark recovered:", err);
      setActionError(err?.message || "Failed to execute markRecovered on-chain.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadQR = async (registrationId: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + registrationId
    )}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recover-qr-item-${registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      window.open(qrUrl, "_blank");
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "All") return true;
    return item.status === activeTab;
  });

  return (
    <main className="min-h-screen bg-neutral-mist pb-12">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Upper Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary font-display">Dashboard</h1>
            <p className="text-sm text-neutral-slate mt-1">
              Manage your registered items, track their status, and generate stickers.
            </p>
          </div>
          {account && (
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-neutral-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
            >
              + Register New Item
            </Link>
          )}
        </div>

        {/* Global Error Banner */}
        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 max-w-3xl">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{actionError}</span>
          </div>
        )}

        {/* Not Connected Block */}
        {!account ? (
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-12 text-center max-w-md mx-auto mt-12">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary font-display mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Please connect your Electroneum wallet to access your dashboard and manage your items.
            </p>
            <div className="flex justify-center">
              <ConnectButton client={client} chain={electroneum} />
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex border-b border-neutral-mist pb-px overflow-x-auto gap-6 scrollbar-none">
              {(["All", "Active", "Lost", "Recovered"] as const).map((tab) => {
                const count = tab === "All" 
                  ? items.length 
                  : items.filter((i) => i.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-sm font-semibold transition-colors shrink-0 border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-neutral-slate hover:text-primary hover:border-neutral-slate"
                    }`}
                  >
                    <span>{tab}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                      activeTab === tab 
                        ? "bg-primary text-neutral-white" 
                        : "bg-neutral-mist text-neutral-slate"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List Loader */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-neutral-slate font-medium">Syncing with Electroneum chain...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              /* Empty State */
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-16 text-center shadow-xs">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                    <svg className="w-8 h-8 text-neutral-slate" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-primary font-display mb-1">No items found</h3>
                <p className="text-sm text-neutral-slate max-w-sm mx-auto mb-6">
                  {activeTab === "All"
                    ? "You haven't registered any items yet. Register your first item to secure it on-chain."
                    : `You have no items currently in "${activeTab}" status.`}
                </p>
                {activeTab === "All" && (
                  <Link
                    href="/register"
                    className="inline-flex bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
                  >
                    Register Your First Item
                  </Link>
                )}
              </div>
            ) : (
              /* Grid Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.registrationId}
                    className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
                  >
                    <div>
                      {/* Item header (ID & Status badge) */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-medium text-neutral-slate">
                          ID: #{item.registrationId}
                        </span>
                        
                        {/* Status tag */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === "Lost" ? "bg-warning animate-pulse" : "bg-accent"
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              item.status === "Lost" ? "text-warning" : "text-accent"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Item Info */}
                      <h3 className="text-lg font-bold text-primary font-display line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-neutral-slate font-medium mt-0.5">
                        {item.brand || "Unknown Brand"} {item.serial && `• Serial: ${item.serial}`}
                      </p>
                      
                      {item.reward && item.status === "Lost" && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold text-warning">
                          <span>🎁 Reward: {item.reward}</span>
                        </div>
                      )}

                      <div className="mt-4 border-t border-neutral-mist pt-4 space-y-1.5 text-xs text-neutral-slate">
                        <div className="flex justify-between">
                          <span>Registered:</span>
                          <span className="font-medium text-primary">
                            {new Date(item.registeredAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Update:</span>
                          <span className="font-medium text-primary">
                            {new Date(item.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="mt-6 pt-4 border-t border-neutral-mist grid grid-cols-2 gap-3">
                      {/* Quick Status Action Button */}
                      {item.status === "Lost" ? (
                        <button
                          onClick={() => handleMarkRecovered(item.registrationId)}
                          disabled={actionLoadingId !== null}
                          className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 col-span-2"
                        >
                          {actionLoadingId === item.registrationId ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <span>✅ Mark Recovered</span>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkLost(item.registrationId)}
                          disabled={actionLoadingId !== null}
                          className="bg-warning hover:bg-warning/90 disabled:opacity-50 text-neutral-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 col-span-2"
                        >
                          {actionLoadingId === item.registrationId ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <span>⚠️ Report Lost</span>
                          )}
                        </button>
                      )}

                      {/* Download QR Button */}
                      <button
                        onClick={() => handleDownloadQR(item.registrationId)}
                        disabled={actionLoadingId !== null}
                        className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold py-2 px-3 rounded-lg text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>QR Code</span>
                      </button>

                      {/* Details Page Link */}
                      <Link
                        href={`/items/${item.registrationId}`}
                        className="bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors duration-200 flex items-center justify-center"
                      >
                        <span>Details →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
