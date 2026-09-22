"use client";

import React, { use, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  ArrowRight,
  AlertCircle,
  Loader2,
  FileImage,
} from "lucide-react";
import toast from "react-hot-toast";
import { generateReceiptPdf, generateReceiptImage } from "@/lib/pdf-generator";
import { RetailReceiptSlip } from "@/components/Receipts/RetailReceiptSlip";

interface PageProps {
  params: Promise<{ receiptNumber: string }>;
}

interface PublicReceipt {
  receiptNumber: string;
  merchantName: string;
  merchantLogo?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  merchantAddress: string;
  customerName?: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  amountPaid?: number;
  creditDueDate?: string | null;
  fulfillmentType: string;
  linkedShipmentId?: string | null;
  status: "Issued" | "Voided";
  voidReason?: string | null;
  voidedAt?: string | null;
  parentReceiptNumber?: string | null;
  receiptHash: string;
  onChainTxHash?: string | null;
  onChainTimestamp?: string | null;
  createdAt: string;
}

export default function PublicReceiptPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const receiptId = resolvedParams.receiptNumber;

  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState<string>("");

  // Fetch Public Receipt
  const { data, isLoading, error } = useQuery<{ success: boolean; receipt: PublicReceipt }>({
    queryKey: ["public-receipt", receiptId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/receipts/${receiptId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Receipt not found");
      }
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const receipt = data?.receipt;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${receiptId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(publicUrl)}`;

  const handleDownloadPdf = async () => {
    if (!receipt || !receiptRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await generateReceiptPdf(receiptRef.current, `receipt-${receipt.receiptNumber}`);
      toast.success("Receipt PDF downloaded!");
    } catch (err: unknown) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate receipt PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!receipt || !receiptRef.current) return;
    setIsDownloadingImage(true);
    try {
      await generateReceiptImage(receiptRef.current, `receipt-${receipt.receiptNumber}`);
      toast.success("Receipt image downloaded!");
    } catch (err: unknown) {
      console.error("Image download error:", err);
      toast.error("Failed to generate receipt image");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleShare = async () => {
    if (!receipt) return;
    setIsSharing(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Receipt #${receipt.receiptNumber} - ${receipt.merchantName}`,
          text: `Official receipt for ${receipt.currency || "NGN"} ${receipt.total.toLocaleString()} from ${receipt.merchantName}:`,
          url: publicUrl,
        });
        toast.success("Receipt shared!");
        return;
      }

      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Receipt link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Failed to share receipt");
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center animate-pulse border border-slate-700">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium">
          Loading digital receipt...
        </p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-2xl space-y-4 text-white">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">
            Receipt Not Found
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error instanceof Error
              ? error.message
              : "The requested digital receipt does not exist or has an invalid reference."}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-xs"
          >
            Return to Recover Home
          </Link>
        </div>
      </div>
    );
  }

  const activeItem = selectedItemName || receipt.items?.[0]?.name || "Purchased Item";

  return (
    <div className="min-h-screen bg-slate-950 py-6 sm:py-10 px-3 sm:px-4 text-slate-100 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Top Header & Actions Bar */}
        <div className="flex items-center justify-between px-1">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo-icon.svg"
              alt="Recover"
              width={28}
              height={28}
              className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-extrabold text-sm tracking-tight text-white">
              Recover
            </span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Verified Sale</span>
          </div>
        </div>

        {/* Void Alert Banner (if voided) */}
        {receipt.status === "Voided" && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-300 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-rose-200">
              <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>OFFICIALLY VOIDED RECEIPT</span>
            </div>
            <p className="text-[11px] text-rose-300/80 pl-5.5">
              This receipt was canceled and officially voided.
              {receipt.voidReason && ` Reason: "${receipt.voidReason}".`}
            </p>
          </div>
        )}

        {/* Reusable Retail Sales Receipt Slip */}
        <RetailReceiptSlip ref={receiptRef} receipt={receipt} qrUrl={qrUrl} />

        {/* Primary Action Buttons at Bottom */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download PDF Receipt"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span>PDF</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Save Receipt Image (.png)"
          >
            {isDownloadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <FileImage className="w-4 h-4 text-emerald-400" />
            )}
            <span>Image</span>
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Share Receipt"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-blue-400" />
            )}
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>

        {/* Compact "Protect on Recover" Bridge Card with multi-product support */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3 text-white shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Protect on Recover</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                <b className="text-slate-200">{activeItem}</b> • Register to protect against loss
              </p>
            </div>

            <a
              href={`/register?name=${encodeURIComponent(activeItem)}&receipt=${encodeURIComponent(receipt.receiptNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <span>Protect Item</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {receipt.items.length > 1 && (
            <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Choose item to protect:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {receipt.items.map((it, idx) => {
                  const isSelected = activeItem === it.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedItemName(it.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-800/90 text-slate-300 hover:bg-slate-700/80"
                      }`}
                    >
                      {it.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
