"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
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

interface FinderReport {
  reportId: string;
  itemId: string;
  message: string;
  contactInfo: string;
  location: string;
  timestamp: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  // Item & Reports states
  const [item, setItem] = useState<LocalItem | null>(null);
  const [reports, setReports] = useState<FinderReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action States
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Mock report builder states (Dev Helper)
  const [mockMessage, setMockMessage] = useState("");
  const [mockContact, setMockContact] = useState("");
  const [mockLocation, setMockLocation] = useState("");
  const [showMockForm, setShowMockForm] = useState(false);

  const fetchItemAndReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch item from local storage
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      const localItem = storedItems[itemId] as LocalItem | undefined;

      if (!localItem) {
        setItem(null);
        setIsLoading(false);
        return;
      }

      // 2. Fetch live on-chain status
      const statusMap: ("Active" | "Lost" | "Recovered")[] = ["Active", "Lost", "Recovered"];
      try {
        const data = await readContract({
          contract: recoverContract,
          method:
            "function getItem(uint256 registrationId) view returns ((uint256 registrationId, address owner, uint8 status, uint40 registeredAt, uint40 lastUpdated, bytes32 itemHash) item)",
          params: [BigInt(itemId)],
        });

        const onChainStatus = statusMap[data.status];
        const lastUpdatedTime = Number(data.lastUpdated) * 1000;

        if (localItem.status !== onChainStatus || localItem.lastUpdated !== lastUpdatedTime) {
          localItem.status = onChainStatus;
          localItem.lastUpdated = lastUpdatedTime;
          storedItems[itemId] = localItem;
          localStorage.setItem("recover_items", JSON.stringify(storedItems));
        }
      } catch (err) {
        console.error("Failed to query on-chain status, falling back to cached state:", err);
      }

      setItem(localItem);

      // 3. Fetch finder reports
      const storedReportsStr = localStorage.getItem("recover_finder_reports") || "[]";
      const storedReports: FinderReport[] = JSON.parse(storedReportsStr);
      const itemReports = storedReports
        .filter((r) => r.itemId === itemId)
        .sort((a, b) => b.timestamp - a.timestamp);

      setReports(itemReports);
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
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function markLost(uint256 registrationId)",
        params: [BigInt(item.registrationId)],
      });

      const txResult = await sendTx(transaction);
      await waitForReceipt({
        client,
        chain: electroneum,
        transactionHash: txResult.transactionHash,
      });

      // Update local storage status
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      if (storedItems[itemId]) {
        storedItems[itemId].status = "Lost";
        storedItems[itemId].lastUpdated = Date.now();
        localStorage.setItem("recover_items", JSON.stringify(storedItems));
      }

      await fetchItemAndReports();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update item status on Electroneum chain.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkRecovered = async () => {
    if (!item || !account) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function markRecovered(uint256 registrationId)",
        params: [BigInt(item.registrationId)],
      });

      const txResult = await sendTx(transaction);
      await waitForReceipt({
        client,
        chain: electroneum,
        transactionHash: txResult.transactionHash,
      });

      // Update local storage status
      const storedItemsStr = localStorage.getItem("recover_items") || "{}";
      const storedItems = JSON.parse(storedItemsStr);
      if (storedItems[itemId]) {
        storedItems[itemId].status = "Recovered";
        storedItems[itemId].lastUpdated = Date.now();
        localStorage.setItem("recover_items", JSON.stringify(storedItems));
      }

      await fetchItemAndReports();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update item status on Electroneum chain.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!item) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + item.registrationId
    )}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recover-qr-item-${item.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      window.open(qrUrl, "_blank");
    }
  };

  // Mock Finder Report Submission (Dev Helper)
  const handleSubmitMockReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockMessage.trim()) return;

    const newReport: FinderReport = {
      reportId: Math.random().toString(36).substr(2, 9),
      itemId: itemId,
      message: mockMessage.trim(),
      contactInfo: mockContact.trim(),
      location: mockLocation.trim(),
      timestamp: Date.now(),
    };

    const storedReportsStr = localStorage.getItem("recover_finder_reports") || "[]";
    const storedReports = JSON.parse(storedReportsStr);
    storedReports.push(newReport);
    localStorage.setItem("recover_finder_reports", JSON.stringify(storedReports));

    setMockMessage("");
    setMockContact("");
    setMockLocation("");
    fetchItemAndReports();
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
                  <span className="block text-primary font-mono mt-0.5 break-all">{item.owner}</span>
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

            {/* Owner State Control Card (only if logged in owner) */}
            {isOwner ? (
              <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-primary font-display">Manage Item Status</h3>
                  <p className="text-xs text-neutral-slate mt-1">
                    Toggle your item status on the Electroneum blockchain. Transition history is permanently archived.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {item.status === "Lost" ? (
                    <button
                      onClick={handleMarkRecovered}
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
                      onClick={handleMarkLost}
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
                    onClick={handleDownloadQR}
                    className="flex-1 bg-neutral-white border border-gray-300 hover:bg-neutral-mist text-primary font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download QR Sticker</span>
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
            
            {/* QR Card */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 shadow-xs flex flex-col items-center">
              <h3 className="text-md font-bold text-primary font-display mb-4">Printable Sticker</h3>
              <div className="bg-neutral-white p-3 rounded-xl border border-neutral-mist">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(
                    window.location.origin + "/verify/" + item.registrationId
                  )}`}
                  alt="QR Sticker"
                  width={180}
                  height={180}
                  unoptimized
                />
              </div>
              <p className="text-[11px] text-center text-neutral-slate mt-4 leading-relaxed font-sans max-w-[210px]">
                Attach this QR code to your physical item. Scanners will be redirected to the secure verification page.
              </p>
            </div>

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
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {reports.map((report) => (
                      <div key={report.reportId} className="bg-neutral-mist/40 border border-neutral-mist rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-neutral-slate border-b border-neutral-mist pb-1.5">
                          <span className="font-medium">Report #{report.reportId}</span>
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
                          <div className="text-[10px] text-neutral-slate flex items-center gap-1 mt-1">
                            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Location shared: {report.location}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOCK REPORT FORM (Developer Helper tool for Testing) */}
        {isOwner && (
          <div className="mt-12 bg-neutral-white border border-neutral-mist rounded-2xl p-6 max-w-lg mx-auto shadow-xs">
            <button
              onClick={() => setShowMockForm(!showMockForm)}
              className="w-full text-left text-xs font-semibold text-neutral-slate hover:text-primary flex items-center justify-between focus:outline-hidden"
            >
              <span>🛠️ Dev Helper: Submit Mock Finder Report</span>
              <span>{showMockForm ? "▲ Collapse" : "▼ Expand"}</span>
            </button>

            {showMockForm && (
              <form onSubmit={handleSubmitMockReport} className="mt-4 space-y-4 border-t border-neutral-mist pt-4">
                <p className="text-[10px] text-neutral-slate">
                  Simulate what a finder submits when scanning this item. This helper inserts mock reports into your local storage database for testing.
                </p>
                <div>
                  <label htmlFor="mockMsg" className="block text-[11px] font-semibold text-primary">Finder Message</label>
                  <textarea
                    id="mockMsg"
                    rows={2}
                    value={mockMessage}
                    onChange={(e) => setMockMessage(e.target.value)}
                    placeholder="e.g. Found your keys outside library"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/20"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="mockContact" className="block text-[11px] font-semibold text-primary">Finder Contact Info (Optional)</label>
                  <input
                    type="text"
                    id="mockContact"
                    value={mockContact}
                    onChange={(e) => setMockContact(e.target.value)}
                    placeholder="e.g. finder@email.com or 555-0199"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/20"
                  />
                </div>
                <div>
                  <label htmlFor="mockLocation" className="block text-[11px] font-semibold text-primary">Finder Location Shared (Optional)</label>
                  <input
                    type="text"
                    id="mockLocation"
                    value={mockLocation}
                    onChange={(e) => setMockLocation(e.target.value)}
                    placeholder="e.g. lat: 51.5074, lng: -0.1278"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/20"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Submit Mock Report
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
