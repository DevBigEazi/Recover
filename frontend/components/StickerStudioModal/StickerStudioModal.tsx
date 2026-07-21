"use client";

import { useState } from "react";
import Image from "next/image";

import { STICKER_SIZES } from "@/constants/sticker";

interface StickerItem {
  registrationId: string;
  name: string;
  reward?: string | null;
}

export interface StickerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StickerItem | null;
}

export default function StickerStudioModal({ isOpen, onClose, item }: StickerStudioModalProps) {
  const [selectedSize, setSelectedSize] = useState<"mini" | "standard">("mini");
  const [isDownloadingLabel, setIsDownloadingLabel] = useState(false);

  if (!isOpen || !item) return null;

  const handleDownloadQR = async () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + item.registrationId
    )}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recover-qr-item-${item.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      window.open(qrUrl, "_blank");
    }
  };

  const handleDownloadStickerLabel = async () => {
    setIsDownloadingLabel(true);
    try {
      const config = STICKER_SIZES[selectedSize];
      const scale = 4; // High-DPI scale multiplier for sharp printing
      const w = config.w * scale;
      const h = config.h * scale;
      const qrSize = config.qrSize * scale;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + item.registrationId
      )}`;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to resolve canvas 2d context.");

      // Dynamic text sizing helper to prevent horizontal overflows
      const fillTextFit = (text: string, x: number, y: number, maxW: number, fontStyle: string, baseSizePx: number, fontFamily = "sans-serif") => {
        let sizePx = baseSizePx;
        ctx.font = `${fontStyle} ${sizePx}px ${fontFamily}`;
        while (ctx.measureText(text).width > maxW && sizePx > 6 * scale) {
          sizePx -= 1;
          ctx.font = `${fontStyle} ${sizePx}px ${fontFamily}`;
        }
        ctx.fillText(text, x, y);
      };

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      // Outer border (Indigo)
      ctx.strokeStyle = "#1E2A4A";
      ctx.lineWidth = Math.max(4, Math.round(config.w * 0.03)) * scale;
      const outerPad = Math.max(2, Math.round(config.w * 0.015)) * scale;
      ctx.strokeRect(outerPad, outerPad, w - outerPad * 2, h - outerPad * 2);

      // Inner border (Teal)
      ctx.strokeStyle = "#0EA394";
      ctx.lineWidth = Math.max(1, Math.round(config.w * 0.0075)) * scale;
      const innerPad = Math.max(6, Math.round(config.w * 0.045)) * scale;
      ctx.strokeRect(innerPad, innerPad, w - innerPad * 2, h - innerPad * 2);

      const maxSafeTextWidth = w - innerPad * 2 - 16 * scale;

      // Header text caption - Flashy orange/amber warning
      ctx.fillStyle = "#FF9500";
      ctx.textAlign = "center";
      const capLine1Size = Math.max(8, Math.round(config.w * 0.035)) * scale;
      fillTextFit("This item might be lost.", w / 2, h * 0.1, maxSafeTextWidth, "bold", capLine1Size);

      ctx.fillStyle = "#0EA394";
      const capLine2Size = Math.max(7, Math.round(config.w * 0.026)) * scale;
      fillTextFit("If found, please scan to contact the owner.", w / 2, h * 0.145, maxSafeTextWidth, "normal", capLine2Size);

      // Load QR Code Image
      const qrImg = new window.Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrUrl;
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
      });
      const qrX = (w - qrSize) / 2;
      ctx.drawImage(qrImg, qrX, config.qrY * scale, qrSize, qrSize);

      // Item ID
      ctx.fillStyle = "#6B7280";
      const idFontSize = Math.max(7, Math.round(config.w * 0.0375)) * scale;
      fillTextFit(`ID: #${item.registrationId}`, w / 2, config.idY * scale, maxSafeTextWidth, "bold", idFontSize, "monospace");

      // Reward Banner vs Default SECURED text
      if (item.reward) {
        ctx.fillStyle = "#F5A623";
        ctx.fillRect((w - config.boxW * scale) / 2, config.boxY * scale, config.boxW * scale, config.boxH * scale);

        ctx.fillStyle = "#FFFFFF";
        const rewardFontSize = Math.max(8, Math.round(config.w * 0.04)) * scale;
        fillTextFit(`🎁 REWARD: ${item.reward.toUpperCase()}`, w / 2, config.rewardTextY * scale, config.boxW * scale - 12 * scale, "bold", rewardFontSize);
      } else {
        ctx.fillStyle = "#1E2A4A";
        const securedFontSize = Math.max(7, Math.round(config.w * 0.035)) * scale;
        fillTextFit("Owner Identity Secured in Decentralized Registry", w / 2, config.securedTextY * scale, maxSafeTextWidth, "normal", securedFontSize);
      }

      // Footer
      ctx.fillStyle = "#9CA3AF";
      const footerFontSize = Math.max(6, Math.round(config.w * 0.0275)) * scale;
      fillTextFit("RECOVER PROTOCOL", w / 2, config.footerY * scale, maxSafeTextWidth, "bold", footerFontSize);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `recover-qr-sticker-${item.registrationId}-${selectedSize}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Sticker generation failed, falling back to QR code:", err);
      await handleDownloadQR();
    } finally {
      setIsDownloadingLabel(false);
    }
  };

  const handlePrintSticker = () => {
    const config = STICKER_SIZES[selectedSize];
    const printW = config.printW;
    const qrSize = config.printQrSize;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + item.registrationId
    )}`;

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
            <title>Print QR Sticker</title>
            <style>
              @page {
                size: ${printW}px auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                background: white;
              }
              .sticker {
                width: ${printW}px;
                border: ${Math.max(4, Math.round(printW * 0.03))}px solid #1E2A4A;
                outline: ${Math.max(1, Math.round(printW * 0.0075))}px solid #0EA394;
                outline-offset: -${Math.max(6, Math.round(printW * 0.045))}px;
                padding: ${Math.max(8, Math.round(printW * 0.06))}px;
                box-sizing: border-box;
                text-align: center;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
              }
              .title {
                font-size: ${config.printTitleSize}px;
                font-weight: bold;
                color: #FF9500;
                margin: 0;
                line-height: 1.2;
              }
              .subtitle {
                font-size: ${config.printSubSize}px;
                color: #0EA394;
                margin: 2px 0 0 0;
                line-height: 1.2;
              }
              .qr {
                width: ${qrSize}px;
                height: ${qrSize}px;
                display: block;
              }
              .meta {
                font-size: ${config.printIdSize}px;
                font-family: monospace;
                color: #6B7280;
                font-weight: bold;
                margin: 0;
              }
              .reward-tag {
                background: #F5A623;
                color: white;
                padding: 4px 6px;
                font-weight: bold;
                font-size: ${config.printRewardSize}px;
                width: 90%;
                box-sizing: border-box;
                border-radius: 4px;
                margin: 0 auto;
              }
              .info-sec {
                font-size: ${config.printSecuredSize}px;
                color: #1E2A4A;
                margin: 0;
              }
              .footer {
                font-size: ${config.printFooterSize}px;
                font-weight: bold;
                color: #9CA3AF;
                letter-spacing: 0.5px;
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div>
                <div class="title">This item might be lost.</div>
                <div class="subtitle">If found, please scan to contact the owner.</div>
              </div>
              <img class="qr" src="${qrUrl}" />
              <div class="meta">ID: #${item.registrationId}</div>
              ${
                item.reward
                  ? `<div class="reward-tag">🎁 REWARD: ${item.reward.toUpperCase()}</div>`
                  : `<div class="info-sec">Owner Identity Secured in Decentralized Registry</div>`
              }
              <div class="footer">RECOVER PROTOCOL</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-ink/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg relative space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
          <h3 className="text-lg font-bold text-primary font-display">Sticker Label Studio</h3>
          <button
            onClick={onClose}
            className="text-neutral-slate hover:text-primary text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Size Presets Selection tabs */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-neutral-slate uppercase tracking-wider">
            Select Sticker Print Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STICKER_SIZES) as Array<keyof typeof STICKER_SIZES>).map((sizeKey) => {
              const sizeInfo = STICKER_SIZES[sizeKey];
              const isSelected = selectedSize === sizeKey;
              return (
                <button
                  key={sizeKey}
                  type="button"
                  onClick={() => setSelectedSize(sizeKey)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent/5 text-accent shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 text-neutral-slate bg-neutral-mist/20"
                  }`}
                >
                  <span className="text-[11px] font-bold font-display flex items-center gap-0.5">
                    {sizeInfo.label}
                    {sizeInfo.note && (
                      <span className="text-[8px] bg-accent text-neutral-white px-0.5 py-0.2 rounded-xs font-sans scale-90">
                        ★
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] mt-0.5 opacity-80">{sizeInfo.desc}</span>
                  {sizeInfo.note && (
                    <span className="text-[8px] mt-0.5 text-accent font-semibold uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticker Preview Container Wrapper */}
        <div className="flex justify-center py-2">
          <div
            id="sticker-print-area"
            className={`border-8 border-primary outline-2 outline-accent outline-offset-[-9px] text-center bg-neutral-white flex flex-col items-center shadow-md select-none transition-all duration-200 ${
              selectedSize === "mini"
                ? "w-45 p-2 gap-2"
                : selectedSize === "standard"
                ? "w-60 p-3 pb-2.5 gap-3"
                : "w-[320px] p-4 pb-3 gap-4"
            }`}
          >
            <div className="space-y-0.5 mt-1">
              <div className={`font-extrabold text-[#FF9500] font-display leading-tight ${
                selectedSize === "mini" ? "text-[9px]" : selectedSize === "standard" ? "text-[11px]" : "text-[14px]"
              }`}>
                This item might be lost.
              </div>
              <div className={`text-accent leading-tight font-medium ${
                selectedSize === "mini" ? "text-[7px]" : selectedSize === "standard" ? "text-[8px]" : "text-[10px]"
              }`}>
                If found, please scan to contact the owner.
              </div>
            </div>
            <div className="p-1 rounded-sm border border-neutral-mist bg-neutral-white">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(
                  window.location.origin + "/verify/" + item.registrationId
                )}`}
                alt="QR Sticker Code"
                width={selectedSize === "mini" ? 100 : selectedSize === "standard" ? 140 : 180}
                height={selectedSize === "mini" ? 100 : selectedSize === "standard" ? 140 : 180}
                unoptimized
              />
            </div>
            <div className="space-y-1">
              <div className={`font-mono font-bold text-neutral-slate leading-none ${
                selectedSize === "mini" ? "text-[8px]" : selectedSize === "standard" ? "text-[10px]" : "text-[12px]"
              }`}>
                ID: #{item.registrationId}
              </div>
              {item.reward ? (
                <div className={`bg-warning text-neutral-white px-2 py-0.5 rounded-xs font-bold uppercase leading-none ${
                  selectedSize === "mini" ? "text-[8px]" : selectedSize === "standard" ? "text-[10px]" : "text-[12px]"
                }`}>
                  🎁 REWARD OFFERED
                </div>
              ) : (
                <div className={`text-primary leading-none font-medium ${
                  selectedSize === "mini" ? "text-[8px]" : selectedSize === "standard" ? "text-[9px]" : "text-[11px]"
                }`}>
                  Identity Secured in Decentralized Registry
                </div>
              )}
            </div>
            <div className={`font-extrabold text-gray-400 tracking-wider uppercase ${
              selectedSize === "mini" ? "text-[6px]" : selectedSize === "standard" ? "text-[7px]" : "text-[9px]"
            }`}>
              RECOVER PROTOCOL
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadStickerLabel}
            disabled={isDownloadingLabel}
            className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-semibold py-3 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isDownloadingLabel ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Composing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PNG</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrintSticker}
            className="bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
