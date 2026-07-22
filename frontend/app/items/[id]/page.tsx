"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { useActiveAccount } from "thirdweb/react";
import StickerStudioModal from "@/components/StickerStudioModal/StickerStudioModal";
import DeleteItemModal from "@/components/DeleteItemModal/DeleteItemModal";

interface LocalItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  instructions: string;
  owner: string;
  ownerName?: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
  category?: string;
  alternateContact?: string;
  receiptData?: string;
  secrets?: string;
  passphrase?: string;
  rewardType?: string;
  image?: string;
}

interface FinderReport {
  reportId: string;
  itemId: string;
  message: string;
  contactInfo: string;
  location: string;
  locationContext?: string | null;
  timestamp: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const account = useActiveAccount();
  const router = useRouter();

  // Item & Reports states
  const [item, setItem] = useState<LocalItem | null>(null);
  const [reports, setReports] = useState<FinderReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action States
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Confirm state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState<"Lost" | "Recovered" | null>(null);
  
  // Sticker creator modal states
  const [showStickerModal, setShowStickerModal] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);



  const fetchItemAndReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch item details from SQLite Database API
      const headers: Record<string, string> = {};
      if (account) {
        headers["x-owner-address"] = account.address;
      }
      
      const response = await fetch(`/api/items/${itemId}`, { headers });
      if (!response.ok) {
        if (response.status === 404) {
          setItem(null);
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to load item details from database.");
      }
      
      const dbItem = await response.json();
      
      // Map database schema to frontend local interface
      const localItem: LocalItem = {
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
      };

      setItem(localItem);

      // 3. Fetch finder reports (if requester is the verified owner)
      if (account && account.address.toLowerCase() === localItem.owner.toLowerCase()) {
        const repResponse = await fetch(`/api/reports/item/${itemId}`, {
          headers: { "x-owner-address": account.address },
        });
        if (repResponse.ok) {
          const dbReports = await repResponse.json();
          
          interface DBReport {
            reportId: string;
            registrationId: string;
            message: string;
            contactInfo?: string | null;
            location?: string | null;
            locationContext?: string | null;
            createdAt: string;
          }

          // Map DB finder report schema to frontend interface
          const mappedReports: FinderReport[] = dbReports.map((r: DBReport) => ({
            reportId: r.reportId,
            itemId: r.registrationId,
            message: r.message,
            contactInfo: r.contactInfo || "",
            location: r.location || "",
            locationContext: r.locationContext || null,
            timestamp: new Date(r.createdAt).getTime(),
          }));
          setReports(mappedReports);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading the item details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemAndReports();
  }, [itemId, account?.address]);

  const handleMarkLost = async () => {
    if (!item || !account) return;
    setIsActionLoading(true);
    setError(null);

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

      await fetchItemAndReports();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update item status.";
      setError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkRecovered = async () => {
    if (!item || !account) return;
    setIsActionLoading(true);
    setError(null);

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

      await fetchItemAndReports();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update item status.";
      setError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
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
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm font-medium text-neutral-slate hover:text-primary flex items-center gap-1">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 max-w-4xl">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Item Details & Access Control Actions (span 2 on lg) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Info Card */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-medium text-neutral-slate">
                  ID: #{item.registrationId}
                </span>
                
                {/* Status badge */}
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

              {/* Recovery description */}
              {item.instructions && (
                <div className="mt-6 border-t border-neutral-mist pt-6">
                  <h4 className="text-sm font-semibold text-primary mb-2">Recovery Instructions</h4>
                  <p className="text-sm text-neutral-slate leading-relaxed bg-neutral-mist/35 p-4 rounded-xl">
                    {item.instructions}
                  </p>
                </div>
              )}

              {/* Timeline details */}
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

            {/* Private Verification & Security Details (Only for logged-in owner) */}
            {isOwner && (
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                    🔒 Private Security & Handover Verification
                  </h3>
                  <p className="text-xs text-neutral-slate mt-1">
                    These details are stored privately off-chain and are only visible to you. You will use these details physically in-person to verify ownership during recovery.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-neutral-slate">
                  {/* PIN/Passphrase */}
                  <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1">
                    <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
                      Handover Verification PIN
                    </span>
                    <span className="block text-lg font-mono font-bold text-accent">
                      {item.passphrase || "Not Set"}
                    </span>
                    <span className="block text-[10px] text-neutral-slate leading-normal pt-1">
                      Ask the finder to verify this PIN code when they meet you to hand over the item.
                    </span>
                  </div>

                  {/* Alternate Contact */}
                  <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1">
                    <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
                      Trusted Alternate Contact
                    </span>
                    <span className="block text-sm font-semibold text-primary">
                      {item.alternateContact || "None Configured"}
                    </span>
                    <span className="block text-[10px] text-neutral-slate leading-normal pt-1">
                      Caretaker or Next of Kin contact details used to notify you if your phone is lost.
                    </span>
                  </div>

                  {/* Secrets */}
                  <div className="bg-neutral-mist/35 border border-neutral-mist p-4 rounded-xl space-y-1 md:col-span-2">
                    <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
                      Private Distinguishing Marks & Secrets
                    </span>
                    <p className="text-sm text-primary font-sans leading-relaxed">
                      {item.secrets || "No private distinguishing marks or IMEI registered."}
                    </p>
                  </div>

                  {/* Item Image Preview */}
                  {item.image && (
                    <div className="md:col-span-1 space-y-2 border border-neutral-mist p-4 rounded-xl bg-neutral-mist/20">
                      <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
                        Registered Item Image
                      </span>
                      <div className="relative h-40 w-full rounded-lg overflow-hidden border border-neutral-mist bg-neutral-white">
                        <img
                          src={item.image}
                          alt="Registered item photo"
                          className="object-contain w-full h-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Receipt Preview */}
                  {item.receiptData && (
                    <div className="md:col-span-1 space-y-2 border border-neutral-mist p-4 rounded-xl bg-neutral-mist/20">
                      <span className="block font-bold text-primary uppercase tracking-wider text-[10px]">
                        Item Purchase Receipt
                      </span>
                      <div className="relative h-40 w-full rounded-lg overflow-hidden border border-neutral-mist bg-neutral-white">
                        <img
                          src={item.receiptData}
                          alt="Item purchase receipt"
                          className="object-contain w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner State Control Card (only if logged in owner) */}
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
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
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
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <span>⚠️ Report Item Lost</span>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowStickerModal(true)}
                    className="flex-1 bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Sticker Studio</span>
                  </button>
                </div>

                {/* On-Chain Delete Item Button */}
                <div className="pt-2 border-t border-neutral-mist">
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
                  <strong>Access Denied:</strong> Only the wallet address that registered this item is authorized to perform status changes or access download files.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: QR Code sticker & Finder Reports Inbox */}
          <div className="space-y-6">
            {/* Finder Messages Inbox (Only for owner) */}
            {isOwner && (
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-md font-bold text-primary font-display flex items-center justify-between">
                  <span>Finder Messages</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-mist text-neutral-slate">
                    {reports.length}
                  </span>
                </h3>

                {reports.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-neutral-mist rounded-xl">
                    <svg className="w-6 h-6 text-neutral-slate mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                    <p className="text-xs text-neutral-slate font-medium">Inbox is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Safety Meetup Recommendation Banner */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-1.5 text-warning font-bold text-xs">
                        <span className="text-base">💡</span>
                        <span>Safety Meetup Recommendations:</span>
                      </div>
                      <p className="text-neutral-slate leading-relaxed text-[11px]">
                        When coordinating item pickups with finders, always prioritize your safety. Arrange meetups in well-lit, busy public areas such as coffee shops, shopping centers, or near transit entrances. Bringing a friend or meeting during daylight hours is highly recommended.
                      </p>
                    </div>

                    <div className="space-y-4 max-h-75 overflow-y-auto pr-1">
                    {reports.map((report) => (
                      <div key={report.reportId} className="bg-neutral-mist/40 border border-neutral-mist rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-neutral-slate border-b border-neutral-mist pb-1.5">
                          <span className="font-medium">Report #{report.reportId.substring(0, 8)}</span>
                          <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-primary leading-relaxed font-sans">{report.message}</p>
                        
                        {report.contactInfo && (
                          <div className="bg-neutral-white border border-neutral-mist p-2 rounded-lg mt-2">
                            <span className="font-semibold text-primary block">Finder Contact:</span>
                            <span className="text-neutral-slate">{report.contactInfo}</span>
                          </div>
                        )}
                        
                        {report.location && (
                          <div className="mt-2 text-left">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location.replace(/Lat:\s*|Lng:\s*/gi, "").trim())}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-medium text-[11px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>📍 Open Location on Google Maps ({report.location}) ↗</span>
                            </a>
                            {report.locationContext && (
                              <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-2.5 mt-1.5 text-[10px] text-amber-800 leading-normal flex items-start gap-1.5 text-left">
                                <span className="shrink-0 text-xs mt-0.5">💡</span>
                                <div>
                                  <strong className="font-semibold text-amber-900 block mb-0.5">AI Location Insight</strong>
                                  {report.locationContext}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Sticker Studio Modal */}
      <StickerStudioModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        item={item}
      />

      {/* Status Confirmation Modal */}
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

      {/* On-Chain Delete Item Critical Warning Modal */}
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
