"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, Share2, Printer, PlusCircle, X, ExternalLink } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useProfile } from "@/context/ProfileContext";

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
  fulfillmentType: string;
  onChainTxHash?: string | null;
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
  const { businessLogo, companyName } = useProfile();

  const receiptId = receipt.receiptNumber || receipt._id;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${receiptId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(publicUrl)}`;

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
    const text = `Here is your verified receipt for ₦${receipt.total.toLocaleString()} from your purchase: ${publicUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print receipt.");
      return;
    }

    const itemsHtml = receipt.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
            <div style="font-weight: 600; font-size: 13px;">${it.name}</div>
            <div style="font-size: 11px; color: #64748b;">${it.quantity} × ₦${it.unitPrice.toLocaleString()}</div>
          </td>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; text-align: right; font-weight: 600; font-size: 13px;">
            ₦${it.lineTotal.toLocaleString()}
          </td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receiptId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 380px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
            .header { margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .title { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; text-align: left; }
            .totals { border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 8px; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-top: 6px; }
            .qr-box { margin: 20px 0; }
            .qr-img { width: 140px; height: 140px; }
            .footer { font-size: 10px; color: #94a3b8; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">DIGITAL RECEIPT</h1>
              <div class="subtitle">Proof of Purchase · ${receiptId}</div>
              <div class="subtitle">${new Date().toLocaleString()}</div>
            </div>

            <table>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div class="totals">
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
                <span>Payment Method</span>
                <span>${receipt.paymentMethod}</span>
              </div>
              ${
                receipt.discount > 0
                  ? `<div style="display: flex; justify-content: space-between; font-size: 12px; color: #16a34a; margin-bottom: 4px;">
                      <span>Discount</span>
                      <span>-₦${receipt.discount.toLocaleString()}</span>
                    </div>`
                  : ""
              }
              <div class="total-row">
                <span>TOTAL PAID</span>
                <span>₦${receipt.total.toLocaleString()}</span>
              </div>
            </div>

            <div class="qr-box">
              <img src="${qrUrl}" class="qr-img" alt="QR Code" />
              <div style="font-size: 11px; font-weight: 600; color: #0f172a; margin-top: 6px;">
                Scan with phone camera to verify
              </div>
            </div>

            <div class="footer">
              Recorded and verified permanently with tamper-proof security.<br />
              Verify anytime at: ${publicUrl}
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-700">
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

          {/* Quick Summary */}
          <div className="space-y-2 text-sm border-t border-slate-800 pt-3">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Items ({receipt.items.length})</span>
              <span>Payment: {receipt.paymentMethod}</span>
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
                {receipt.paymentMethod === "Credit"
                  ? receipt.paymentStatus === "paid"
                    ? "Total (Credit Settled)"
                    : "Total (Credit Owed)"
                  : "Total Received"}
              </span>
              <span className={`font-mono ${receipt.paymentMethod === "Credit" && receipt.paymentStatus !== "paid" ? "text-amber-400" : "text-blue-400"}`}>
                ₦{receipt.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>

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
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
          </div>

          <div className="flex gap-2 mt-1">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Customer View</span>
            </a>

            <button
              type="button"
              onClick={onNewSale}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Next Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
