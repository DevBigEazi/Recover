"use client";

import React, { forwardRef } from "react";
import Image from "next/image";

export interface ReceiptSlipItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptSlipData {
  receiptNumber: string;
  merchantName: string;
  merchantLogo?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  merchantAddress?: string | null;
  customerName?: string | null;
  items: ReceiptSlipItem[];
  currency?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  amountPaid?: number;
  creditDueDate?: string | null;
  status: "Issued" | "Voided";
  createdAt: string;
}

export interface RetailReceiptSlipProps {
  receipt: ReceiptSlipData;
  qrUrl: string;
  className?: string;
}

export function formatReceiptMoney(amount: number, currency: string = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const RetailReceiptSlip = forwardRef<HTMLDivElement, RetailReceiptSlipProps>(
  function RetailReceiptSlip({ receipt, qrUrl, className }, ref) {
    const currency = receipt.currency || "NGN";
    const isCredit = receipt.paymentMethod === "Credit";
    const isCreditUnpaid = isCredit && receipt.paymentStatus !== "paid";
    const paidAmount = receipt.amountPaid ?? (isCreditUnpaid ? 0 : receipt.total);
    const creditBalanceDue = isCreditUnpaid ? Math.max(0, receipt.total - paidAmount) : 0;

    const issuerName = receipt.merchantName || "Verified Merchant";
    const contactParts: string[] = [];
    if (receipt.merchantPhone) {
      contactParts.push(`Phone no: ${receipt.merchantPhone}`);
    }
    if (receipt.merchantEmail) {
      contactParts.push(`Email: ${receipt.merchantEmail}`);
    }
    const issuerContact = contactParts.join(" · ");

    const docTitle = isCreditUnpaid ? "CREDIT RECEIPT" : "SALES RECEIPT";
    const isVoided = receipt.status === "Voided";
    const badgeText = isVoided
      ? "VOIDED"
      : isCreditUnpaid
      ? "STORE CREDIT"
      : "PAID IN FULL";
    const badgeColorHex = isVoided
      ? "#B91C1C"
      : isCreditUnpaid
      ? "#1D4ED8"
      : "#007A4D";

    const issueDateFormatted = new Date(receipt.createdAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const dueDateFormatted = receipt.creditDueDate
      ? new Date(receipt.creditDueDate).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#FFFFFF",
          color: "#0F172A",
          borderColor: "#E2E8F0",
        }}
        className={
          className ||
          "rounded-3xl p-5 sm:p-7 shadow-2xl border space-y-4 relative overflow-hidden"
        }
      >
        {/* Top Brand Accent */}
        <div style={{ backgroundColor: "#0F172A" }} className="absolute top-0 left-0 right-0 h-1.5" />

        {/* Merchant Store Header */}
        <div className="text-center pt-2 pb-1 space-y-1">
          {receipt.merchantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receipt.merchantLogo}
              alt={issuerName}
              className="max-h-11 max-w-37.5 w-auto h-auto object-contain rounded-md mx-auto mb-2 block"
            />
          ) : (
            <div
              style={{ backgroundColor: "#0F172A", color: "#FFFFFF" }}
              className="w-10 h-10 rounded-lg font-extrabold text-base flex items-center justify-center mx-auto mb-2"
            >
              {issuerName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div style={{ color: "#0F172A" }} className="text-lg font-extrabold leading-tight">
            {issuerName}
          </div>

          {issuerContact && (
            <div style={{ color: "#64748B" }} className="text-[11px] mt-1">
              {issuerContact}
            </div>
          )}

          {receipt.merchantAddress && !receipt.merchantAddress.startsWith("0x") && (
            <div style={{ color: "#64748B" }} className="text-[10px] mt-0.5">
              {receipt.merchantAddress}
            </div>
          )}
        </div>

        {/* Receipt Title & Transaction Meta Bar */}
        <div
          style={{ borderColor: "#E2E8F0" }}
          className="border-t border-b py-3 my-2 space-y-2"
        >
          <div className="flex justify-between items-center">
            <div style={{ color: "#0F172A" }} className="text-[13px] font-extrabold tracking-wider uppercase">
              {docTitle}
            </div>
            <span
              style={{ color: badgeColorHex }}
              className="text-[11.5px] font-extrabold uppercase tracking-wider"
            >
              {badgeText}
            </span>
          </div>

          <div style={{ color: "#64748B" }} className="flex justify-between text-[11px] leading-relaxed">
            <div className="text-left space-y-0.5">
              <div>
                Receipt No: <strong style={{ color: "#0F172A" }} className="font-mono font-bold">{receipt.receiptNumber}</strong>
              </div>
              <div>
                Date: <strong style={{ color: "#0F172A" }}>{issueDateFormatted}</strong>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div>
                Payment: <strong style={{ color: "#0F172A" }}>{isCredit ? "Store Credit" : receipt.paymentMethod}</strong>
              </div>
              <div>
                Customer: <strong style={{ color: "#0F172A" }}>{receipt.customerName || "Valued Customer"}</strong>
              </div>
              {dueDateFormatted && (
                <div style={{ color: "#1D4ED8" }} className="font-bold">
                  Due Date: {dueDateFormatted}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }} className="border-b">
                <th style={{ color: "#475569" }} className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-left rounded-l-md">
                  Item
                </th>
                <th style={{ color: "#475569" }} className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right w-12">
                  Qty
                </th>
                <th style={{ color: "#475569" }} className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right w-20">
                  Price
                </th>
                <th style={{ color: "#475569" }} className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right w-24 rounded-r-md">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={idx} style={{ borderColor: "#F1F5F9" }} className="border-b last:border-b-0">
                  <td style={{ color: "#0F172A" }} className="py-2.5 px-3 text-xs font-bold text-left">
                    {item.name}
                  </td>
                  <td style={{ color: "#0F172A" }} className="py-2.5 px-3 text-xs font-mono text-right">
                    {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
                  </td>
                  <td style={{ color: "#0F172A" }} className="py-2.5 px-3 text-xs font-mono text-right">
                    {formatReceiptMoney(item.unitPrice, currency)}
                  </td>
                  <td style={{ color: "#0F172A" }} className="py-2.5 px-3 text-xs font-mono font-bold text-right">
                    {formatReceiptMoney(item.lineTotal, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary / Totals Section */}
        <div className="flex justify-end pt-2 pb-1">
          <div style={{ color: "#64748B" }} className="w-64 sm:w-72 space-y-1 text-xs">
            <div className="flex justify-between py-0.5">
              <span>Subtotal</span>
              <span style={{ color: "#0F172A" }} className="font-mono font-semibold">
                {formatReceiptMoney(receipt.subtotal, currency)}
              </span>
            </div>

            {receipt.discount > 0 && (
              <div style={{ color: "#059669" }} className="flex justify-between py-0.5 font-medium">
                <span>Discount</span>
                <span className="font-mono font-semibold">
                  -{formatReceiptMoney(receipt.discount, currency)}
                </span>
              </div>
            )}

            {receipt.tax > 0 && (
              <div className="flex justify-between py-0.5">
                <span>Tax / VAT</span>
                <span style={{ color: "#0F172A" }} className="font-mono font-semibold">
                  +{formatReceiptMoney(receipt.tax, currency)}
                </span>
              </div>
            )}

            <div
              style={{ borderColor: "#0F172A", color: "#0F172A" }}
              className="border-t-2 mt-1.5 pt-2 flex justify-between font-extrabold text-sm"
            >
              <span>{isCreditUnpaid ? "Total Due" : "Total Paid"}</span>
              <span className="font-mono text-base">
                {formatReceiptMoney(receipt.total, currency)}
              </span>
            </div>

            {isCredit && (
              <div className="space-y-1 pt-1">
                <div style={{ color: "#64748B" }} className="flex justify-between text-[11px]">
                  <span>Amount Paid</span>
                  <span style={{ color: "#334155" }} className="font-mono">
                    {formatReceiptMoney(paidAmount, currency)}
                  </span>
                </div>
                {isCreditUnpaid ? (
                  <div
                    style={{ color: "#007A4D", borderColor: "#CBD5E1" }}
                    className="flex justify-between font-extrabold text-xs border-t border-dashed pt-1.5 mt-1"
                  >
                    <span>Balance Due</span>
                    <span className="font-mono">{formatReceiptMoney(creditBalanceDue, currency)}</span>
                  </div>
                ) : (
                  <div
                    style={{ color: "#007A4D", borderColor: "#CBD5E1" }}
                    className="flex justify-between font-bold text-[11px] border-t border-dashed pt-1.5 mt-1"
                  >
                    <span>Status</span>
                    <span>Credit Settled</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Digital Proof & Item Protection Card */}
        <div
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
          className="p-3 sm:p-3.5 border rounded-xl flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <div style={{ color: "#0F172A" }} className="font-bold text-xs">
              Digital Proof & Item Protection
            </div>
            <p style={{ color: "#64748B" }} className="text-[10px] leading-tight">
              Official proof of sale certified on Recover Registry. Scan QR code to verify authenticity or register item protection.
            </p>
          </div>

          <div className="text-center shrink-0">
            <div
              style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }}
              className="relative w-12 h-12 p-1 rounded-md border shadow-2xs mx-auto"
            >
              <Image
                src={qrUrl}
                alt={`QR for ${receipt.receiptNumber}`}
                fill
                className="object-contain p-0.5"
                unoptimized
              />
            </div>
            <div style={{ color: "#64748B" }} className="text-[8px] font-bold uppercase mt-1">
              Scan to Verify
            </div>
          </div>
        </div>

        {/* Polite Retail Footer */}
        <div className="pt-2 pb-1 text-center">
          <div style={{ color: "#007A4D" }} className="text-xs font-bold">
            Thank you for your business!
          </div>
          <div style={{ color: "#94A3B8" }} className="text-[10px] mt-0.5">
            Receipt Powered by: https://userecover.xyz
          </div>
        </div>
      </div>
    );
  }
);
