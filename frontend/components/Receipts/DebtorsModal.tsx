"use client";

import React, { useState } from "react";
import { X, Search, Phone, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export interface DebtorCustomer {
  customerName: string;
  customerPhone: string;
  totalOwed: number;
  receiptsCount: number;
  receiptNumbers: string[];
  latestDate: string | Date;
  dueDate: string | Date | null;
  soldBy?: string;
  soldByRole?: string | null;
  branchName?: string | null;
}

interface DebtorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtors: DebtorCustomer[];
  totalCreditOwed: number;
  ownerAddress?: string;
  onSettleSuccess: () => void;
}

export default function DebtorsModal({
  isOpen,
  onClose,
  debtors,
  totalCreditOwed,
  ownerAddress,
  onSettleSuccess,
}: DebtorsModalProps) {
  const [search, setSearch] = useState("");
  const [settleTarget, setSettleTarget] = useState<DebtorCustomer | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [isSettling, setIsSettling] = useState(false);

  if (!isOpen) return null;

  const filteredDebtors = debtors.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.customerName.toLowerCase().includes(q) ||
      d.customerPhone.toLowerCase().includes(q)
    );
  });

  const handleOpenSettle = (debtor: DebtorCustomer) => {
    setSettleTarget(debtor);
    setSettleAmount(String(debtor.totalOwed));
  };

  const handleConfirmSettle = async () => {
    if (!settleTarget || !ownerAddress) return;
    if (settleTarget.receiptNumbers.length === 0) {
      toast.error("No receipt found for this customer debt.");
      return;
    }

    setIsSettling(true);
    try {
      const receiptId = settleTarget.receiptNumbers[0];
      const parsedAmount = parseFloat(settleAmount);

      const res = await fetch(`/api/v1/receipts/${encodeURIComponent(receiptId)}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": ownerAddress,
        },
        body: JSON.stringify({
          amountSettled: isNaN(parsedAmount) ? undefined : parsedAmount,
          notes: `Settlement recorded from Debtors Ledger for ${settleTarget.customerName}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to settle payment");
      }

      const result = await res.json();
      toast.success(result.message || "Customer payment recorded successfully!");
      setSettleTarget(null);
      onSettleSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error settling debt.");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Customer Debtors Ledger
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Tracking customers who bought on Store Credit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Owed Summary Strip */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span>Active Debts: </span>
            <span className="text-white font-bold">{debtors.length} customers</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Outstanding</span>
            <span className="text-base sm:text-lg font-black text-blue-400 font-mono">
              ₦{totalCreditOwed.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Debtors List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredDebtors.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
              <p className="text-xs font-semibold text-slate-300">
                {search ? "No matching debtors found" : "No outstanding customer debts!"}
              </p>
              <p className="text-[11px] text-slate-500">
                {search ? "Try a different search term" : "All customer credit accounts are settled."}
              </p>
            </div>
          ) : (
            filteredDebtors.map((debtor, idx) => (
              <div
                key={`${debtor.customerPhone}-${idx}`}
                className="p-3 sm:p-3.5 bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {debtor.customerName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold">
                      {debtor.receiptsCount} {debtor.receiptsCount === 1 ? "sale" : "sales"}
                    </span>
                  </div>

                  {debtor.soldBy && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <span className="text-slate-500 font-medium">Sold by:</span>
                      <span className="font-semibold text-slate-200">
                        {debtor.soldBy}
                      </span>
                      {debtor.branchName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {debtor.branchName}
                        </span>
                      )}
                    </div>
                  )}

                  {debtor.customerPhone && debtor.customerPhone !== "No Phone" && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <a
                        href={`tel:${debtor.customerPhone}`}
                        className="hover:text-blue-400 hover:underline"
                      >
                        {debtor.customerPhone}
                      </a>
                    </div>
                  )}

                  {debtor.dueDate && (
                    <div className="text-[10px] text-slate-500">
                      Due: {new Date(debtor.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <div className="sm:text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Amount Owed</div>
                    <div className="text-xs sm:text-sm font-black text-blue-400 font-mono">
                      ₦{debtor.totalOwed.toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenSettle(debtor)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Settle Confirmation Dialog */}
      {settleTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Record Debt Settlement</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Recording payment from <span className="text-white font-bold">{settleTarget.customerName}</span>. Total owed:{" "}
              <span className="text-blue-400 font-bold font-mono">₦{settleTarget.totalOwed.toLocaleString()}</span>.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">
                Amount Paid (₦)
              </label>
              <input
                type="number"
                min="1"
                max={settleTarget.totalOwed}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleTarget(null)}
                disabled={isSettling}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={isSettling}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSettling ? "Recording..." : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
