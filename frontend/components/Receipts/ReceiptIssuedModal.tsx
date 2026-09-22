"use client";

import React, { useState, useRef } from "react";
import { CheckCircle2, Copy, Share2, Download, PlusCircle, X, ExternalLink, Loader2, AlertCircle, Calendar, User, FileImage } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useProfile } from "@/context/ProfileContext";
import { generateReceiptPdf, generateReceiptImage } from "@/lib/pdf-generator";
import { RetailReceiptSlip } from "@/components/Receipts/RetailReceiptSlip";

export interface ReceiptIssuedData {
  _id: string;
  receiptNumber?: string;
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
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  fulfillmentType: string;
  onChainTxHash?: string | null;
  createdAt?: string;
}

interface ReceiptIssuedModalProps {
  receipt: ReceiptIssuedData;
  onClose: () => void;
  onNewSale: () => void;
}

export default function ReceiptIssuedModal({
  receipt,
  onClose,
  onNewSale,
}: ReceiptIssuedModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const { businessLogo, companyName, phone, email, whatsapp } = useProfile();

  const receiptId = receipt.receiptNumber || receipt._id;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${receiptId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(publicUrl)}`;

  const hiddenReceiptRef = useRef<HTMLDivElement>(null);
  const isCredit = receipt.paymentMethod === "Credit";
  const isCreditUnpaid = isCredit && receipt.paymentStatus !== "paid";
  const amountPaid = receipt.amountPaid || 0;
  const balanceDue = isCreditUnpaid ? Math.max(0, receipt.total - amountPaid) : 0;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Receipt link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Here is your verified receipt for ₦${receipt.total.toLocaleString()} from ${companyName || "Merchant"}: ${publicUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const getReceiptData = () => ({
    receiptNumber: receiptId,
    merchantName: companyName || "Merchant Store",
    merchantLogo: businessLogo,
    merchantPhone: phone || whatsapp || null,
    merchantEmail: email || null,
    items: receipt.items,
    currency: receipt.currency || "NGN",
    subtotal: receipt.subtotal,
    discount: receipt.discount,
    tax: receipt.tax,
    total: receipt.total,
    paymentMethod: receipt.paymentMethod,
    paymentStatus: (receipt.paymentStatus || "paid") as "paid" | "unpaid" | "partially_paid",
    amountPaid: receipt.amountPaid,
    creditDueDate: receipt.creditDueDate,
    customerName: receipt.customerName,
    fulfillmentType: receipt.fulfillmentType,
    status: "Issued" as const,
    createdAt: receipt.createdAt || new Date().toISOString(),
  });

  const handleDownloadPdf = async () => {
    if (!hiddenReceiptRef.current) return;
    try {
      setIsDownloadingPdf(true);
      await generateReceiptPdf(hiddenReceiptRef.current, `receipt-${receiptId}`);
      toast.success("Receipt PDF downloaded!");
    } catch (err: unknown) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!hiddenReceiptRef.current) return;
    try {
      setIsDownloadingImage(true);
      await generateReceiptImage(hiddenReceiptRef.current, `receipt-${receiptId}`);
      toast.success("Receipt image downloaded!");
    } catch (err: unknown) {
      console.error("Image download error:", err);
      toast.error("Failed to generate image");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Receipt Issued!</h2>
              <p className="text-xs text-slate-400 font-mono">{receiptId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* QR Display Card */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center text-center">
            {/* Merchant Logo Badge */}
            <div className="w-10 h-10 rounded-xl border border-slate-700 bg-white flex items-center justify-center overflow-hidden p-1 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={businessLogo || "/logo-icon.svg"}
                alt={companyName || "Store"}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Customer Instant QR Scan
            </p>
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-700">
              <Image
                src={qrUrl}
                alt={`QR code for ${receiptId}`}
                width={170}
                height={170}
                unoptimized
                className="w-40 h-40 object-contain"
              />
            </div>
            <p className="text-xs text-white font-medium mt-3">
              Customer scans with standard phone camera
            </p>
            <p className="text-[11px] text-slate-400">
              No app or wallet required to view or save.
            </p>
          </div>

          {/* Store Credit Deal Highlight Card */}
          {isCreditUnpaid && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/30 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Store Credit Deal</span>
              </div>

              <div className="flex justify-between items-baseline pt-1 border-t border-slate-800">
                <span className="text-xs text-slate-300 font-semibold">Remaining Balance Due:</span>
                <span className="text-base font-black font-mono text-blue-400">
                  ₦{balanceDue.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                {receipt.customerName && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="w-3 h-3 text-blue-400 shrink-0" />
                    Customer: <b className="text-white">{receipt.customerName}</b>
                  </span>
                )}
                {amountPaid > 0 && (
                  <span>
                    Initial Deposit: <b className="text-white">₦{amountPaid.toLocaleString()}</b>
                  </span>
                )}
              </div>

              {receipt.creditDueDate && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-0.5">
                  <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>
                    Payment Due Date:{" "}
                    <b className="text-slate-200">
                      {new Date(receipt.creditDueDate).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </b>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Summary */}
          <div className="space-y-2 text-sm border-t border-slate-800 pt-3">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Items ({receipt.items.length})</span>
              <span>
                Payment:{" "}
                <b className="text-white font-semibold">
                  {isCredit
                    ? `Store Credit (${receipt.paymentStatus === "paid" ? "Settled" : "Pay Later"})`
                    : receipt.paymentMethod}
                </b>
              </span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {receipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 border-b border-dashed border-slate-800/80">
                  <span className="font-medium text-white truncate max-w-50">
                    {it.quantity}× {it.name}
                  </span>
                  <span className="font-mono text-slate-400">₦{it.lineTotal.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-white text-base">
              <span>
                {isCredit
                  ? receipt.paymentStatus === "paid"
                    ? "Total (Credit Settled)"
                    : "Total Deal Amount"
                  : "Total Received"}
              </span>
              <span className={`font-mono ${isCreditUnpaid ? "text-blue-400" : "text-emerald-400"}`}>
                ₦{receipt.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-emerald-800/60 bg-emerald-950/80 hover:bg-emerald-900/80 text-xs font-semibold text-emerald-300 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloadingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <FileImage className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Save Image (.png)</span>
            </button>

             <button
              type="button"
              onClick={onNewSale}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Next Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Offscreen Rendered Receipt Slip for 1-Click PDF/Image Generation */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0 w-150">
        <RetailReceiptSlip ref={hiddenReceiptRef} receipt={getReceiptData()} qrUrl={qrUrl} />
      </div>
    </div>
  );
}
