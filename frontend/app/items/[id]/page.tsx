"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { client } from "@/lib/client";
import { electroneum } from "@/lib/chain";
import { recoverContract } from "@/lib/contract";
import { prepareContractCall, waitForReceipt } from "thirdweb";

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
  
  // Sticker creator modal states (Step 16)
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [isDownloadingLabel, setIsDownloadingLabel] = useState(false);

  // Mock report builder states (Dev Helper)
  const [mockMessage, setMockMessage] = useState("");
  const [mockContact, setMockContact] = useState("");
  const [mockLocation, setMockLocation] = useState("");
  const [showMockForm, setShowMockForm] = useState(false);

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
            createdAt: string;
          }

          // Map DB finder report schema to frontend interface
          const mappedReports: FinderReport[] = dbReports.map((r: DBReport) => ({
            reportId: r.reportId,
            itemId: r.registrationId,
            message: r.message,
            contactInfo: r.contactInfo || "",
            location: r.location || "",
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

      // Update SQLite Database
      await fetch("/api/items/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: item.registrationId,
          ownerAddress: item.owner,
          name: item.name,
          brand: item.brand,
          serial: item.serial,
          reward: item.reward,
          contactInfo: item.contact,
          instructions: item.instructions,
          itemHash: item.itemHash,
          status: "Lost",
        }),
      });

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

      // Update SQLite Database
      await fetch("/api/items/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: item.registrationId,
          ownerAddress: item.owner,
          name: item.name,
          brand: item.brand,
          serial: item.serial,
          reward: item.reward,
          contactInfo: item.contact,
          instructions: item.instructions,
          itemHash: item.itemHash,
          status: "Recovered",
        }),
      });

      await fetchItemAndReports();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update item status.";
      setError(msg);
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

  // Step 16: Canvas-based composite PNG Sticker Generator download
  const handleDownloadStickerLabel = async () => {
    if (!item) return;
    setIsDownloadingLabel(true);
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + item.registrationId
      )}`;

      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 550;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to resolve canvas 2d context.");

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer border (Indigo)
      ctx.strokeStyle = "#1E2A4A";
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

      // Inner border (Teal)
      ctx.strokeStyle = "#0EA394";
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

      // Header text "SCAN IF FOUND"
      ctx.fillStyle = "#1E2A4A";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SCAN IF FOUND", canvas.width / 2, 70);

      // Load QR Code Image
      const qrImg = new window.Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrUrl;
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
      });
      ctx.drawImage(qrImg, 50, 100, 300, 300);

      // Item ID
      ctx.fillStyle = "#6B7280";
      ctx.font = "bold 15px monospace";
      ctx.fillText(`ID: #${item.registrationId}`, canvas.width / 2, 430);

      // Reward Banner vs Default SECURED text
      if (item.reward) {
        ctx.fillStyle = "#F5A623";
        ctx.fillRect(40, 455, 320, 40);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`🎁 REWARD: ${item.reward.toUpperCase()}`, canvas.width / 2, 480);
      } else {
        ctx.fillStyle = "#1E2A4A";
        ctx.font = "14px sans-serif";
        ctx.fillText("Owner Identity Secured On-Chain", canvas.width / 2, 470);
      }

      // Footer
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("RECOVER PROTOCOL • ELECTRONEUM", canvas.width / 2, 515);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `recover-qr-sticker-${item.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Sticker generation failed, falling back to QR code:", err);
      await handleDownloadQR();
    } finally {
      setIsDownloadingLabel(false);
    }
  };

  // Step 16: Silent iframe-based Sticker Printing Dialog
  const handlePrintSticker = () => {
    if (!item) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + item.registrationId
    )}`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print QR Sticker</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: system-ui, sans-serif;
              }
              .sticker {
                width: 320px;
                height: 480px;
                border: 10px solid #1E2A4A;
                outline: 3px solid #0EA394;
                outline-offset: -12px;
                padding: 24px;
                box-sizing: border-box;
                text-align: center;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #1E2A4A;
                margin: 0 0 10px 0;
              }
              .qr {
                width: 240px;
                height: 240px;
              }
              .meta {
                font-size: 13px;
                font-family: monospace;
                color: #6B7280;
                font-weight: bold;
                margin: 5px 0;
              }
              .reward-tag {
                background: #F5A623;
                color: white;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 14px;
                width: 100%;
                box-sizing: border-box;
                border-radius: 4px;
                margin: 8px 0;
              }
              .info-sec {
                font-size: 12px;
                color: #1E2A4A;
                margin: 8px 0;
              }
              .footer {
                font-size: 10px;
                font-weight: bold;
                color: #9CA3AF;
                letter-spacing: 0.5px;
                margin-top: auto;
              }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div class="title">SCAN IF FOUND</div>
              <img class="qr" src="${qrUrl}" />
              <div class="meta">ID: #${item.registrationId}</div>
              \${
                item.reward
                  ? \`<div class="reward-tag">🎁 REWARD: \${item.reward.toUpperCase()}</div>\`
                  : \`<div class="info-sec">Identity Secured On-Chain</div>\`
              }
              <div class="footer">RECOVER PROTOCOL • ELECTRONEUM</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  // Mock Finder Report Submission (Dev Helper)
  const handleSubmitMockReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockMessage.trim()) return;

    try {
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: itemId,
          message: mockMessage.trim(),
          contactInfo: mockContact.trim(),
          location: mockLocation.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit mock report.");
      }

      setMockMessage("");
      setMockContact("");
      setMockLocation("");
      await fetchItemAndReports();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit mock report.");
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
                    onClick={() => setShowStickerModal(true)}
                    className="flex-1 bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>Sticker Studio</span>
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

            {/* Dev Helper Form */}
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

      {/* QR Sticker Generator Modal */}
      {showStickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-ink/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg relative space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
              <h3 className="text-lg font-bold text-primary font-display">Sticker Label Studio</h3>
              <button
                onClick={() => setShowStickerModal(false)}
                className="text-neutral-slate hover:text-primary text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Sticker Preview Wrapper */}
            <div className="flex justify-center py-2">
              <div
                id="sticker-print-area"
                className="w-[240px] h-[360px] border-8 border-primary outline-2 outline-accent outline-offset-[-9px] p-4 text-center bg-neutral-white flex flex-col justify-between items-center shadow-md select-none"
              >
                <div className="text-lg font-extrabold text-primary font-display tracking-wide uppercase mt-1">
                  SCAN IF FOUND
                </div>
                <div className="p-1 rounded-sm border border-neutral-mist bg-neutral-white">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(
                      window.location.origin + "/verify/" + item.registrationId
                    )}`}
                    alt="QR Sticker Code"
                    width={140}
                    height={140}
                    unoptimized
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold text-neutral-slate leading-none">
                    ID: #{item.registrationId}
                  </div>
                  {item.reward ? (
                    <div className="bg-warning text-neutral-white px-2 py-1 rounded-xs font-bold text-[10px] uppercase leading-none">
                      🎁 REWARD OFFERED
                    </div>
                  ) : (
                    <div className="text-[9px] text-primary leading-none font-medium">
                      Identity Secured On-Chain
                    </div>
                  )}
                </div>
                <div className="text-[7px] font-extrabold text-gray-400 tracking-wider mb-1 uppercase">
                  RECOVER PROTOCOL • ELECTRONEUM
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadStickerLabel}
                disabled={isDownloadingLabel}
                className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-semibold py-3 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDownloadingLabel ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Composing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download PNG</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrintSticker}
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
