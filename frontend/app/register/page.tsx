"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { useActiveAccount } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";

const STICKER_SIZES = {
  mini: {
    label: "Mini",
    desc: "~10mm × 10mm",
    note: "(Recommended)",
    w: 160, h: 175, qrSize: 90, qrY: 34, idY: 125,
    boxY: 138, boxW: 120, boxH: 14,
    rewardTextY: 148, securedTextY: 146, footerY: 160,
    printW: 120, printH: 135, printTitleSize: 9, printSubSize: 6,
    printQrSize: 80, printIdSize: 7, printRewardSize: 8,
    printSecuredSize: 7, printFooterSize: 6,
  },
  standard: {
    label: "Standard",
    desc: "~25mm × 25mm",
    note: "",
    w: 280, h: 300, qrSize: 160, qrY: 60, idY: 212,
    boxY: 230, boxW: 220, boxH: 22,
    rewardTextY: 244, securedTextY: 242, footerY: 274,
    printW: 180, printH: 200, printTitleSize: 12, printSubSize: 8,
    printQrSize: 120, printIdSize: 10, printRewardSize: 10,
    printSecuredSize: 9, printFooterSize: 7,
  },
  large: {
    label: "Large",
    desc: "~50mm × 50mm",
    note: "",
    w: 520, h: 560, qrSize: 300, qrY: 110, idY: 398,
    boxY: 432, boxW: 410, boxH: 42,
    rewardTextY: 458, securedTextY: 455, footerY: 512,
    printW: 300, printH: 330, printTitleSize: 18, printSubSize: 12,
    printQrSize: 200, printIdSize: 13, printRewardSize: 14,
    printSecuredSize: 12, printFooterSize: 10,
  },
};

export default function RegisterPage() {
  const account = useActiveAccount();
  const { openLogin } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [reward, setReward] = useState("");
  const [contact, setContact] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("Other");
  const [alternateContact, setAlternateContact] = useState("");
  const [secrets, setSecrets] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [rewardType, setRewardType] = useState("none"); // none, undisclosed, custom

  // File Upload states
  const [receiptBase64, setReceiptBase64] = useState("");
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);
  const [imageBase64, setImageBase64] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);

  // UI/Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    qrUrl: string;
    itemHash: string;
  } | null>(null);

  // Sticker size selection state
  const [selectedSize, setSelectedSize] = useState<"mini" | "standard" | "large">("mini");
  const [isDownloadingLabel, setIsDownloadingLabel] = useState(false);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Generate random PIN on mount
  useEffect(() => {
    setPassphrase(Math.floor(100000 + Math.random() * 900000).toString());
  }, []);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingReceipt(true);
    setError(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setReceiptBase64(reader.result as string);
      setIsReadingReceipt(false);
    };
    reader.onerror = (err) => {
      console.error(err);
      setError("Failed to read receipt file.");
      setIsReadingReceipt(false);
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingImage(true);
    setError(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        setImageBase64(dataUrl);
        setIsReadingImage(false);
      };
      img.onerror = () => {
        setError("Failed to process image.");
        setIsReadingImage(false);
      };
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      setIsReadingImage(false);
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!name.trim()) {
      setError("Item Name is required.");
      return;
    }
    if (category === "Phone" && !alternateContact.trim()) {
      setError("Trusted alternate contact is required for mobile devices.");
      return;
    }
    setError(null);
    setShowConfirmModal(true);
  };

  const executeRegistration = async () => {
    if (!account) return;
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Submit metadata to backend relayer route
      const response = await fetch("/api/items/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: account.address,
          name: name.trim(),
          brand: brand.trim(),
          serial: serial.trim(),
          reward: rewardType === "custom" ? reward.trim() : "",
          contactInfo: contact.trim(),
          instructions: instructions.trim(),
          category,
          alternateContact: category === "Phone" || alternateContact.trim() ? alternateContact.trim() : "",
          receiptData: receiptBase64,
          secrets: secrets.trim(),
          passphrase: passphrase.trim(),
          rewardType,
          image: imageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save item details.");
      }

      const itemData = await response.json();

      // 2. Set success details & generate QR URL
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + itemData.registrationId
      )}`;

      setSuccessData({
        registrationId: itemData.registrationId,
        qrUrl: qrDataUrl,
        itemHash: itemData.itemHash,
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!successData) return;
    try {
      const response = await fetch(successData.qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recover-qr-item-${successData.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      window.open(successData.qrUrl, "_blank");
    }
  };

  // High-DPI Sticker Label download — matches StickerStudioModal canvas engine
  const handleDownloadStickerLabel = async () => {
    if (!successData) return;
    setIsDownloadingLabel(true);
    try {
      const config = STICKER_SIZES[selectedSize as keyof typeof STICKER_SIZES];
      const scale = 4; // High-DPI multiplier for crisp printing
      const w = config.w * scale;
      const h = config.h * scale;
      const qrSize = config.qrSize * scale;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + successData.registrationId
      )}`;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to resolve canvas 2d context.");

      // Dynamic text sizing helper to prevent horizontal overflows
      const fillTextFit = (
        text: string,
        x: number,
        y: number,
        maxW: number,
        fontStyle: string,
        baseSizePx: number,
        fontFamily = "sans-serif"
      ) => {
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

      // Header caption — amber warning
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

      // Registration ID
      ctx.fillStyle = "#6B7280";
      const idFontSize = Math.max(7, Math.round(config.w * 0.0375)) * scale;
      fillTextFit(`ID: #${successData.registrationId}`, w / 2, config.idY * scale, maxSafeTextWidth, "bold", idFontSize, "monospace");

      // Reward Banner or Secured text
      if (reward && rewardType === "custom") {
        ctx.fillStyle = "#F5A623";
        ctx.fillRect((w - config.boxW * scale) / 2, config.boxY * scale, config.boxW * scale, config.boxH * scale);
        ctx.fillStyle = "#FFFFFF";
        const rewardFontSize = Math.max(8, Math.round(config.w * 0.04)) * scale;
        fillTextFit(`🎁 REWARD: ${reward.toUpperCase()}`, w / 2, config.rewardTextY * scale, config.boxW * scale - 12 * scale, "bold", rewardFontSize);
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
      a.download = `recover-qr-sticker-${successData.registrationId}-${selectedSize}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Sticker generation failed, falling back to QR download:", err);
      await handleDownloadQR();
    } finally {
      setIsDownloadingLabel(false);
    }
  };

  // Print Sticker via hidden iframe — matches StickerStudioModal print engine
  const handlePrintSticker = () => {
    if (!successData) return;
    const config = STICKER_SIZES[selectedSize as keyof typeof STICKER_SIZES];
    const printW = config.printW;
    const qrSize = config.printQrSize;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&data=${encodeURIComponent(
      window.location.origin + "/verify/" + successData.registrationId
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
              @page { size: ${printW}px auto; margin: 0; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; background: white; }
              .sticker {
                width: ${printW}px;
                border: ${Math.max(4, Math.round(printW * 0.03))}px solid #1E2A4A;
                outline: ${Math.max(1, Math.round(printW * 0.0075))}px solid #0EA394;
                outline-offset: -${Math.max(6, Math.round(printW * 0.045))}px;
                padding: ${Math.max(8, Math.round(printW * 0.06))}px;
                box-sizing: border-box; text-align: center; background: white;
                display: flex; flex-direction: column; align-items: center; gap: 10px;
              }
              .title { font-size: ${config.printTitleSize}px; font-weight: bold; color: #FF9500; margin: 0; line-height: 1.2; }
              .subtitle { font-size: ${config.printSubSize}px; color: #0EA394; margin: 2px 0 0 0; line-height: 1.2; }
              .qr { width: ${qrSize}px; height: ${qrSize}px; display: block; }
              .meta { font-size: ${config.printIdSize}px; font-family: monospace; color: #6B7280; font-weight: bold; margin: 0; }
              .reward-tag { background: #F5A623; color: white; padding: 4px 6px; font-weight: bold; font-size: ${config.printRewardSize}px; width: 90%; box-sizing: border-box; border-radius: 4px; margin: 0 auto; }
              .info-sec { font-size: ${config.printSecuredSize}px; color: #1E2A4A; margin: 0; }
              .footer { font-size: ${config.printFooterSize}px; font-weight: bold; color: #9CA3AF; letter-spacing: 0.5px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div>
                <div class="title">This item might be lost.</div>
                <div class="subtitle">If found, please scan to contact the owner.</div>
              </div>
              <img class="qr" src="${qrUrl}" />
              <div class="meta">ID: #${successData.registrationId}</div>
              ${reward && rewardType === "custom"
                ? `<div class="reward-tag">&#127873; REWARD: ${reward.toUpperCase()}</div>`
                : `<div class="info-sec">Owner Identity Secured in Decentralized Registry</div>`
              }
              <div class="footer">RECOVER PROTOCOL</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.parent.document.body.removeChild(window.frameElement); }, 500);
              }
            ${"<"}/script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-4xl">
            Register New Item
          </h1>
          <p className="mt-2 text-md text-neutral-slate max-w-lg mx-auto">
            Secure your valuables on the blockchain registry. Your sensitive information is kept private off-chain, and we generate a printable QR sticker for physical recovery.
          </p>
        </div>

        {/* Not Connected State */}
        {!account ? (
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 text-center max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary font-display mb-2">Sign In to Continue</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Sign in to register and manage your items.
            </p>
            <div className="flex justify-center">
              <button
                onClick={openLogin}
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors shadow-xs cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        ) : !successData ? (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Item Name */}
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-semibold text-primary">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Leather Wallet, MacBook Pro"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Item Category */}
              <div className="sm:col-span-2">
                <label htmlFor="category" className="block text-sm font-semibold text-primary">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "Phone") {
                      setAlternateContact("");
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  required
                  disabled={isSubmitting}
                >
                  <option value="Other">Other</option>
                  <option value="Phone">Phone / Mobile</option>
                  <option value="Laptop">Laptop / Tablet</option>
                  <option value="Keys/Wallet">Keys / Wallet</option>
                  <option value="Bag/Luggage">Bag / Luggage</option>
                  <option value="Pet">Pet</option>
                </select>
              </div>

              {/* Brand / Model */}
              <div className="sm:col-span-3">
                <label htmlFor="brand" className="block text-sm font-semibold text-primary">
                  Brand / Model
                </label>
                <input
                  type="text"
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Apple, Bellroy"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Serial Number */}
              <div className="sm:col-span-3">
                <label htmlFor="serial" className="block text-sm font-semibold text-primary">
                  Serial Number (Optional)
                </label>
                <input
                  type="text"
                  id="serial"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="e.g. Serial, IMEI, or product number"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Primary Contact details */}
              <div className="sm:col-span-6">
                <label htmlFor="contact" className="block text-sm font-semibold text-primary">
                  Primary Contact Details (e.g. Email or Phone)
                </label>
                <input
                  type="text"
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="How should the platform notify you by default?"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Conditional Trusted Alternate Contact */}
              {category === "Phone" ? (
                <div className="sm:col-span-6 bg-accent/5 border border-accent/20 p-5 rounded-xl space-y-2.5 animate-fade-in">
                  <label htmlFor="alternateContact" className="block text-sm font-semibold text-primary">
                    Trusted Alternate Contact details <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="alternateContact"
                    value={alternateContact}
                    onChange={(e) => setAlternateContact(e.target.value)}
                    placeholder="e.g. Close Friend or Next of Kin phone/email"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-white"
                    required={category === "Phone"}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-neutral-slate leading-relaxed">
                    💡 <strong>Important for Mobile Devices:</strong> Since you are registering a phone, you will not have access to your own phone number or in-app notifications if it gets lost. You must provide an alternate contact (friend or relative) so a finder can coordinate with someone who can reach you.
                  </p>
                </div>
              ) : (
                <div className="sm:col-span-6">
                  <label htmlFor="alternateContact" className="block text-sm font-semibold text-primary">
                    Trusted Alternate Contact details (Optional)
                  </label>
                  <input
                    type="text"
                    id="alternateContact"
                    value={alternateContact}
                    onChange={(e) => setAlternateContact(e.target.value)}
                    placeholder="e.g. Next of Kin or Close Friend's details"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                    disabled={isSubmitting}
                  />
                  <p className="text-[10px] text-neutral-slate mt-0.5">
                    Provides an extra contact channel if your primary details are unreachable.
                  </p>
                </div>
              )}

              {/* Recovery Instructions */}
              <div className="sm:col-span-6">
                <label htmlFor="instructions" className="block text-sm font-semibold text-primary">
                  Recovery Instructions
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Provide helpful guidance for the finder. (e.g. Please drop it off at the security desk of Building A)"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Reward Selection */}
              <div className="sm:col-span-6 space-y-3 pt-2">
                <span className="block text-sm font-semibold text-primary">Recovery Reward Preferences</span>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-slate cursor-pointer">
                    <input
                      type="radio"
                      name="rewardType"
                      value="none"
                      checked={rewardType === "none"}
                      onChange={() => setRewardType("none")}
                      className="h-4.5 w-4.5 border-gray-300 text-accent focus:ring-accent cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <span>No Reward (Thank You Only)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-slate cursor-pointer">
                    <input
                      type="radio"
                      name="rewardType"
                      value="undisclosed"
                      checked={rewardType === "undisclosed"}
                      onChange={() => setRewardType("undisclosed")}
                      className="h-4.5 w-4.5 border-gray-300 text-accent focus:ring-accent cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <span>Undisclosed (To be discussed later)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-slate cursor-pointer">
                    <input
                      type="radio"
                      name="rewardType"
                      value="custom"
                      checked={rewardType === "custom"}
                      onChange={() => setRewardType("custom")}
                      className="h-4.5 w-4.5 border-gray-300 text-accent focus:ring-accent cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <span>Reward Offered</span>
                  </label>
                </div>

                {rewardType === "custom" && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      id="reward"
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      placeholder="e.g. 5,000 NGN, a cup of coffee, or custom token reward details"
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                      required={rewardType === "custom"}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              {/* Item Photo / Image (Optional) */}
              <div className="sm:col-span-6 border-t border-neutral-mist pt-6">
                <label htmlFor="item-photo" className="block text-sm font-semibold text-primary mb-1">
                  Item Photo / Image (Optional)
                </label>
                <input
                  type="file"
                  id="item-photo"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSubmitting || isReadingImage}
                  className="block w-full text-xs text-neutral-slate file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-mist file:text-primary hover:file:bg-neutral-mist/80 cursor-pointer"
                />
                {isReadingImage && (
                  <p className="text-[10px] text-neutral-slate mt-1">Processing item image...</p>
                )}
                {imageBase64 && !isReadingImage && (
                  <div className="mt-2 flex items-center gap-2 border border-neutral-mist p-2 rounded-xl bg-neutral-mist/20 w-max">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-neutral-mist">
                      <img
                        src={imageBase64}
                        alt="Item preview"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageBase64("")}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Private Security Details */}
              <div className="sm:col-span-6 border-t border-neutral-mist pt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-primary">Off-Chain Handover Verification (Optional)</h3>
                  <p className="text-xs text-neutral-slate leading-relaxed mt-1">
                    These security details are stored entirely off-chain and kept private. They are never shown on public verify pages. You will use these details physically in-person to prove ownership to the finder during recovery.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="secrets" className="block text-xs font-semibold text-primary">
                      Item Secret Details (IMEI, private markings, etc.)
                    </label>
                    <input
                      type="text"
                      id="secrets"
                      value={secrets}
                      onChange={(e) => setSecrets(e.target.value)}
                      placeholder="e.g. IMEI number, engraved initials, scratch on corner"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/30"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="passphrase" className="block text-xs font-semibold text-primary">
                      Secret Passphrase or PIN Code (Auto-Generated)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        id="passphrase"
                        value={passphrase}
                        readOnly
                        className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-xs bg-neutral-mist font-mono font-bold text-primary focus:outline-hidden"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setPassphrase(Math.floor(100000 + Math.random() * 900000).toString())}
                        className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-3 py-2.5 rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                        disabled={isSubmitting}
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="receipt" className="block text-xs font-semibold text-primary mb-1">
                      Proof of Purchase / Receipt Image (Optional)
                    </label>
                    <input
                      type="file"
                      id="receipt"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      disabled={isSubmitting || isReadingReceipt}
                      className="block w-full text-xs text-neutral-slate file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-mist file:text-primary hover:file:bg-neutral-mist/80 cursor-pointer"
                    />
                    {isReadingReceipt && (
                      <p className="text-[10px] text-neutral-slate mt-1">Reading receipt image data...</p>
                    )}
                    {receiptBase64 && !isReadingReceipt && (
                      <div className="mt-2 flex items-center gap-2 border border-neutral-mist p-2 rounded-xl bg-neutral-mist/20 w-max">
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-neutral-mist">
                          <img
                            src={receiptBase64}
                            alt="Receipt preview"
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setReceiptBase64("")}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note on privacy */}
            <div className="p-4 bg-neutral-mist rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-neutral-slate shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-neutral-slate leading-relaxed">
                <strong>Privacy Safeguard:</strong> None of the data entered above is stored in plain text on the public blockchain registry. We only anchor a cryptographic fingerprint (hash) of this data to secure it. Your details remain private off-chain.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isReadingReceipt || isReadingImage}
                className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving your item details...</span>
                  </>
                ) : (
                  <span>Register & Generate Sticker</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success State (QR display & sticker presets) */
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 text-center space-y-6 max-w-xl mx-auto">
            {/* Visual Success Accent */}
            <div className="flex justify-center">
              <div className="p-3 bg-green-50 rounded-full border border-green-100">
                <svg className="w-8 h-8 text-accent animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary font-display">Item Registered Successfully!</h2>
              <p className="text-sm text-neutral-slate">
                Your item has been assigned a secure identity on the Electroneum registry.
              </p>
            </div>

            {/* Sticker Studio */}
            <div className="border border-neutral-mist rounded-2xl overflow-hidden">
              {/* Studio Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-neutral-mist">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Sticker Label Studio</span>
                </div>
                <span className="text-[10px] text-neutral-slate font-mono break-all">
                  Hash: {successData.itemHash.substring(0, 14)}…
                </span>
              </div>

              <div className="p-5 space-y-5">
                {/* Size Preset Tabs */}
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
                              <span className="text-[8px] bg-accent text-neutral-white px-0.5 rounded-xs font-sans">
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

                {/* Live Sticker Preview */}
                <div className="flex justify-center py-2">
                  <div
                    className={`border-8 border-primary outline-2 outline-accent outline-offset-[-9px] text-center bg-neutral-white flex flex-col items-center shadow-md select-none transition-all duration-200 ${
                      selectedSize === "mini"
                        ? "w-[180px] p-2 gap-2"
                        : selectedSize === "standard"
                        ? "w-[240px] p-3 pb-2.5 gap-3"
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
                          (typeof window !== "undefined" ? window.location.origin : "") + "/verify/" + successData.registrationId
                        )}`}
                        alt={`QR code sticker for item ${successData.registrationId}`}
                        width={selectedSize === "mini" ? 100 : selectedSize === "standard" ? 140 : 180}
                        height={selectedSize === "mini" ? 100 : selectedSize === "standard" ? 140 : 180}
                        unoptimized
                      />
                    </div>
                    <div className="space-y-1">
                      <div className={`font-mono font-bold text-neutral-slate leading-none ${
                        selectedSize === "mini" ? "text-[8px]" : selectedSize === "standard" ? "text-[10px]" : "text-[12px]"
                      }`}>
                        ID: #{successData.registrationId}
                      </div>
                      {reward && rewardType === "custom" ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
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
                    type="button"
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

            {/* Go to Dashboard */}
            <Link
              href="/dashboard"
              className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <span>Go to Dashboard</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Registration Review & Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6 animate-scale-up">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-primary font-display flex items-center gap-1.5">
                📝 Review Registration Details
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Please confirm the details of your item before saving it to your account.
              </p>
            </div>

            {/* Review fields summary list */}
            <div className="border border-neutral-mist/60 rounded-xl overflow-hidden divide-y divide-neutral-mist/50 bg-neutral-mist/10 text-xs text-primary font-sans">
              <div className="flex justify-between p-3">
                <span className="text-neutral-slate font-medium">Item Name:</span>
                <span className="font-semibold">{name.trim()}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-neutral-slate font-medium">Category:</span>
                <span className="font-semibold">{category}</span>
              </div>
              {brand.trim() && (
                <div className="flex justify-between p-3">
                  <span className="text-neutral-slate font-medium">Brand:</span>
                  <span className="font-semibold">{brand.trim()}</span>
                </div>
              )}
              {serial.trim() && (
                <div className="flex justify-between p-3">
                  <span className="text-neutral-slate font-medium">Serial / Model:</span>
                  <span className="font-semibold">{serial.trim()}</span>
                </div>
              )}
              <div className="flex justify-between p-3">
                <span className="text-neutral-slate font-medium">Verification PIN:</span>
                <span className="font-mono font-bold text-accent">{passphrase}</span>
              </div>
              {category === "Phone" && (
                <div className="flex justify-between p-3">
                  <span className="text-neutral-slate font-medium">Alternate Contact:</span>
                  <span className="font-semibold">{alternateContact.trim()}</span>
                </div>
              )}
              <div className="flex justify-between p-3">
                <span className="text-neutral-slate font-medium">Reward offered:</span>
                <span className="font-semibold">
                  {rewardType === "custom" 
                    ? reward.trim() 
                    : rewardType === "undisclosed" 
                    ? "Undisclosed" 
                    : "No reward"}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-neutral-slate leading-normal">
              Upon confirmation, this item will be secured in our registry. Your private security details remain private and fully protected.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRegistration}
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
