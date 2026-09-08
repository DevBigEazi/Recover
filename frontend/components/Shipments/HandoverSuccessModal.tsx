"use client";

import { CheckCircle, X, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { HandoverResult } from "./types";

interface HandoverSuccessModalProps {
  result: HandoverResult;
  onClose: () => void;
}

export default function HandoverSuccessModal({ result, onClose }: HandoverSuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Custody Handover Logged!
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rider / Driver PIN:{" "}
              <span className="font-mono text-white font-extrabold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                {result.courierPin}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Share dedicated links with the delivery rider/driver and recipient. Riders/drivers use their link to view the recipient manifest, and recipients use theirs to track &amp; verify delivery.
        </p>

        <div className="space-y-3 pt-1">
          {/* Rider Link Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                🛵 1. Delivery Rider / Driver Link
              </span>
              <span className="text-[9px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                Includes PIN ?pin={result.courierPin}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Unlocks Recipient Name, Phone (click-to-call), and Delivery Address on rider/driver&apos;s phone browser without login.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = result.riderPhone ? result.riderPhone.replace(/\D/g, "") : "";
                  const msg = `Hi ${result.riderName || "Rider/Driver"}, here is your Recover delivery manifest link for package: ${result.riderLink} (Rider/Driver PIN: ${result.courierPin})`;
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
                    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  window.open(waUrl, "_blank");
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Rider Link (WhatsApp)
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(result.riderLink);
                  toast.success("Rider/Driver link copied to clipboard!");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Recipient Link Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                📦 2. Recipient Link (Package Customer)
              </span>
              <span className="text-[9px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                {result.courierPin && result.courierPin !== "Not Generated"
                  ? `Includes PIN ?pin=${result.courierPin}`
                  : "Public Scan"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Includes authorization PIN so recipient can view dispatched delivery rider/driver contact info and verify delivery upon arrival.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const msg = `Hi, track your incoming package delivery and contact your dispatched delivery rider/driver here: ${result.recipientLink}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Recipient Link (WhatsApp)
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(result.recipientLink);
                  toast.success("Recipient link copied to clipboard!");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
