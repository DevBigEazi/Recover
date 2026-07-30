"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import HandoverVerificationCard from "@/components/VerifyPage/HandoverVerificationCard";
import FinderReportForm from "@/components/VerifyPage/FinderReportForm";
import ItemInfoCard, { SyncedItem } from "@/components/VerifyPage/ItemInfoCard";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VerifyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const [item, setItem] = useState<SyncedItem | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleEmailClick = (e: React.MouseEvent, targetEmail: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetEmail);
      setCopiedEmail(targetEmail);
      setTimeout(() => setCopiedEmail(null), 4000);
    }
  };

  const syncOnChainStatus = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        setItem(null);
        return;
      }
      const dbItem = await res.json();
      const localItem: SyncedItem = {
        registrationId: dbItem.registrationId,
        name: dbItem.name,
        brand: dbItem.brand || "",
        serial: dbItem.serial || "",
        reward: dbItem.reward || "",
        contact: dbItem.contactInfo || "",
        phone: dbItem.phone || "",
        whatsapp: dbItem.whatsapp || "",
        email: dbItem.email || "",
        instructions: dbItem.instructions || "",
        owner: dbItem.ownerAddress,
        status: dbItem.status,
        itemHash: dbItem.itemHash,
        registeredAt: new Date(dbItem.createdAt).getTime(),
        lastUpdated: new Date(dbItem.updatedAt).getTime(),
        showPublicContact: Boolean(dbItem.showPublicContact),
      };
      setItem(localItem);

      if (showLoader) {
        try {
          fetch("/api/verify/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: itemId }),
          });
        } catch (scanErr) {
          console.error("Failed to notify scan event:", scanErr);
        }
      }

      if (localItem.owner) {
        try {
          const profileRes = await fetch(`/api/profile?walletAddress=${localItem.owner}`, { cache: "no-store" });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setOwnerName(profileData.fullName);
          }
        } catch (err) {
          console.error("Failed to fetch owner display name:", err);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load item status.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    syncOnChainStatus(true);
    const interval = setInterval(() => {
      syncOnChainStatus(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [itemId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <span className="text-sm text-neutral-slate font-medium">Verifying item details...</span>
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
            <div className="p-3 bg-amber-50 rounded-full border border-amber-200 text-amber-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary font-display mb-2">QR Code De-registered</h2>
          <p className="text-sm text-neutral-slate mb-6 leading-relaxed">
            This QR code sticker was de-registered and permanently deleted from the Electroneum Blockchain registry by the owner (sold, gifted, or replaced). This sticker is no longer active.
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-light text-neutral-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <ItemInfoCard
          item={item}
          ownerName={ownerName}
          copiedEmail={copiedEmail}
          handleEmailClick={handleEmailClick}
          setShowReportForm={setShowReportForm}
        />

        {showReportForm && (
          <FinderReportForm
            itemId={itemId}
            itemName={item.name}
            setShowReportForm={setShowReportForm}
          />
        )}

        {item.status === "Lost" && <HandoverVerificationCard itemId={itemId} />}
      </div>
    </main>
  );
}
