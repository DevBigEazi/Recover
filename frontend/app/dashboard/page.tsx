"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { useActiveAccount } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import StickerStudioModal from "@/components/StickerStudioModal/StickerStudioModal";
import BatchStickerStudioModal from "@/components/BatchStickerStudioModal/BatchStickerStudioModal";
import DeleteItemModal from "@/components/DeleteItemModal/DeleteItemModal";

interface LocalItem {
  registrationId: string;
  ownerAddress: string;
  name: string;
  brand: string | null;
  serial: string | null;
  reward: string | null;
  contactInfo: string | null;
  instructions: string | null;
  itemHash: string;
  status: "Active" | "Lost" | "Recovered";
  category: string;
  alternateContact: string | null;
  receiptData: string | null;
  secrets: string | null;
  passphrase: string | null;
  image: string | null;
  rewardType: string;
  isActiveQr: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const account = useActiveAccount();
  const { openLogin } = useAuth();
  const { username } = useProfile();

  const [items, setItems] = useState<LocalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Lost" | "Recovered">("All");

  // Loading state per item ID during quick-actions
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirm state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "Lost" | "Recovered";
    name: string;
  } | null>(null);

  // Sticker studio states
  const [showStickerModal, setShowStickerModal] = useState<boolean>(false);
  const [showBatchStickerModal, setShowBatchStickerModal] = useState<boolean>(false);
  const [stickerItem, setStickerItem] = useState<LocalItem | null>(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteItemData, setDeleteItemData] = useState<{ registrationId: string; name: string } | null>(null);

  const fetchItems = async () => {
    if (!account) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setActionError(null);

    try {
      // Read item list from local DB — the backend keeps this in sync with the chain
      const response = await fetch(`/api/items?ownerAddress=${account.address}`);
      if (!response.ok) {
        throw new Error("Failed to load your items. Please try again.");
      }
      const dbItems: LocalItem[] = await response.json();
      setItems(dbItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load items.";
      console.error("Error fetching items:", err);
      setActionError(message);
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
      const response = await fetch("/api/items/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          registrationId,
          status: "Lost",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update item status.");
      }

      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update item status.";
      console.error("Failed to mark lost:", err);
      setActionError(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkRecovered = async (registrationId: string) => {
    if (!account) return;
    setActionLoadingId(registrationId);
    setActionError(null);

    try {
      const response = await fetch("/api/items/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          registrationId,
          status: "Recovered",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update item status.");
      }

      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update item status.";
      console.error("Failed to mark recovered:", err);
      setActionError(message);
    } finally {
      setActionLoadingId(null);
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
        {/* Invite-Only Alpha-Testing Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-amber-800 animate-fade-in shadow-xs">
          <span className="text-xl shrink-0 leading-none">⚠️</span>
          <div className="space-y-1 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Invite-Only Alpha-Testing</h4>
            <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
              Recover is currently in its invite-only alpha-testing phase. All item registrations, status toggles, and printing actions are for pre-launch testing purposes only.
            </p>
          </div>
        </div>

        {/* Upper Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary font-display">
              {username ? `Welcome back, ${username}!` : "Dashboard"}
            </h1>
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
            <h2 className="text-xl font-bold text-primary font-display mb-2">Sign In to Continue</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Sign in to access your dashboard and manage your registered items.
            </p>
            <div className="flex justify-center">
              <button
                onClick={openLogin}
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors shadow-xs cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <div className="space-y-6">
            {/* Multi-Item Printing Recommendation Banner */}
            {items.length > 0 && (
              <div className="bg-linear-to-r from-primary to-[#2F3E68] text-neutral-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="bg-accent text-neutral-white text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full tracking-wider">
                      💡 Printing Recommendation
                    </span>
                    <span className="text-xs text-neutral-white/80 font-medium">Sticker Press Best Practice</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-display">
                    Save Paper: Print Multi-Item Sticker Sheets (A4)
                  </h3>
                  <p className="text-xs text-neutral-white/80 leading-relaxed max-w-2xl">
                    Real-world sticker press paper works best when printing a full sheet! Register all your valuables (phone, laptop, keys, AirPods, backpack, etc) and print up to 10-12 stickers on a single A4 page.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto bg-neutral-white/15 hover:bg-neutral-white/25 text-neutral-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors text-center cursor-pointer border border-neutral-white/20 whitespace-nowrap"
                  >
                    + Add More Items
                  </Link>
                  <button
                    onClick={() => setShowBatchStickerModal(true)}
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-neutral-white text-xs font-bold rounded-xl px-5 py-2.5 transition-colors shadow-xs text-center cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>📄 Print Multi-Item Sheet (A4)</span>
                  </button>
                </div>
              </div>
            )}

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
                <span className="text-sm text-neutral-slate font-medium">Loading your items...</span>
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
                    ? "You haven't registered any items yet. Register your first item to secure it in our registry."
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
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === "Lost" ? "bg-warning animate-pulse" : "bg-accent"
                            }`}
                          />
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              item.status === "Lost" ? "text-warning" : "text-accent"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Item Info */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-primary font-display line-clamp-1">{item.name}</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-neutral-mist text-primary border border-neutral-mist/50 shrink-0 font-medium">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-slate font-medium">
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
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Update:</span>
                          <span className="font-medium text-primary">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="mt-6 pt-4 border-t border-neutral-mist grid grid-cols-2 gap-3">
                      {/* Quick Status Action Button */}
                      {item.status === "Lost" ? (
                        <button
                          onClick={() => {
                            setConfirmAction({
                              id: item.registrationId,
                              type: "Recovered",
                              name: item.name,
                            });
                            setShowConfirmModal(true);
                          }}
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
                          onClick={() => {
                            setConfirmAction({
                              id: item.registrationId,
                              type: "Lost",
                              name: item.name,
                            });
                            setShowConfirmModal(true);
                          }}
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

                      {/* Printable Sticker Button */}
                      <button
                        onClick={() => {
                          setStickerItem(item);
                          setShowStickerModal(true);
                        }}
                        disabled={actionLoadingId !== null}
                        className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold py-2 px-3 rounded-lg text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Print Sticker</span>
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

      {/* Status Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${
                confirmAction.type === "Lost" 
                  ? "bg-amber-500/10 text-warning" 
                  : "bg-accent/10 text-accent"
              }`}>
                {confirmAction.type === "Lost" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-primary font-display">
                  Confirm Status Change
                </h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Are you sure you want to change the state of <strong className="text-primary">"{confirmAction.name}"</strong> to <strong className={confirmAction.type === "Lost" ? "text-warning font-semibold" : "text-accent font-semibold"}>{confirmAction.type}</strong>?
                </p>
                <p className="text-[10px] text-neutral-slate leading-normal pt-1">
                  This will update the status of your item in our secure registry.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { id, type } = confirmAction;
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                  if (type === "Lost") {
                    await handleMarkLost(id);
                  } else {
                    await handleMarkRecovered(id);
                  }
                }}
                className={`text-neutral-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  confirmAction.type === "Lost" 
                    ? "bg-warning hover:bg-warning/90" 
                    : "bg-accent hover:bg-accent/90"
                }`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Sticker Studio Modal */}
      <StickerStudioModal
        isOpen={showStickerModal}
        onClose={() => {
          setShowStickerModal(false);
          setStickerItem(null);
        }}
        item={stickerItem}
      />

      {/* Batch Multi-Item A4 Sticker Studio Modal */}
      <BatchStickerStudioModal
        isOpen={showBatchStickerModal}
        onClose={() => setShowBatchStickerModal(false)}
        items={items}
      />

      {/* On-Chain Delete Item Critical Warning Modal */}
      <DeleteItemModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteItemData(null);
        }}
        item={deleteItemData}
        ownerAddress={account?.address || ""}
        onSuccess={() => {
          fetchItems();
        }}
      />
    </main>
  );
}
