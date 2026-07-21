"use client";

import { useState } from "react";
import Image from "next/image";
import { Printer, CheckSquare, Square, X } from "lucide-react";
import { STICKER_SIZES, StickerSizeKey } from "@/constants/sticker";

export interface BatchItem {
  registrationId: string;
  name: string;
  reward?: string | null;
  category?: string | null;
}

export interface BatchStickerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchItem[];
}

export default function BatchStickerStudioModal({
  isOpen,
  onClose,
  items,
}: BatchStickerStudioModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    items.map((i) => i.registrationId)
  );
  const [selectedSize, setSelectedSize] = useState<StickerSizeKey>("mini");

  if (!isOpen) return null;

  const selectedItems = items.filter((item) =>
    selectedIds.includes(item.registrationId)
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.registrationId));
    }
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrintA4Sheet = () => {
    if (selectedItems.length === 0) return;

    const sizeConfig = STICKER_SIZES[selectedSize];

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to open the print sheet dialog.");
      return;
    }

    const stickerHtml = selectedItems
      .map((item) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${sizeConfig.printQrSize * 2}x${sizeConfig.printQrSize * 2}&margin=10&data=${encodeURIComponent(
          window.location.origin + "/verify/" + item.registrationId
        )}`;

        return `
          <div class="sticker">
            <div>
              <div class="title">This item might be lost.</div>
              <div class="subtitle">If found, please scan to contact the owner.</div>
            </div>
            <img class="qr" src="${qrUrl}" alt="QR Code" />
            <div class="meta">ID: #${item.registrationId}</div>
            ${
              item.reward
                ? `<div class="reward-tag">🎁 REWARD: ${item.reward.toUpperCase()}</div>`
                : `<div class="info-sec">Owner Identity Secured in Decentralized Registry</div>`
            }
            <div class="footer">RECOVER PROTOCOL</div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Multi-Item A4 Sticker Sheet</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #ffffff;
              color: #1E2A4A;
              margin: 0;
              padding: 0;
            }
            .a4-page {
              width: 100%;
              box-sizing: border-box;
            }
            .page-title-banner {
              text-align: center;
              font-size: 10px;
              color: #64748b;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .grid-container {
              display: grid;
              grid-template-columns: ${sizeConfig.printGridCols};
              gap: 16px;
              justify-content: center;
            }
            .sticker {
              width: ${sizeConfig.printW}px;
              border: ${Math.max(3, Math.round(sizeConfig.printW * 0.03))}px solid #1E2A4A;
              outline: ${Math.max(1, Math.round(sizeConfig.printW * 0.0075))}px solid #0EA394;
              outline-offset: -${Math.max(5, Math.round(sizeConfig.printW * 0.045))}px;
              padding: ${Math.max(6, Math.round(sizeConfig.printW * 0.05))}px;
              box-sizing: border-box;
              text-align: center;
              background: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              gap: 6px;
              break-inside: avoid;
              margin: 0 auto;
            }
            .title {
              font-size: ${sizeConfig.printTitleSize}px;
              font-weight: bold;
              color: #FF9500;
              margin: 0;
              line-height: 1.2;
            }
            .subtitle {
              font-size: ${sizeConfig.printSubSize}px;
              color: #0EA394;
              margin: 2px 0 0 0;
              line-height: 1.2;
            }
            .qr {
              width: ${sizeConfig.printQrSize}px;
              height: ${sizeConfig.printQrSize}px;
              display: block;
              margin: 0 auto;
            }
            .meta {
              font-size: ${sizeConfig.printIdSize}px;
              font-family: monospace;
              color: #6B7280;
              font-weight: bold;
              margin: 0;
            }
            .reward-tag {
              background: #F5A623;
              color: white;
              padding: 2px 4px;
              font-weight: bold;
              font-size: ${sizeConfig.printRewardSize}px;
              width: 92%;
              box-sizing: border-box;
              border-radius: 3px;
              margin: 0 auto;
            }
            .info-sec {
              font-size: ${sizeConfig.printSecuredSize}px;
              color: #1E2A4A;
              margin: 0;
              line-height: 1.1;
            }
            .footer {
              font-size: ${sizeConfig.printFooterSize}px;
              font-weight: bold;
              color: #9CA3AF;
              letter-spacing: 0.5px;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            <div class="page-title-banner">
              ✂️ <strong>RECOVER A4 MULTI-ITEM STICKER SHEET</strong> — Cut out stickers along solid borders & attach to your valuables.
            </div>
            <div class="grid-container">
              ${stickerHtml}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto max-h-[92vh] overflow-y-auto animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-neutral-mist pb-3 sm:pb-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-xl font-bold text-primary font-display">
                Multi-Item Batch Sticker Studio (A4 Sheet)
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-slate">
              Real-world print shop efficiency: Print stickers for up to 12 valuables on a single A4 adhesive sheet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-slate hover:text-primary rounded-lg hover:bg-neutral-mist transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-neutral-mist/30 p-3.5 sm:p-4 rounded-xl border border-neutral-mist">
          {/* Select Size Preset */}
          <div className="space-y-2">
            <label className="block text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wider">
              1. Choose Sticker Size Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STICKER_SIZES) as Array<StickerSizeKey>).map((sizeKey) => {
                const s = STICKER_SIZES[sizeKey];
                const isSelected = selectedSize === sizeKey;
                return (
                  <button
                    key={sizeKey}
                    type="button"
                    onClick={() => setSelectedSize(sizeKey)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-neutral-white border-primary shadow-xs"
                        : "bg-neutral-white text-primary border-gray-200 hover:border-accent"
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className={`text-[9px] sm:text-[10px] ${isSelected ? "text-neutral-white/80" : "text-neutral-slate"}`}>
                      {s.desc}
                    </div>
                    {s.note && (
                      <div className="text-[8px] sm:text-[9px] font-bold mt-0.5 text-accent leading-none">
                        {s.note}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wider">
                2. Select Items to Include ({selectedIds.length}/{items.length})
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[10px] sm:text-[11px] text-accent font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {selectedIds.length === items.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All ({items.length})</span>
                  </>
                )}
              </button>
            </div>

            <div className="max-h-28 overflow-y-auto bg-neutral-white border border-gray-200 rounded-xl p-2 space-y-1">
              {items.map((i) => {
                const isChecked = selectedIds.includes(i.registrationId);
                return (
                  <label
                    key={i.registrationId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-mist cursor-pointer text-xs select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(i.registrationId)}
                      className="accent-accent"
                    />
                    <span className="font-semibold text-primary truncate flex-1">{i.name}</span>
                    <span className="font-mono text-[10px] text-neutral-slate">ID: {i.registrationId}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Printable Grid Sheet Preview */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wider">
              A4 Sticker Sheet Live Preview ({selectedItems.length} Stickers Grid)
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-slate">
              ✂️ Preserving original sticker design lockup
            </span>
          </div>

          <div className="bg-neutral-white border-2 border-dashed border-neutral-mist rounded-xl p-3 sm:p-6 max-h-72 sm:max-h-80 overflow-y-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[16px_16px]">
            {selectedItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-slate">
                Please select at least one registered item above to build your A4 sheet.
              </div>
            ) : (
              <div className={`grid ${STICKER_SIZES[selectedSize].gridCols} gap-3 sm:gap-4`}>
                {selectedItems.map((item) => (
                  <div
                    key={item.registrationId}
                    className="border-4 border-primary outline-2 outline-accent outline-offset-[-6px] p-2.5 sm:p-3 text-center bg-neutral-white flex flex-col items-center gap-2 shadow-xs select-none"
                  >
                    <div className="space-y-0.5 mt-0.5">
                      <div className="font-extrabold text-[#FF9500] font-display text-[9px] leading-tight">
                        This item might be lost.
                      </div>
                      <div className="text-accent text-[7px] leading-tight font-medium">
                        If found, please scan to contact the owner.
                      </div>
                    </div>

                    <div className="p-0.5 rounded-xs border border-neutral-mist bg-neutral-white">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=10&data=${encodeURIComponent(
                          typeof window !== "undefined"
                            ? window.location.origin + "/verify/" + item.registrationId
                            : "https://recover.id/verify/" + item.registrationId
                        )}`}
                        alt={`QR code sticker for ${item.name}`}
                        width={70}
                        height={70}
                        unoptimized
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-mono font-bold text-neutral-slate text-[8px] leading-none">
                        ID: #{item.registrationId}
                      </div>
                      {item.reward ? (
                        <div className="bg-warning text-neutral-white px-1.5 py-0.5 rounded-xs font-bold uppercase text-[7px] leading-none">
                          🎁 REWARD OFFERED
                        </div>
                      ) : (
                        <div className="text-primary text-[7px] leading-none font-medium">
                          Identity Secured in Decentralized Registry
                        </div>
                      )}
                    </div>

                    <div className="font-extrabold text-gray-400 text-[6px] tracking-wider uppercase">
                      RECOVER PROTOCOL
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-2 border-t border-neutral-mist">
          <div className="text-[11px] sm:text-xs text-neutral-slate text-center sm:text-left">
            💡 Pro-Tip: Use <strong>A4 sticker adhesive paper</strong> in your printer or press.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial bg-neutral-mist hover:bg-neutral-mist/80 text-primary font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrintA4Sheet}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-initial bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-bold px-5 sm:px-6 py-2.5 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Full A4 Sheet ({selectedItems.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
