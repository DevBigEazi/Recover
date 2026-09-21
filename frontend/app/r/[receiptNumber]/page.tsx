"use client";

import React, { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Printer,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Store,
  Calendar,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface PageProps {
  params: Promise<{ receiptNumber: string }>;
}

interface PublicReceipt {
  receiptNumber: string;
  merchantName: string;
  merchantLogo?: string | null;
  merchantAddress: string;
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

  const [copied, setCopied] = useState(false);
  const [showLedgerDetails, setShowLedgerDetails] = useState(false);

  // Fetch Public Receipt
  const { data, isLoading, error } = useQuery<{ success: boolean; receipt: PublicReceipt }>({
    queryKey: ["public-receipt", receiptId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/receipts/${receiptId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Receipt not found");
      }
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const receipt = data?.receipt;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${receiptId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(publicUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Receipt link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-cream/40 dark:bg-[#0b111e] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-xs text-neutral-slate dark:text-neutral-white/60 mt-3">
          Verifying official receipt...
        </p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-neutral-cream/40 dark:bg-[#0b111e] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-neutral-white dark:bg-neutral-dark border border-neutral-slate/15 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-dark dark:text-neutral-white">
            Receipt Not Found
          </h2>
          <p className="text-xs text-neutral-slate dark:text-neutral-white/60">
            {error instanceof Error ? error.message : "The requested digital receipt does not exist or has an invalid reference."}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl bg-primary text-neutral-white text-xs font-bold shadow-sm hover:bg-primary-hover"
          >
            Return to Recover Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryItem = receipt.items?.[0]?.name || "Purchased Item";

  return (
    <div className="min-h-screen bg-neutral-cream/40 dark:bg-[#0b111e] py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Header / Brand Bar */}
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-neutral-white font-black text-xs group-hover:scale-105 transition-transform">
              R
            </div>
            <span className="font-extrabold text-sm tracking-tight text-neutral-dark dark:text-neutral-white">
              Recover
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-neutral-white dark:bg-neutral-dark text-neutral-slate dark:text-neutral-white/80 border border-neutral-slate/15 dark:border-neutral-white/10 hover:border-primary text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-neutral-white dark:bg-neutral-dark text-neutral-slate dark:text-neutral-white/80 border border-neutral-slate/15 dark:border-neutral-white/10 hover:border-primary text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Share Receipt"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* Void Alert Banner (if voided) */}
        {receipt.status === "Voided" && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="w-4 h-4" />
              <span>OFFICIALLY VOIDED RECEIPT</span>
            </div>
            <p className="text-xs text-rose-600/90 dark:text-rose-300/80">
              This receipt was officially canceled and voided on the tamperproof ledger.
              {receipt.voidReason && ` Reason: "${receipt.voidReason}".`}
            </p>
          </div>
        )}

        {/* Main Digital Receipt Card */}
        <div className="bg-neutral-white dark:bg-neutral-dark rounded-3xl p-5 sm:p-7 shadow-sm border border-neutral-slate/15 dark:border-neutral-white/10 relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

          {/* Store & Verification Header */}
          <div className="text-center pb-5 border-b border-neutral-slate/10 dark:border-neutral-white/10 space-y-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Digital Receipt</span>
            </div>

            {/* Merchant Logo */}
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 rounded-xl border border-neutral-slate/10 dark:border-neutral-white/10 bg-neutral-cream/30 dark:bg-neutral-white/5 flex items-center justify-center overflow-hidden p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt.merchantLogo || "/logo-icon.svg"}
                  alt={receipt.merchantName}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-dark dark:text-neutral-white tracking-tight">
              {receipt.merchantName}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-slate dark:text-neutral-white/60">
              <span className="flex items-center gap-1 font-mono">
                <Store className="w-3.5 h-3.5 text-primary" />
                {receipt.receiptNumber}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {new Date(receipt.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Items Purchased Table */}
          <div className="py-5 border-b border-neutral-slate/10 dark:border-neutral-white/10 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-slate/70 dark:text-neutral-white/50">
              Purchased Items
            </div>

            <div className="space-y-3">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-neutral-dark dark:text-neutral-white">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-neutral-slate dark:text-neutral-white/50 mt-0.5">
                      {item.quantity} × ₦{item.unitPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-bold text-neutral-dark dark:text-neutral-white text-right shrink-0">
                    ₦{item.lineTotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="py-4 border-b border-neutral-slate/10 dark:border-neutral-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-slate dark:text-neutral-white/70">
              <span>Subtotal</span>
              <span>₦{receipt.subtotal.toLocaleString()}</span>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Store Discount</span>
                <span>-₦{receipt.discount.toLocaleString()}</span>
              </div>
            )}

            {receipt.tax > 0 && (
              <div className="flex justify-between text-neutral-slate dark:text-neutral-white/70">
                <span>Tax / VAT</span>
                <span>+₦{receipt.tax.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-neutral-slate/10 dark:border-neutral-white/10 text-base font-black text-neutral-dark dark:text-neutral-white">
              <span>
                {receipt.paymentMethod === "Credit"
                  ? receipt.paymentStatus === "paid"
                    ? "Total (Credit Settled)"
                    : "Total (Store Credit)"
                  : "Total Paid"}
              </span>
              <span className={receipt.paymentMethod === "Credit" && receipt.paymentStatus !== "paid" ? "text-amber-500 font-mono" : "text-primary font-mono"}>
                ₦{receipt.total.toLocaleString()}
              </span>
            </div>

            {receipt.paymentMethod === "Credit" && receipt.paymentStatus !== "paid" && (
              <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-bold pt-1">
                <span>Balance Due:</span>
                <span className="font-mono">₦{Math.max(0, receipt.total - (receipt.amountPaid || 0)).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Payment & Fulfillment Details */}
          <div className="py-4 border-b border-neutral-slate/10 dark:border-neutral-white/10 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-cream/40 dark:bg-neutral-white/5 border border-neutral-slate/10 dark:border-neutral-white/5">
              <span className="text-[10px] uppercase font-semibold text-neutral-slate/70 dark:text-neutral-white/40 block mb-1">
                Payment Channel
              </span>
              <span className="font-bold text-neutral-dark dark:text-neutral-white">
                {receipt.paymentMethod === "Credit"
                  ? `Store Credit (${receipt.paymentStatus === "paid" ? "Settled" : "Pay Later"})`
                  : receipt.paymentMethod}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-cream/40 dark:bg-neutral-white/5 border border-neutral-slate/10 dark:border-neutral-white/5">
              <span className="text-[10px] uppercase font-semibold text-neutral-slate/70 dark:text-neutral-white/40 block mb-1">
                Fulfillment Mode
              </span>
              <span className="font-bold text-neutral-dark dark:text-neutral-white capitalize">
                {receipt.fulfillmentType === "dispatch" ? "📦 Secure Dispatch" : "🤝 In-Person Handover"}
              </span>
            </div>
          </div>

          {/* QR Code Verification Section */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <div className="text-xs font-bold text-neutral-dark dark:text-neutral-white">
                Scan for Digital Proof
              </div>
              <p className="text-[11px] text-neutral-slate dark:text-neutral-white/60 max-w-55">
                Point camera to verify original authenticity on the tamperproof ledger.
              </p>
            </div>

            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white p-2 rounded-2xl border border-neutral-slate/20 shadow-sm shrink-0">
              <Image
                src={qrUrl}
                alt={`QR code for ${receipt.receiptNumber}`}
                fill
                className="object-contain p-1"
                unoptimized
              />
            </div>
          </div>

          {/* Expandable Tamperproof Ledger Audit Information */}
          <div className="mt-6 pt-4 border-t border-neutral-slate/10 dark:border-neutral-white/10">
            <button
              onClick={() => setShowLedgerDetails((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-neutral-slate dark:text-neutral-white/70 hover:text-primary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Official Verification & Certificate Details</span>
              </div>
              {showLedgerDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showLedgerDetails && (
              <div className="mt-3 p-3.5 rounded-xl bg-neutral-cream/40 dark:bg-neutral-white/5 border border-neutral-slate/10 dark:border-neutral-white/5 space-y-2 text-[11px]">
                <div>
                  <span className="text-neutral-slate/60 dark:text-neutral-white/40 block">
                    Verification Registry:
                  </span>
                  <span className="font-semibold text-neutral-dark dark:text-neutral-white">
                    Electroneum Official Verification Registry
                  </span>
                </div>

                <div>
                  <span className="text-neutral-slate/60 dark:text-neutral-white/40 block">
                    Digital Verification Fingerprint:
                  </span>
                  <span className="font-mono text-[10px] break-all text-neutral-dark dark:text-neutral-white">
                    {receipt.receiptHash}
                  </span>
                </div>

                {receipt.onChainTxHash && (
                  <div>
                    <span className="text-neutral-slate/60 dark:text-neutral-white/40 block">
                      Public Certificate Record:
                    </span>
                    <a
                      href={`https://blockexplorer.electroneum.com/tx/${receipt.onChainTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-primary hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{receipt.onChainTxHash}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Customer Onboarding Bridge: "Protect on Recover" */}
        <div className="p-5 sm:p-6 rounded-3xl bg-neutral-white dark:bg-neutral-dark border border-neutral-slate/15 dark:border-neutral-white/10 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-black text-neutral-dark dark:text-neutral-white tracking-tight">
                Protect Your Item with Recover
              </h3>
              <p className="text-xs text-neutral-slate dark:text-neutral-white/70">
                Secure this purchase on the Recover registry. If lost anywhere in the world, finders can instantly contact you safely while keeping your identity private.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-slate/10 dark:border-neutral-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-slate dark:text-neutral-white/60 font-medium">
              Item to protect: <span className="font-bold text-neutral-dark dark:text-neutral-white">{primaryItem}</span>
            </div>

            <Link
              href={`/register?name=${encodeURIComponent(primaryItem)}&receipt=${encodeURIComponent(receipt.receiptNumber)}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-neutral-white font-bold text-xs transition-all cursor-pointer"
            >
              <span>Protect on Recover</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
