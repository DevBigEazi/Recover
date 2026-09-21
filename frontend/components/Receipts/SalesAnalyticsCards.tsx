"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Receipt,
  Package,
  CreditCard,
  Download,
  Banknote,
  RefreshCw,
  ShoppingBag,
  PlusCircle,
  Clock,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useProfile } from "@/context/ProfileContext";
import ReportDownloadModal, { ReportAnalyticsData } from "./ReportDownloadModal";
import DebtorsModal, { DebtorCustomer } from "./DebtorsModal";

interface SalesAnalyticsCardsProps {
  onNewSaleClick?: () => void;
}

export default function SalesAnalyticsCards({ onNewSaleClick }: SalesAnalyticsCardsProps) {
  const { account } = useAuthReady();
  const { companyName, businessLogo, fullName, phone, email } = useProfile();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDebtorsModalOpen, setIsDebtorsModalOpen] = useState(false);

  // Fetch analytics data for current period
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    success: boolean;
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
    timeframe: { start: string; end: string };
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
    debtors?: DebtorCustomer[];
    paymentBreakdown: {
      cash: { total: number; count: number };
      bankTransfer: { total: number; count: number };
      cardPos: { total: number; count: number };
      credit: { total: number; count: number; unpaidTotal: number; unpaidCount: number; paidTotal: number };
      other: { total: number; count: number };
    };
    topItems: Array<{ name: string; unitsSold: number; grossSales: number }>;
    receipts: ReportAnalyticsData["receipts"];
  }>({
    queryKey: ["receipt-analytics", account?.address, period],
    queryFn: async () => {
      if (!account?.address) throw new Error("Wallet not connected");
      const res = await fetch(`/api/v1/receipts/analytics?period=${period}`, {
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!account?.address,
  });

  const summary = data?.summary || {
    grossRevenue: 0,
    netRevenue: 0,
    voidedRevenue: 0,
    receiptsCount: 0,
    issuedCount: 0,
    voidedCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
    totalCreditOwed: 0,
    debtorsCount: 0,
  };

  const paymentBreakdown = data?.paymentBreakdown || {
    cash: { total: 0, count: 0 },
    bankTransfer: { total: 0, count: 0 },
    cardPos: { total: 0, count: 0 },
    credit: { total: 0, count: 0, unpaidTotal: 0, unpaidCount: 0, paidTotal: 0 },
    other: { total: 0, count: 0 },
  };

  const debtors = data?.debtors || [];
  const totalCreditOwed = summary.totalCreditOwed || 0;
  const debtorsCount = summary.debtorsCount || debtors.length;
  const topItems = data?.topItems || [];
  const hasSales = summary.issuedCount > 0;
  const totalPaymentRevenue = Math.max(1, summary.netRevenue);

  return (
    <div className="space-y-4">
      {/* Control Bar: Period Switcher & Download Report Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-sm">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          {(
            [
              { id: "daily", label: "Daily (Close-of-Day)" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                period === t.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Refresh & Download Report */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Refresh statistics"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 cursor-pointer disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            disabled={isLoading || !data}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm min-h-9.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {period.charAt(0).toUpperCase() + period.slice(1)} Report</span>
          </button>
        </div>
      </div>

      {/* Customer Debtors / Credit Receivables Banner */}
      {totalCreditOwed > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <span>Customer Credit Outstanding</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50">
                  {debtorsCount} {debtorsCount === 1 ? "debtor" : "debtors"}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
                ₦{totalCreditOwed.toLocaleString()}
                <span className="text-xs font-normal text-amber-300/80 ml-2">
                  with customers
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDebtorsModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 min-h-10"
          >
            <Users className="w-3.5 h-3.5" />
            <span>View Debtors Ledger ({debtorsCount})</span>
          </button>
        </div>
      )}

      {/* 4 Metric Cards (Dark Slate FinTech Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Net Revenue Card */}
        <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Net Sales Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ₦{summary.netRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              {hasSales ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{summary.issuedCount} successful sales</span>
                  {summary.voidedCount > 0 && (
                    <span className="text-rose-400 font-medium">({summary.voidedCount} voided)</span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready for first sale
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Receipts Count Card */}
        <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Receipts Issued
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.issuedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              {hasSales ? (
                <span>{summary.receiptsCount} total generated</span>
              ) : (
                <span className="text-blue-400 font-medium">
                  0 transactions recorded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Units Sold Card */}
        <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Units Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.totalUnitsSold}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              {summary.totalUnitsSold > 0 ? (
                <span>Across all inventory line items</span>
              ) : (
                <span className="text-amber-400 font-medium">
                  No items dispatched yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Average Order Value Card */}
        <div className="p-4.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Average Sale (AOV)
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              ₦{summary.averageOrderValue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              {summary.averageOrderValue > 0 ? (
                <span>Average basket size per customer</span>
              ) : (
                <span className="text-slate-400 font-medium">
                  Establishes on first sale
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Row: Payment Channels + Top Moving Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Channels Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Banknote className="w-3.5 h-3.5" />
              </div>
              <span>Payment Channels</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400">
              {summary.issuedCount} transactions
            </span>
          </div>

          <div className="space-y-3">
            {/* Cash */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Cash</span>
                </div>
                <div className="text-right font-bold text-white">
                  ₦{paymentBreakdown.cash.total.toLocaleString()}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    ({paymentBreakdown.cash.count})
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${hasSales ? Math.min(100, Math.round((paymentBreakdown.cash.total / totalPaymentRevenue) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Bank Transfer */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Bank Transfer</span>
                </div>
                <div className="text-right font-bold text-white">
                  ₦{paymentBreakdown.bankTransfer.total.toLocaleString()}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    ({paymentBreakdown.bankTransfer.count})
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${hasSales ? Math.min(100, Math.round((paymentBreakdown.bankTransfer.total / totalPaymentRevenue) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Card / POS */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span>Card / POS</span>
                </div>
                <div className="text-right font-bold text-white">
                  ₦{paymentBreakdown.cardPos.total.toLocaleString()}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    ({paymentBreakdown.cardPos.count})
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${hasSales ? Math.min(100, Math.round((paymentBreakdown.cardPos.total / totalPaymentRevenue) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Store Credit */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Store Credit</span>
                </div>
                <div className="text-right font-bold text-white">
                  ₦{paymentBreakdown.credit.total.toLocaleString()}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    ({paymentBreakdown.credit.count})
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${hasSales ? Math.min(100, Math.round((paymentBreakdown.credit.total / totalPaymentRevenue) * 100)) : 0}%`,
                  }}
                />
              </div>
              {paymentBreakdown.credit.unpaidTotal > 0 && (
                <div className="text-[10px] text-amber-400 mt-0.5 text-right font-medium">
                  ₦{paymentBreakdown.credit.unpaidTotal.toLocaleString()} unpaid
                </div>
              )}
            </div>

            {/* Other */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-medium text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span>Other</span>
                </div>
                <div className="text-right font-bold text-white">
                  ₦{paymentBreakdown.other.total.toLocaleString()}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    ({paymentBreakdown.other.count})
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${hasSales ? Math.min(100, Math.round((paymentBreakdown.other.total / totalPaymentRevenue) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <span>Top Moving Products</span>
              </div>
              {topItems.length > 0 && (
                <span className="text-[11px] font-normal text-slate-400">
                  {topItems.length} products
                </span>
              )}
            </div>

            {topItems.length === 0 ? (
              /* Clean Empty State */
              <div className="py-8 px-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2.5 my-auto">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto border border-slate-700/50">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">
                    No sales recorded for this period
                  </h5>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-0.5">
                    Your fastest-selling products will automatically rank here with units sold and revenue totals.
                  </p>
                </div>
                {onNewSaleClick && (
                  <button
                    type="button"
                    onClick={onNewSaleClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Issue First Sale</span>
                  </button>
                )}
              </div>
            ) : (
              /* Product Ranking List */
              <div className="space-y-2.5">
                {topItems.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-white truncate max-w-35 sm:max-w-50">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-white">
                        {item.unitsSold} {item.unitsSold === 1 ? "unit" : "units"}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        ₦{item.grossSales.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Download Modal */}
      {isReportModalOpen && data && (
        <ReportDownloadModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          period={period}
          analyticsData={data as ReportAnalyticsData}
          merchantName={companyName || fullName || data.merchant?.name}
          merchantPhone={phone || data.merchant?.phone}
          merchantEmail={email || data.merchant?.email}
          merchantAddress={account?.address}
          merchantLogo={businessLogo || data.merchant?.businessLogo}
        />
      )}

      {/* Debtors Ledger Modal */}
      <DebtorsModal
        isOpen={isDebtorsModalOpen}
        onClose={() => setIsDebtorsModalOpen(false)}
        debtors={debtors}
        totalCreditOwed={totalCreditOwed}
        ownerAddress={account?.address}
        onSettleSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["receipt-analytics"] });
          queryClient.invalidateQueries({ queryKey: ["receipts-list"] });
        }}
      />
    </div>
  );
}
