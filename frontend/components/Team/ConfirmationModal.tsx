"use client";

import React, { ReactNode } from "react";
import { X, Loader2, AlertCircle, HelpCircle } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  icon?: ReactNode;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  icon,
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  const defaultIcon = isDanger ? (
    <AlertCircle className="w-5 h-5 text-rose-400" />
  ) : (
    <HelpCircle className="w-5 h-5 text-blue-400" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-sm relative animate-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              isDanger
                ? "bg-rose-950/40 border-rose-800/40 text-rose-400"
                : "bg-blue-950/40 border-blue-800/40 text-blue-400"
            }`}
          >
            {icon || defaultIcon}
          </div>
          <div>
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold text-white tracking-tight"
            >
              {title}
            </h3>
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
