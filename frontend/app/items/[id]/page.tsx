"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import StickerStudioModal from "@/components/StickerStudioModal/StickerStudioModal";
import BatchStickerStudioModal from "@/components/BatchStickerStudioModal/BatchStickerStudioModal";
import DeleteItemModal from "@/components/DeleteItemModal/DeleteItemModal";
import EditItemModal from "@/components/EditItemModal/EditItemModal";
import ItemSecretsSection, { LocalItem } from "@/components/ItemDetailPage/ItemSecretsSection";
import ItemReportsInbox, { FinderReport } from "@/components/ItemDetailPage/ItemReportsInbox";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const { account, isAuthLoading } = useAuthReady();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Item & reports state
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dynamic user currency info with live FX rates
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    const runDetect = async () => {
      const info = await detectUserCurrency();
      setUserCurrency(info);
    };
    runDetect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    const unlocked = urlParams.get("unlocked");

    if (sessionId || unlocked) {
      const verifyUnlock = async () => {
        try {
          if (sessionId) {
            toast.loading("Verifying report payment...");
            const res = await fetch("/api/reports/unlock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            toast.dismiss();
            if (res.ok) {
              toast.success("Finder Details Unlocked!");
            }
          }
          queryClient.invalidateQueries({ queryKey: ["reports", itemId] });
          queryClient.invalidateQueries({ queryKey: ["item", itemId] });
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (err) {
          toast.dismiss();
          console.error("Failed to unlock report from return session:", err);
        }
      };
      verifyUnlock();
    }
  }, [itemId, queryClient]);

  // Confirm status-change modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState<"Lost" | "Recovered" | null>(null);

  // Sticker studio states
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showBatchStickerModal, setShowBatchStickerModal] = useState(false);
  const [allItems, setAllItems] = useState<{ registrationId: string; name: string; reward?: string | null; category?: string | null }[]>([]);
  const [isFetchingAllItems, setIsFetchingAllItems] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit item modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Opens batch sticker modal with all owner items fetched on demand.
  // Uses the shared 'items' query cache if already populated.
  const handleOpenBatchSticker = async () => {
    if (!account) return;
    setIsFetchingAllItems(true);
    try {
      const res = await fetch(`/api/items?ownerAddress=${account.address}`);
      if (res.ok) {
        const data = await res.json();
        setAllItems(
          (data as { registrationId: string; name: string; reward?: string | null; category?: string | null }[]).map((i) => ({
            registrationId: i.registrationId,
            name: i.name,
            reward: i.reward ?? null,
            category: i.category ?? null,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to fetch all items for batch sticker:", e);
      if (item) {
        setAllItems([{ registrationId: item.registrationId, name: item.name, reward: item.reward, category: item.category }]);
      }
    } finally {
      setIsFetchingAllItems(false);
      setShowBatchStickerModal(true);
    }
  };



  // --- Item query (cached — instant on re-navigation) ---
  const {
    data: item = null,
    isLoading: isItemLoading,
    error: itemError,
  } = useQuery<LocalItem | null>({
    queryKey: ["item", itemId, account?.address],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (account) headers["x-owner-address"] = account.address;
      const response = await fetch(`/api/items/${itemId}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to load item details from database.");
      const dbItem = await response.json();
      return {
        registrationId: dbItem.registrationId,
        name: dbItem.name,
        brand: dbItem.brand || "",
        serial: dbItem.serial || "",
        reward: dbItem.reward || "",
        contact: dbItem.contactInfo || "",
        instructions: dbItem.instructions || "",
        owner: dbItem.ownerAddress,
        ownerName: dbItem.ownerName,
        status: dbItem.status,
        itemHash: dbItem.itemHash,
        registeredAt: new Date(dbItem.createdAt).getTime(),
        lastUpdated: new Date(dbItem.updatedAt).getTime(),
        category: dbItem.category || "Other",
        alternateContact: dbItem.alternateContact || "",
        receiptData: dbItem.receiptData || "",
        secrets: dbItem.secrets || "",
        passphrase: dbItem.passphrase || "",
        rewardType: dbItem.rewardType || "custom",
        image: dbItem.image || "",
        showPublicContact: Boolean(dbItem.showPublicContact),
        phone: dbItem.phone || "",
        whatsapp: dbItem.whatsapp || "",
        email: dbItem.email || "",
        publicContactMethod: dbItem.publicContactMethod || "phone",
        unlockedForCurrentLostCycle: Boolean(dbItem.unlockedForCurrentLostCycle),
      } satisfies LocalItem;
    },
    staleTime: 30_000,
  });

  const isOwnerCheck = !!account && !!item && account.address.toLowerCase() === item.owner.toLowerCase();

  // --- Reports query (only fetched for item owners) ---
  const { data: reports = [] } = useQuery<FinderReport[]>({
    queryKey: ["reports", itemId, account?.address],
    queryFn: async () => {
      interface DBReport {
        reportId: string;
        registrationId: string;
        message: string;
        contactInfo?: string | null;
        location?: string | null;
        locationContext?: string | null;
        unlocked?: boolean;
        deliveryMethod?: "meetup" | "courier";
        courierDetails?: string | null;
        createdAt: string;
      }
      const repResponse = await fetch(`/api/reports/item/${itemId}`, {
        headers: { "x-owner-address": account!.address },
      });
      if (!repResponse.ok) return [];
      const dbReports: DBReport[] = await repResponse.json();
      return dbReports.map((r) => ({
        reportId: r.reportId,
        itemId: r.registrationId,
        message: r.message,
        contactInfo: r.contactInfo || "",
        location: r.location || "",
        locationContext: r.locationContext || null,
        unlocked: Boolean(r.unlocked),
        deliveryMethod: r.deliveryMethod || "meetup",
        courierDetails: r.courierDetails || null,
        timestamp: new Date(r.createdAt).getTime(),
      }));
    },
    enabled: !!account && isOwnerCheck,
    staleTime: 30_000,
  });

  const isLoading = isItemLoading || isAuthLoading;
  const error = itemError instanceof Error ? itemError.message : actionError;

  const handleMarkLost = async () => {
    if (!item || !account) return;
    setIsActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch("/api/items/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          registrationId: item.registrationId,
          status: "Lost",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update item status.");
      }

      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      queryClient.invalidateQueries({ queryKey: ["reports", itemId] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update item status.";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkRecovered = async () => {
    if (!item || !account) return;
    setIsActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch("/api/items/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          registrationId: item.registrationId,
          status: "Recovered",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update item status.");
      }

      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      queryClient.invalidateQueries({ queryKey: ["reports", itemId] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update item status.";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <span className="text-sm text-neutral-slate font-medium">Loading item details...</span>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-primary font-display mb-2">Item Not Found</h2>
          <p className="text-sm text-neutral-slate mb-6">
            The item you are looking for does not exist in your registration registry.
          </p>
          <Link href="/dashboard" className="bg-primary hover:bg-primary-light text-neutral-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = account?.address.toLowerCase() === item.owner.toLowerCase();

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm font-medium text-neutral-slate hover:text-primary flex items-center gap-1">
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 max-w-4xl">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-medium text-neutral-slate">
                  ID: #{item.registrationId}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.status === "Lost" ? "bg-warning animate-pulse" : "bg-accent"}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${item.status === "Lost" ? "text-warning" : "text-accent"}`}>
                    {item.status}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-primary font-display mb-1">{item.name}</h2>
              <p className="text-sm text-neutral-slate">
                {item.brand && `Brand: ${item.brand}`} {item.serial && `• Serial: ${item.serial}`}
              </p>

              {item.instructions && (
                <div className="mt-6 border-t border-neutral-mist pt-6">
                  <h4 className="text-sm font-semibold text-primary mb-2">Recovery Instructions</h4>
                  <p className="text-sm text-neutral-slate leading-relaxed bg-neutral-mist/35 p-4 rounded-xl">
                    {item.instructions}
                  </p>
                </div>
              )}

              <div className="mt-6 border-t border-neutral-mist pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-slate">
                <div>
                  <span className="block text-neutral-slate font-medium">On-chain Owner:</span>
                  <span className="block text-primary font-medium mt-0.5">{item.ownerName || "Secured Owner"}</span>
                </div>
                <div>
                  <span className="block text-neutral-slate font-medium">On-chain Hash (Metadata):</span>
                  <span className="block text-primary font-mono mt-0.5 break-all">{item.itemHash}</span>
                </div>
                <div>
                  <span className="block text-neutral-slate font-medium">Registration Date:</span>
                  <span className="block text-primary font-medium mt-0.5">
                    {new Date(item.registeredAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-neutral-slate font-medium">Last Status Change:</span>
                  <span className="block text-primary font-medium mt-0.5">
                    {new Date(item.lastUpdated).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <ItemSecretsSection item={item} isOwner={isOwner} />

            {isOwner ? (
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-primary font-display">Manage Item Status</h3>
                  <p className="text-xs text-neutral-slate mt-1">
                    Toggle your item status on the Electroneum blockchain. All data is permanently archived.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {item.status === "Lost" ? (
                    <button
                      onClick={() => {
                        setConfirmType("Recovered");
                        setShowConfirmModal(true);
                      }}
                      disabled={isActionLoading}
                      className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isActionLoading ? (
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <span>✅ Mark as Recovered</span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmType("Lost");
                        setShowConfirmModal(true);
                      }}
                      disabled={isActionLoading}
                      className="flex-1 bg-warning hover:bg-warning/90 disabled:opacity-50 text-neutral-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isActionLoading ? (
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <span>⚠️ Report Item Lost</span>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={handleOpenBatchSticker}
                    disabled={isFetchingAllItems}
                    className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-70 text-neutral-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isFetchingAllItems ? (
                      <Loader2 className="animate-spin h-4 w-4 text-white" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Sticker Studio</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-mist grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowEditModal(true)}
                    disabled={isActionLoading}
                    className="w-full bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-neutral-mist font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>✏️ Edit Item Details</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isActionLoading}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Item</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-sm flex gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p>
                  <strong>Access Denied:</strong> Only the owner of this item is authorized to perform status changes or access download files.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <ItemReportsInbox
              item={item}
              reports={reports}
              userCurrency={userCurrency}
              isOwner={isOwner}
              onRefresh={async () => {
                await queryClient.invalidateQueries({ queryKey: ["item", itemId] });
                await queryClient.invalidateQueries({ queryKey: ["reports", itemId] });
              }}
            />
          </div>
        </div>
      </div>

      <StickerStudioModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        item={item}
      />

      <BatchStickerStudioModal
        isOpen={showBatchStickerModal}
        onClose={() => setShowBatchStickerModal(false)}
        items={allItems.length > 0 ? allItems : item ? [{ registrationId: item.registrationId, name: item.name, reward: item.reward, category: item.category }] : []}
        defaultSelectedIds={item ? [item.registrationId] : []}
      />

      {showConfirmModal && confirmType && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${
                confirmType === "Lost" 
                  ? "bg-amber-500/10 text-warning" 
                  : "bg-accent/10 text-accent"
              }`}>
                {confirmType === "Lost" ? (
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
                  Are you sure you want to change the state of <strong className="text-primary">"{item.name}"</strong> to <strong className={confirmType === "Lost" ? "text-warning font-semibold" : "text-accent font-semibold"}>{confirmType}</strong>?
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
                  setConfirmType(null);
                }}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  setConfirmType(null);
                  if (confirmType === "Lost") {
                    await handleMarkLost();
                  } else {
                    await handleMarkRecovered();
                  }
                }}
                className={`text-neutral-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  confirmType === "Lost" 
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

      {item && account && (
        <EditItemModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          item={item}
          ownerAddress={account.address}
          onItemUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["item", itemId] });
          }}
        />
      )}

      <DeleteItemModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        item={item ? { registrationId: item.registrationId, name: item.name } : null}
        ownerAddress={account?.address || ""}
        onSuccess={() => {
          router.push("/dashboard");
        }}
      />
    </main>
  );
}
