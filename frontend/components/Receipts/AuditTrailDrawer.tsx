"use client";

import { IReceipt } from "@/lib/db";
import { X, ShieldCheck, Clock, FileText, UserCheck, AlertCircle, ExternalLink } from "lucide-react";

interface AuditTrailDrawerProps {
  receipt: IReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditTrailDrawer({ receipt, isOpen, onClose }: AuditTrailDrawerProps) {
  if (!isOpen || !receipt) return null;

  const issuedBy = receipt.issuedBy;
  const voidedBy = receipt.voidedBy;
  const settledBy = receipt.settledBy;
  const editHistory = receipt.editHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 text-white h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Permanent Audit Trail</h3>
                <p className="text-xs font-mono text-slate-400">{receipt._id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timeline */}
          <div className="py-6 space-y-6">
            {/* Step 1: Issuance */}
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Receipt Issued</span>
                  <span className="text-[11px] text-slate-400">
                    {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : ""}
                  </span>
                </div>
                <div className="mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div>
                    Recorded by:{" "}
                    <strong className="text-white font-medium">
                      {issuedBy?.name || "Merchant Owner"}
                    </strong>{" "}
                    <span className="text-slate-500 font-mono text-[10px]">
                      ({issuedBy?.role || "owner"})
                    </span>
                  </div>
                  {issuedBy?.branchName && (
                    <div className="text-slate-400">
                      Branch: <span className="text-slate-200">{issuedBy.branchName}</span>
                    </div>
                  )}
                  {issuedBy?.address && (
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Signer: {issuedBy.address}
                    </div>
                  )}
                  <div className="pt-1 text-slate-400">
                    Total: <strong className="text-emerald-400">₦{receipt.total.toLocaleString()}</strong> ({receipt.paymentMethod})
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Edit History */}
            {editHistory.length > 0 && (
              <div className="space-y-4">
                {editHistory.map((edit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Receipt Edited #{idx + 1}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(edit.editedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <div>
                          Modified by:{" "}
                          <strong className="text-white font-medium">{edit.editedBy?.name || "Staff"}</strong>{" "}
                          <span className="text-slate-500 font-mono text-[10px]">
                            ({edit.editedBy?.role})
                          </span>
                        </div>
                        <div className="text-slate-400">{edit.changes}</div>
                        {edit.previousTotal !== undefined && (
                          <div className="text-[11px] text-slate-500">
                            Previous Total: ₦{edit.previousTotal.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Credit Settlement */}
            {settledBy && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">Store Credit Settled</span>
                    <span className="text-[11px] text-slate-400">
                      {receipt.creditSettledAt ? new Date(receipt.creditSettledAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div>
                      Settled by:{" "}
                      <strong className="text-white font-medium">{settledBy.name}</strong>{" "}
                      <span className="text-slate-500 font-mono text-[10px]">({settledBy.role})</span>
                    </div>
                    {settledBy.branchName && (
                      <div className="text-slate-400">Branch: {settledBy.branchName}</div>
                    )}
                    {receipt.creditNotes && (
                      <div className="text-slate-400 text-[11px]">Notes: {receipt.creditNotes}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Void Action */}
            {receipt.status === "Voided" && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400">Receipt Voided</span>
                    <span className="text-[11px] text-slate-400">
                      {receipt.voidedAt ? new Date(receipt.voidedAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-slate-300 space-y-1">
                    <div>
                      Voided by:{" "}
                      <strong className="text-white font-medium">
                        {voidedBy?.name || "Merchant Owner"}
                      </strong>{" "}
                      <span className="text-slate-500 font-mono text-[10px]">
                        ({voidedBy?.role || "owner"})
                      </span>
                    </div>
                    {voidedBy?.branchName && (
                      <div className="text-slate-400">Branch: {voidedBy.branchName}</div>
                    )}
                    <div className="pt-1 text-rose-300 font-medium">
                      Mandatory Reason: &quot;{receipt.voidReason || "No reason recorded"}&quot;
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: On-chain Electroneum Proof */}
            <div className="pt-3 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Electroneum Mainnet Proof</span>
                  <span className="text-emerald-400 font-medium">Anchored</span>
                </div>
                {receipt.onChainTxHash && (
                  <a
                    href={`https://blockexplorer.electroneum.com/tx/${receipt.onChainTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-mono truncate max-w-full"
                  >
                    Tx: {receipt.onChainTxHash.slice(0, 16)}...{receipt.onChainTxHash.slice(-8)}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
                {receipt.receiptHash && (
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    Hash: {receipt.receiptHash}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
export default AuditTrailDrawer;
