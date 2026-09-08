"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Shipment } from "./types";
import { formatTrackingCode } from "@/lib/format";

interface StickerDownloadModalProps {
  shipment: Shipment;
  createdInnerSecret?: string | null;
  onClose: () => void;
}

export default function StickerDownloadModal({
  shipment,
  createdInnerSecret,
  onClose,
}: StickerDownloadModalProps) {
  const [stickerSize, setStickerSize] = useState<"mini" | "standard" | "large">("mini");

  const handlePrintSticker = () => {
    const scanUrl = `${window.location.origin}/scan/${shipment.trackingCode || formatTrackingCode(shipment._id)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=4&data=${encodeURIComponent(scanUrl)}`;
    const idStr = shipment._id ? String(shipment._id) : "";
    const activePin =
      shipment.innerSecret ||
      createdInnerSecret ||
      ("RCVR-" + (idStr.startsWith("0x") ? idStr.slice(2, 10) : idStr.slice(0, 8) || "SECURE")).toUpperCase();

    const widthMap = {
      mini: "280px",
      standard: "360px",
      large: "460px",
    };
    const qrBoxMap = {
      mini: "140px",
      standard: "180px",
      large: "230px",
    };
    const headerFontMap = {
      mini: "9px",
      standard: "10px",
      large: "12px",
    };
    const pinFontMap = {
      mini: "15px",
      standard: "18px",
      large: "22px",
    };

    const targetWidth = widthMap[stickerSize] || "360px";
    const targetQrBox = qrBoxMap[stickerSize] || "180px";
    const targetHeaderFont = headerFontMap[stickerSize] || "10px";
    const targetPinFont = pinFontMap[stickerSize] || "18px";

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Shipment Label - ${shipment.trackingCode || formatTrackingCode(shipment._id)}</title>
            <style>
              @page { size: auto; margin: 0; }
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
              }
              body {
                margin: 0;
                padding: 24px;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .sticker {
                width: ${targetWidth};
                border: 4px solid #0F172A;
                text-align: center;
                box-sizing: border-box;
                background: linear-gradient(180deg, #E8ECF0 0%, #D1D5DB 50%, #C4C9CF 100%) !important;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .holo-pattern {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: repeating-linear-gradient(45deg, rgba(180, 200, 220, 0.15), rgba(180, 200, 220, 0.15) 2px, transparent 2px, transparent 18px);
              }
              .header {
                background: #0F172A !important;
                color: white !important;
                font-size: ${targetHeaderFont};
                font-weight: bold;
                padding: 10px 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                letter-spacing: 0.3px;
                -webkit-print-color-adjust: exact !important;
              }
              .header img { width: 18px; height: 18px; object-fit: contain; }
              .body-content { padding: 14px 16px 10px; position: relative; z-index: 1; }
              .delivery-badge { font-size: 10px; font-weight: bold; color: #1E293B; text-align: center; margin-bottom: 4px; }
              .scan-label { font-size: 9px; font-weight: bold; color: #475569; margin-bottom: 10px; text-align: center; }
              .qr-box {
                width: ${targetQrBox};
                height: ${targetQrBox};
                background: white !important;
                border: 3px solid #1E293B;
                padding: 6px;
                box-sizing: border-box;
                margin: 0 auto 10px auto;
                -webkit-print-color-adjust: exact !important;
              }
              .qr-img { width: 100%; height: 100%; object-fit: contain; }
              .shield { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 4px auto 8px auto; }
              .shield-icon { font-size: 16px; }
              .shield-text { font-size: 10px; font-weight: bold; color: #0F172A; }
              .realtime { font-size: 9px; font-weight: bold; color: #475569; letter-spacing: 0.5px; margin: 6px 0 2px; }
              .tracking { font-size: 14px; font-weight: bold; font-family: monospace; color: #0F172A; margin: 4px 0 8px; }
              .divider { border-top: 1.5px dashed #94A3B8; margin: 0 20px; }
              .scratch-zone {
                background: #FFFFFF !important;
                margin: 10px 20px;
                padding: 16px 10px;
                border: 2px dashed #94A3B8;
                position: relative;
                border-radius: 4px;
                -webkit-print-color-adjust: exact !important;
              }
              .scratch-text { font-size: ${targetPinFont}; font-weight: bold; font-family: monospace; color: #0F172A; }
              .scratch-label { font-size: 9px; font-weight: bold; color: #0F172A; margin: 8px 0 6px; letter-spacing: 0.3px; }
              .side-warn { writing-mode: vertical-rl; text-orientation: mixed; position: absolute; font-size: 8px; font-weight: bold; color: #64748B; letter-spacing: 0.3px; z-index: 2; }
              .side-warn.left { left: 6px; top: 50%; transform: translateY(-50%) rotate(180deg); }
              .side-warn.right { right: 6px; top: 50%; transform: translateY(-50%); }
              .footer { background: #0F172A !important; color: white !important; font-size: 9px; font-weight: bold; padding: 7px 12px; letter-spacing: 0.4px; -webkit-print-color-adjust: exact !important; }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div class="holo-pattern"></div>
              <div class="header">
                <img src="${window.location.origin}/icon-192.png" alt="Recover Logo" />
                <span>PREMIUM TAMPER-PROOF SECURITY LABEL BY https://userecover.xyz</span>
              </div>
              <span class="side-warn left">DO NOT ACCEPT IF SEAL IS BROKEN</span>
              <span class="side-warn right">DO NOT ACCEPT IF SEAL IS BROKEN</span>
              <div class="body-content">
                <div class="delivery-badge">📍 DELIVERY TRACKING</div>
                <div class="scan-label">SCAN TO TRACK / HANDOVER</div>
                <div class="qr-box">
                  <img class="qr-img" src="${qrUrl}" />
                </div>
                <div class="shield">
                  <span class="shield-icon">🛡️</span>
                  <span class="shield-text">SECURE SHIP</span>
                </div>
                <div class="realtime">SCANNABLE FOR REAL-TIME TRACKING</div>
                <div class="tracking">${shipment.trackingCode || formatTrackingCode(shipment._id)}</div>
              </div>
              <div class="divider"></div>
              <div class="scratch-zone">
                <div class="scratch-text">${activePin}</div>
              </div>
              <div class="scratch-label">SCRATCH-OFF GENTLY</div>
              <div class="footer">RECOVER TRACK · OFFICIAL LOGISTICS SEAL</div>
            </div>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  const previewWidthMap = { mini: "max-w-[240px]", standard: "max-w-[290px]", large: "max-w-[340px]" };
  const previewWidthClass = previewWidthMap[stickerSize] || "max-w-[290px]";
  const activePinModal = shipment.innerSecret || createdInnerSecret || "RCVR-PROTECTED";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">Print Security Label Sticker</h3>
            <p className="text-[11px] text-slate-400">Select dimension size and print official security sticker.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-400">Dimensions Selection</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStickerSize("mini")}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                stickerSize === "mini"
                  ? "bg-blue-600/10 border-blue-500 text-blue-400"
                  : "border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              Mini (~10mm) <span className="block text-[9px] text-slate-500 font-normal">(Recommended)</span>
            </button>
            <button
              type="button"
              onClick={() => setStickerSize("standard")}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                stickerSize === "standard"
                  ? "bg-blue-600/10 border-blue-500 text-blue-400"
                  : "border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              Standard (~25mm)
            </button>
            <button
              type="button"
              onClick={() => setStickerSize("large")}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                stickerSize === "large"
                  ? "bg-blue-600/10 border-blue-500 text-blue-400"
                  : "border-slate-800 hover:border-slate-700 text-slate-400"
              }`}
            >
              Large (~50mm)
            </button>
          </div>
        </div>

        {/* Sticker Preview — Tamper-Proof Design */}
        <div
          className={`border border-slate-700 rounded-xl overflow-hidden mx-auto transition-all duration-300 ${previewWidthClass}`}
          style={{ background: "linear-gradient(180deg, #E8ECF0 0%, #D1D5DB 50%, #C4C9CF 100%)" }}
        >
          {/* Header bar */}
          <div className="bg-slate-900 text-white text-[7px] font-bold text-center py-1.5 px-2 flex items-center justify-center gap-1.5 tracking-wider">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Recover Logo" className="w-3 h-3 object-contain shrink-0" />
            <span>PREMIUM TAMPER-PROOF SECURITY LABEL BY https://userecover.xyz</span>
          </div>

          {/* Body */}
          <div className="p-2.5 relative text-center">
            {/* Side warnings */}
            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[5.5px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
              DO NOT ACCEPT IF SEAL IS BROKEN
            </div>
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 rotate-90 origin-center text-[5.5px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
              DO NOT ACCEPT IF SEAL IS BROKEN
            </div>

            {/* Delivery tracking badge */}
            <div className="text-[7.5px] font-bold text-slate-800 text-center mb-0.5">📍 DELIVERY TRACKING</div>
            <div className="text-[6.5px] font-bold text-slate-500 text-center mb-1.5">SCAN TO TRACK / HANDOVER</div>

            {/* Centered QR Code Box */}
            <div className="w-28 h-28 bg-white border-2 border-slate-800 p-1 mx-auto mb-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/scan/${shipment.trackingCode || formatTrackingCode(shipment._id)}`
                )}`}
                alt="Package QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Side-by-side Shield Badge */}
            <div className="flex items-center justify-center gap-1 mx-auto mb-1.5">
              <span className="text-sm">🛡️</span>
              <span className="text-[7.5px] font-extrabold text-slate-800 tracking-wide">SECURE SHIP</span>
            </div>

            {/* Scannable label */}
            <div className="text-[6.5px] font-bold text-slate-500 tracking-wider text-center mb-0.5">SCANNABLE FOR REAL-TIME TRACKING</div>

            {/* Tracking code */}
            <div className="text-[10px] font-mono font-extrabold text-slate-900 text-center mb-1.5">
              {shipment.trackingCode || formatTrackingCode(shipment._id)}
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-slate-400 mx-2 mb-1.5" />

            {/* Secret PIN Zone */}
            <div className="bg-white border-2 border-dashed border-slate-400 mx-2 py-2 text-center rounded-sm select-none pointer-events-none">
              <div className="text-[10px] font-mono font-extrabold text-slate-900 select-none">
                {activePinModal}
              </div>
            </div>
            <div className="text-[6px] font-bold text-slate-800 text-center mt-1 tracking-wider select-none">SCRATCH-OFF GENTLY</div>
          </div>

          {/* Footer bar */}
          <div className="bg-slate-900 text-white text-[6.5px] font-bold text-center py-1 tracking-wider">
            RECOVER TRACK · OFFICIAL LOGISTICS SEAL
          </div>
        </div>

        {/* Merchant Action Required Banner — Security Protected */}
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 text-center space-y-1.5 select-none">
          <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Merchant Notice</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-normal font-medium">
            Print this label onto package, then <strong className="text-amber-300 underline">manually apply a physical scratch-off overlay sticker</strong> over the Secret Verification PIN area before dispatch.
          </p>
          <div className="text-[10px] font-semibold text-amber-300/80">
            🔒 PIN copying &amp; text selection are disabled for security.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrintSticker}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2.5 rounded-xl text-white transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
