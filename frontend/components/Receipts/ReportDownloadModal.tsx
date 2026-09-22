"use client";

import React, { useState } from "react";
import { X, FileText, Download, Calendar, DollarSign, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { generateSalesReportPdf } from "@/lib/pdf-generator";

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
  creditDueDate?: string | null;
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
  merchantAddress?: string | null;
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
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
      setDownloadingCsv(true);
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
        "Blockchain Tx Hash",
      ];

      const rows = receipts.map((r) => {
        const itemsSummary = (r.items || [])
          .map((i) => `${i.name} (x${i.quantity})`)
          .join("; ");

        const owed =
          r.paymentMethod === "Credit" && r.paymentStatus !== "paid"
            ? Math.max(0, r.total - (r.amountPaid || 0))
            : 0;

        return [
          `"${r.receiptNumber || r._id}"`,
          `"${new Date(r.createdAt).toISOString()}"`,
          `"${r.status}"`,
          `"${(r.customerName || "").replace(/"/g, '""')}"`,
          `"${(r.customerPhone || "").replace(/"/g, '""')}"`,
          `"${r.paymentMethod}"`,
          `"${r.paymentStatus || "paid"}"`,
          owed,
          `"${r.fulfillmentType}"`,
          (r.items || []).length,
          r.subtotal,
          r.discount,
          r.tax,
          r.total,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          `"${r.onChainTxHash || ""}"`,
        ].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `recover-sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV report downloaded!");
    } catch {
      toast.error("Failed to export CSV report");
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Direct Vector PDF Export
  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      await generateSalesReportPdf({
        period,
        merchantName: businessName,
        merchantLogo: logoSrc,
        merchantPhone: businessPhone,
        merchantEmail: businessEmail,
        merchantAddress: businessAddress,
        timeframe,
        summary,
        paymentBreakdown,
        topItems,
        receipts,
      });
      toast.success("Sales statement PDF downloaded!");
    } catch (err: unknown) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF statement");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
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
          {/* 1. Download Vector PDF Statement */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>Download PDF Statement</span>
          </button>

          {/* 2. Download CSV Spreadsheet */}
          <button
            onClick={handleExportCSV}
            disabled={downloadingCsv}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {downloadingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
            ) : (
              <Download className="w-4 h-4" />
            )}
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
