"use client";

import { X, ArrowRight, Store, User, CreditCard, PackageCheck, AlertCircle, Loader2 } from "lucide-react";

export interface PreviewItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  merchantName: string;
  merchantLogo?: string | null;
  branchName?: string | null;
  issuerName?: string | null;
  items: PreviewItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  remainingCreditBalance: number;
  creditDueDate?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  fulfillmentType: "spot" | "dispatch" | "in_person" | "shipment" | string;
}

export default function ReceiptPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  merchantName,
  merchantLogo,
  branchName,
  issuerName,
  items,
  subtotal,
  discountAmount,
  taxAmount,
  grandTotal,
  paymentMethod,
  amountPaid,
  remainingCreditBalance,
  creditDueDate,
  customerName,
  customerPhone,
  customerEmail,
  fulfillmentType,
}: ReceiptPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-preview-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 id="receipt-preview-title" className="text-base font-bold text-white flex items-center gap-2">
              <span>🧾</span>
              <span>Preview Sales Receipt</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify sale details and totals before issuing to customer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Merchant Identity & Meta */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                {merchantLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={merchantLogo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Store className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-sm text-white truncate">
                  {merchantName || "Merchant Business"}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {branchName ? `📍 ${branchName} Branch` : "Store Headquarters"}
                  {issuerName ? ` · Cashier: ${issuerName}` : ""}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-mono">
                {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Customer Context */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex items-start gap-2.5">
            <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer Details
              </span>
              <div className="font-semibold text-white mt-0.5">
                {customerName?.trim() || "Walk-in Customer (Anonymous)"}
              </div>
              {(customerPhone?.trim() || customerEmail?.trim()) && (
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 font-mono">
                  {customerPhone?.trim() && <span>📞 {customerPhone.trim()}</span>}
                  {customerEmail?.trim() && <span>✉️ {customerEmail.trim()}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-950/30">
            <div className="bg-slate-800/80 px-3.5 py-2 border-b border-slate-700/60 flex justify-between font-bold text-[11px] text-slate-300">
              <span>Item &amp; Qty</span>
              <span>Total</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {items.map((it, idx) => (
                <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white block truncate">{it.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {it.quantity} × ₦{it.unitPrice.toLocaleString()}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-white shrink-0">
                    ₦{it.lineTotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations Ledger */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span>-₦{discountAmount.toLocaleString()}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax</span>
                <span>+₦{taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-700/80 pt-2 flex justify-between items-baseline text-sm font-bold text-white">
              <span>Final Total</span>
              <span className="text-blue-400 text-base font-black">
                ₦{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment & Fulfillment Information */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-800/40 border border-slate-700/60 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-semibold">Payment Method</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>{paymentMethod}</span>
              </span>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-semibold">Fulfillment Type</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{fulfillmentType === "shipment" || fulfillmentType === "dispatch" ? "Package Dispatch" : "In-Person Spot Handover"}</span>
              </span>
            </div>
          </div>

          {/* Credit Sale Summary Callout */}
          {paymentMethod === "Credit" && (
            <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-purple-400" />
                <span>Store Credit Sale Terms</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-0.5">
                <span>Initial Deposit Paid:</span>
                <span className="font-bold font-mono">₦{amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-purple-200 font-bold border-t border-purple-800/40 pt-1">
                <span>Balance Owed:</span>
                <span className="font-mono">₦{remainingCreditBalance.toLocaleString()}</span>
              </div>
              {creditDueDate && (
                <div className="text-[11px] text-purple-300/80 pt-0.5 font-mono">
                  Due by: {new Date(creditDueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            ← Back to Edit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 min-h-10 ${
              paymentMethod === "Credit"
                ? "bg-purple-600 hover:bg-purple-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Sale &amp; Issuing...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Issue Receipt</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
