"use client";

import React, { useState } from "react";
import { X, FileText, Download, Printer, Calendar, DollarSign, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export interface ReportReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReportReceipt {
  _id: string;
  receiptNumber: string;
  status: "Issued" | "Voided";
  customerName?: string | null;
  customerPhone?: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  amountPaid?: number;
  fulfillmentType: string;
  items: ReportReceiptItem[];
  createdAt: string;
  onChainTxHash?: string | null;
}

export interface ReportAnalyticsData {
  period: string;
  merchant?: {
    address?: string;
    name?: string;
    companyName?: string | null;
    businessLogo?: string | null;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  timeframe: {
    start: string;
    end: string;
  };
  summary: {
    grossRevenue: number;
    netRevenue: number;
    voidedRevenue: number;
    receiptsCount: number;
    issuedCount: number;
    voidedCount: number;
    totalUnitsSold: number;
    averageOrderValue: number;
    totalCreditOwed?: number;
    debtorsCount?: number;
  };
  paymentBreakdown: {
    cash: { total: number; count: number };
    bankTransfer: { total: number; count: number };
    cardPos: { total: number; count: number };
    credit?: { total: number; count: number; unpaidTotal?: number; unpaidCount?: number };
    other: { total: number; count: number };
  };
  topItems: Array<{ name: string; unitsSold: number; grossSales: number }>;
  receipts: ReportReceipt[];
}

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: "daily" | "weekly" | "monthly" | "yearly";
  analyticsData: ReportAnalyticsData | null;
  merchantName?: string;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  merchantAddress?: string;
  merchantLogo?: string | null;
}

export default function ReportDownloadModal({
  isOpen,
  onClose,
  period,
  analyticsData,
  merchantName,
  merchantPhone,
  merchantEmail,
  merchantAddress,
  merchantLogo,
}: ReportDownloadModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !analyticsData) return null;

  const { summary, timeframe, paymentBreakdown, topItems, receipts } = analyticsData;

  const businessName =
    merchantName ||
    analyticsData.merchant?.companyName ||
    analyticsData.merchant?.name ||
    analyticsData.merchant?.fullName ||
    "Merchant Business";

  const businessPhone = merchantPhone || analyticsData.merchant?.phone || null;
  const businessEmail = merchantEmail || analyticsData.merchant?.email || null;
  const businessAddress = merchantAddress || analyticsData.merchant?.address || null;
  const logoSrc = merchantLogo || analyticsData.merchant?.businessLogo || null;

  const formatDateRange = () => {
    const s = new Date(timeframe.start);
    const e = new Date(timeframe.end);
    if (period === "daily") {
      return s.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const periodLabel =
    period === "daily"
      ? "Daily Sales & Close-of-Day Report"
      : period === "weekly"
      ? "Weekly Sales & Performance Report"
      : period === "monthly"
      ? "Monthly Business Summary Statement"
      : "Annual / Yearly Financial Summary";

  // CSV Export
  const handleExportCSV = () => {
    try {
      setDownloading(true);
      const headers = [
        "Receipt Number",
        "Date",
        "Status",
        "Customer Name",
        "Customer Phone",
        "Payment Method",
        "Payment Status",
        "Amount Owed",
        "Fulfillment",
        "Items Count",
        "Subtotal",
        "Discount",
        "Tax",
        "Total Amount",
        "Items Summary",
        "Verification Reference",
      ];

      const rows = receipts.map((r) => {
        const itemsSummary = (r.items || [])
          .map((i) => `${i.name} (x${i.quantity} @ ${i.unitPrice})`)
          .join("; ");
        const owed = r.paymentMethod === "Credit" ? Math.max(0, r.total - (r.amountPaid || 0)) : 0;

        return [
          `"${r.receiptNumber || r._id}"`,
          `"${new Date(r.createdAt).toLocaleString()}"`,
          `"${r.status}"`,
          `"${r.customerName || "Walk-in"}"`,
          `"${r.customerPhone || ""}"`,
          `"${r.paymentMethod}"`,
          `"${r.paymentStatus || (r.paymentMethod === "Credit" ? "unpaid" : "paid")}"`,
          `"${owed.toFixed(2)}"`,
          `"${r.fulfillmentType}"`,
          `"${(r.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)}"`,
          `"${r.subtotal.toFixed(2)}"`,
          `"${r.discount.toFixed(2)}"`,
          `"${r.tax.toFixed(2)}"`,
          `"${r.total.toFixed(2)}"`,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          `"${r.onChainTxHash || "Verified"}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${businessName.replace(/\s+/g, "_")}_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV report downloaded!");
    } catch {
      toast.error("Failed to export CSV report");
    } finally {
      setDownloading(false);
    }
  };

  // Printable PDF Statement
  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print the statement.");
      return;
    }

    const itemsHtml = receipts
      .map(
        (r, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 12px;">
          <td style="padding: 8px 6px;">${idx + 1}</td>
          <td style="padding: 8px 6px; font-weight: 600;">${r.receiptNumber || r._id}</td>
          <td style="padding: 8px 6px;">${new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
          <td style="padding: 8px 6px;">${r.customerName || "Walk-in Customer"}</td>
          <td style="padding: 8px 6px;">
            ${
              r.paymentMethod === "Credit"
                ? `<span style="color: ${r.paymentStatus === "paid" ? "#065f46" : "#b45309"}; font-weight: 700;">
                    Store Credit (${r.paymentStatus === "paid" ? "Settled" : `₦${Math.max(0, r.total - (r.amountPaid || 0)).toLocaleString()} owed`})
                   </span>`
                : r.paymentMethod
            }
          </td>
          <td style="padding: 8px 6px; text-transform: capitalize;">${r.fulfillmentType}</td>
          <td style="padding: 8px 6px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; ${
              r.status === "Issued"
                ? "background-color: #d1fae5; color: #065f46;"
                : "background-color: #fee2e2; color: #991b1b;"
            }">
              ${r.status.toUpperCase()}
            </span>
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 700;">
            ₦${r.total.toLocaleString()}
          </td>
        </tr>
      `
      )
      .join("");

    const topItemsHtml = topItems
      .slice(0, 5)
      .map(
        (item) => `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #e5e7eb;">
          <span style="font-weight: 500;">${item.name}</span>
          <span style="color: #4b5563;"><b>${item.unitsSold} units</b> (₦${item.grossSales.toLocaleString()})</span>
        </div>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${periodLabel} - ${businessName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .badge { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; display: inline-block; }
            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .card-val { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 6px; font-size: 11px; text-transform: uppercase; color: #475569; }
            .recover-footer { margin-top: 36px; padding-top: 12px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 14px; }
              .no-print { display: none; }
              .recover-footer {
                position: fixed;
                bottom: 10px;
                left: 14px;
                right: 14px;
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <!-- Merchant Business Header -->
          <div class="header">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <div style="width: 52px; height: 52px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px; flex-shrink: 0;">
                <img src="${logoSrc || `${typeof window !== "undefined" ? window.location.origin : ""}/logo-icon.svg`}" alt="${businessName}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
              </div>
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">
                  ${businessName}
                </h1>
                <div style="margin-top: 6px; font-size: 12px; color: #475569; line-height: 1.5;">
                  ${businessPhone ? `<div><b>Phone:</b> ${businessPhone}</div>` : ""}
                  ${businessEmail ? `<div><b>Email:</b> ${businessEmail}</div>` : ""}
                  ${businessAddress ? `<div><b>Merchant ID:</b> <span style="font-family: monospace;">${businessAddress.slice(0, 10)}...${businessAddress.slice(-6)}</span></div>` : ""}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge">OFFICIAL SALES STATEMENT</span>
              <div style="margin-top: 6px; font-size: 14px; font-weight: 700; color: #0f172a;">
                ${periodLabel}
              </div>
              <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
                Date Range: ${formatDateRange()}
              </p>
              <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">
                Statement Generated: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <!-- Summary Metric Cards -->
          <div class="cards">
            <div class="card">
              <div class="card-label">Net Sales Revenue</div>
              <div class="card-val" style="color: #0f172a;">₦${summary.netRevenue.toLocaleString()}</div>
            </div>
            <div class="card">
              <div class="card-label">Issued Receipts</div>
              <div class="card-val">${summary.issuedCount} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${summary.voidedCount} voided)</span></div>
            </div>
            <div class="card">
              <div class="card-label">Units Sold</div>
              <div class="card-val">${summary.totalUnitsSold} units</div>
            </div>
            <div class="card">
              <div class="card-label">Average Sale (AOV)</div>
              <div class="card-val">₦${summary.averageOrderValue.toLocaleString()}</div>
            </div>
          </div>

          <!-- Breakdown Split -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">PAYMENT CHANNELS BREAKDOWN</div>
              <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>💵 Cash:</span>
                <b>₦${paymentBreakdown.cash.total.toLocaleString()} (${paymentBreakdown.cash.count} sales)</b>
              </div>
              <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>🏦 Bank Transfer:</span>
                <b>₦${paymentBreakdown.bankTransfer.total.toLocaleString()} (${paymentBreakdown.bankTransfer.count} sales)</b>
              </div>
              <div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>💳 Card / POS:</span>
                <b>₦${paymentBreakdown.cardPos.total.toLocaleString()} (${paymentBreakdown.cardPos.count} sales)</b>
              </div>
              ${
                paymentBreakdown.credit && paymentBreakdown.credit.total > 0
                  ? `<div style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 4px; color: #b45309;">
                      <span>⏳ Store Credit:</span>
                      <b>₦${paymentBreakdown.credit.total.toLocaleString()} (${paymentBreakdown.credit.count} sales)</b>
                    </div>`
                  : ""
              }
              <div style="font-size: 12px; display: flex; justify-content: space-between;">
                <span>🔄 Other:</span>
                <b>₦${paymentBreakdown.other.total.toLocaleString()} (${paymentBreakdown.other.count} sales)</b>
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px;">TOP MOVING PRODUCTS</div>
              ${topItemsHtml || '<div style="font-size: 12px; color: #94a3b8;">No product sales recorded</div>'}
            </div>
          </div>

          <!-- Ledger Table -->
          <div style="margin-top: 10px;">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">TRANSACTION AUDIT LEDGER (${receipts.length} total)</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Receipt No</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Fulfillment</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px; color: #94a3b8;">No receipts issued in this timeframe</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Proof Footer: Recover strictly at the bottom of each page -->
          <div class="recover-footer">
            <div>
              Powered by <b>Recover</b> · <a href="https://userecover.xyz" style="color: inherit; text-decoration: none;">userecover.xyz</a>
            </div>
            <div style="font-weight: 600;">
              Verified Digital Register
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Download Sales Report
            </h3>
            <p className="text-xs text-slate-400">
              {periodLabel}
            </p>
          </div>
        </div>

        {/* Snapshot Summary Box */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <span className="font-semibold text-white">
              {formatDateRange()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Net Revenue:
            </span>
            <span className="font-bold text-emerald-400">
              ₦{summary.netRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Total Receipts:
            </span>
            <span className="font-semibold text-white">
              {summary.issuedCount} issued ({summary.voidedCount} voided)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* 1. Print / Save as PDF */}
          <button
            onClick={handlePrintPDF}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print or Save as PDF Statement</span>
          </button>

          {/* 2. Download CSV Spreadsheet */}
          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV (Excel Compatible)</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-500 mt-4">
          All records are securely verified and recorded on the official tamper-proof register.
        </p>
      </div>
    </div>
  );
}
