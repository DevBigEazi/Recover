"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  PlusCircle,
  Eye,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  Check,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import Link from "next/link";
import toast from "react-hot-toast";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ReceiptRecord {
  _id: string;
  receiptNumber: string;
  merchantAddress: string;
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
  creditSettledAt?: string | null;
  creditNotes?: string | null;
  fulfillmentType: string;
  status: "Issued" | "Voided";
  voidReason?: string | null;
  items: ReceiptItem[];
  onChainTxHash?: string | null;
  createdAt: string;
}

interface ReceiptsTableProps {
  onNewSaleClick?: () => void;
}

export default function ReceiptsTable({ onNewSaleClick }: ReceiptsTableProps = {}) {
  const { account } = useAuthReady();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "Issued" | "UnpaidCredit" | "Voided">("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Void Receipt State
  const [voidTarget, setVoidTarget] = useState<ReceiptRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Settle Debt State
  const [settleTarget, setSettleTarget] = useState<ReceiptRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");

  // Fetch receipts list
  const { data, isLoading } = useQuery<{
    success: boolean;
    receipts: ReceiptRecord[];
    pagination: { total: number; page: number; pages: number; limit: number };
  }>({
    queryKey: ["receipts-list", account?.address, filterTab, search, page],
    queryFn: async () => {
      if (!account?.address) return { success: true, receipts: [], pagination: { total: 0, page: 1, pages: 1, limit } };

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterTab === "UnpaidCredit") {
        params.append("unpaidCreditOnly", "true");
      } else if (filterTab !== "all") {
        params.append("status", filterTab);
      }

      if (search.trim()) params.append("q", search.trim());

      const res = await fetch(`/api/v1/receipts?${params.toString()}`, {
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to load receipts");
      return res.json();
    },
    enabled: !!account?.address,
  });

  // Settle Debt Mutation
  const settleMutation = useMutation({
    mutationFn: async ({ receiptId, amount }: { receiptId: string; amount?: number }) => {
      if (!account?.address) throw new Error("Wallet not connected");
      const res = await fetch(`/api/v1/receipts/${encodeURIComponent(receiptId)}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({ amountSettled: amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to settle payment");
      }
      return res.json();
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Customer debt settled successfully!");
      setSettleTarget(null);
      setSettleAmount("");
      queryClient.invalidateQueries({ queryKey: ["receipts-list", account?.address] });
      queryClient.invalidateQueries({ queryKey: ["receipt-analytics", account?.address] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Void Mutation
  const voidMutation = useMutation({
    mutationFn: async ({ receiptId, reason }: { receiptId: string; reason: string }) => {
      if (!account?.address) throw new Error("Wallet not connected");
      const res = await fetch(`/api/v1/receipts/${encodeURIComponent(receiptId)}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to void receipt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Receipt marked as voided.");
      setVoidTarget(null);
      setVoidReason("");
      queryClient.invalidateQueries({ queryKey: ["receipts-list", account?.address] });
      queryClient.invalidateQueries({ queryKey: ["receipt-analytics", account?.address] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const receipts = data?.receipts || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1, limit };

  const handleOpenSettle = (r: ReceiptRecord) => {
    setSettleTarget(r);
    const owed = Math.max(0, r.total - (r.amountPaid || 0));
    setSettleAmount(String(owed));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-sm overflow-hidden space-y-4">
      {/* Search & Filter Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search receipt #, customer name, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-slate-800 focus:border-blue-500 text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        {/* Status Filter Tabs (Touch Friendly & Responsive) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none touch-pan-x">
          {(
            [
              { id: "all", label: "All Receipts" },
              { id: "Issued", label: "Issued" },
              { id: "UnpaidCredit", label: "Unpaid Debts (Credit)" },
              { id: "Voided", label: "Voided" },
            ] as const
          ).map((tab) => {
            const isSelected = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-8.5 flex items-center gap-1.5 ${
                  isSelected
                    ? tab.id === "UnpaidCredit"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {tab.id === "UnpaidCredit" && <Clock className="w-3 h-3" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Receipts List Container */}
      <div className="p-3 sm:p-4 pt-0">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading receipts ledger...
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-14 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No receipts found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search
                  ? "No transactions match your search filter."
                  : filterTab === "UnpaidCredit"
                  ? "Great! There are no unpaid customer debts on file."
                  : "Issue a new sale or register counter orders to start tracking digital sales."}
              </p>
            </div>
            {!search && filterTab === "all" && onNewSaleClick && (
              <button
                type="button"
                onClick={onNewSaleClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer mt-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Issue Digital Receipt</span>
              </button>
            )}
          </div>
        ) : (
          /* Responsive Cards Layout (Matching Shipments Style) */
          <div className="space-y-3">
            {receipts.map((r) => {
              const totalQty = (r.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
              const firstItemName = r.items?.[0]?.name || "Item";
              const moreItemsCount = (r.items?.length || 0) - 1;
              const isCredit = r.paymentMethod === "Credit";
              const isCreditUnpaid = isCredit && r.paymentStatus !== "paid";
              const owedAmount = Math.max(0, r.total - (r.amountPaid || 0));

              return (
                <div
                  key={r._id}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                >
                  {/* Left Section: Receipt Info, Items & Customer */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/r/${r.receiptNumber || r._id}`}
                        target="_blank"
                        className="font-mono font-bold text-xs sm:text-sm text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>{r.receiptNumber || r._id}</span>
                        <ExternalLink className="w-3 h-3 text-blue-400/60" />
                      </Link>

                      {/* Status Badges */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          r.status === "Issued"
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-900/50"
                            : "bg-rose-950/80 text-rose-400 border-rose-900/50"
                        }`}
                      >
                        {r.status === "Issued" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{r.status}</span>
                      </span>

                      {/* Fulfillment Badge */}
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                        {r.fulfillmentType === "dispatch" ? "📦 Dispatch" : "🤝 Spot Handover"}
                      </span>

                      {/* Payment Badge */}
                      {isCredit ? (
                        isCreditUnpaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                            <Clock className="w-3 h-3" />
                            <span>Store Credit (₦{owedAmount.toLocaleString()} Owed)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                            <Check className="w-3 h-3" />
                            <span>Credit (Settled)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                          {r.paymentMethod}
                        </span>
                      )}
                    </div>

                    {/* Customer & Item Preview */}
                    <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                      <div className="flex items-center gap-1 font-medium text-white">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{r.customerName || "Walk-in Customer"}</span>
                        {r.customerPhone && (
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-500" />
                            <span>{r.customerPhone}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-slate-600 hidden sm:inline">•</span>

                      <div className="text-slate-400 text-[11px] truncate max-w-xs">
                        <span>{firstItemName}</span>
                        {moreItemsCount > 0 && <span className="text-slate-500"> +{moreItemsCount} more</span>}
                        <span className="text-slate-500"> ({totalQty} {totalQty === 1 ? "unit" : "units"})</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Issued: {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {r.creditDueDate && (
                        <span className="ml-2 text-amber-400/80">
                          Due: {new Date(r.creditDueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Section: Total Amount & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    <div className="md:text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Total</div>
                      <div className="text-sm sm:text-base font-black text-white font-mono">
                        ₦{r.total.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Settle Debt Button for Unpaid Credit */}
                      {isCreditUnpaid && r.status === "Issued" && (
                        <button
                          type="button"
                          onClick={() => handleOpenSettle(r)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 min-h-8.5"
                          title="Record Customer Payment"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Settle Debt</span>
                        </button>
                      )}

                      {/* View Public Receipt Link */}
                      <Link
                        href={`/r/${r.receiptNumber || r._id}`}
                        target="_blank"
                        title="View Public Receipt"
                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors min-h-8.5 flex items-center justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      {/* Void Receipt Button */}
                      {r.status === "Issued" && (
                        <button
                          onClick={() => setVoidTarget(r)}
                          title="Void Receipt"
                          className="p-2 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 text-rose-400 border border-rose-900/50 transition-colors cursor-pointer min-h-8.5 flex items-center justify-center"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination.pages > 1 && (
        <div className="p-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-800 bg-slate-800/50 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="p-2 rounded-lg border border-slate-800 bg-slate-800/50 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Settle Debt Confirmation Modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-900/50 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">
                  Settle Debt: {settleTarget.receiptNumber || settleTarget._id}
                </h4>
                <p className="text-xs text-slate-400">
                  Customer: <span className="text-white font-semibold">{settleTarget.customerName || "Customer"}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Remaining Balance:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                ₦{Math.max(0, settleTarget.total - (settleTarget.amountPaid || 0)).toLocaleString()}
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Payment Amount Received (₦)
              </label>
              <input
                type="number"
                min="1"
                max={Math.max(0, settleTarget.total - (settleTarget.amountPaid || 0))}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full p-2.5 text-sm rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono outline-none"
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setSettleTarget(null);
                  setSettleAmount("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  settleMutation.mutate({
                    receiptId: settleTarget._id,
                    amount: parseFloat(settleAmount) || undefined,
                  })
                }
                disabled={settleMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 min-h-10"
              >
                {settleMutation.isPending ? "Recording Payment..." : "Confirm Full/Partial Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">
                  Void Receipt {voidTarget.receiptNumber || voidTarget._id}
                </h4>
                <p className="text-xs text-slate-400">
                  Amount: ₦{voidTarget.total.toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Voiding this receipt will update the official register and deduct it from your net sales analytics. Please provide an audit reason for your business records.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Reason for voiding
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer returned goods, wrong item billed, payment canceled..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setVoidTarget(null);
                  setVoidReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  voidMutation.mutate({
                    receiptId: voidTarget._id,
                    reason: voidReason.trim() || "Voided by merchant",
                  })
                }
                disabled={voidMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 min-h-10"
              >
                {voidMutation.isPending ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
