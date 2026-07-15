"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { useActiveAccount } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  // Composite PNG Sticker Generator download
  const handleDownloadStickerLabel = async (sizeName: "mini" | "standard" | "large") => {
    if (!successData) return;
    try {
      const canvas = document.createElement("canvas");
      
      // Determine canvas resolution based on sticker scale
      let width = 400;
      let height = 550;
      if (sizeName === "mini") {
        width = 250;
        height = 350;
      } else if (sizeName === "large") {
        width = 800;
        height = 1100;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to resolve canvas 2d context.");

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer border (Navy)
      ctx.strokeStyle = "#1E2A4A";
      ctx.lineWidth = sizeName === "mini" ? 6 : sizeName === "large" ? 24 : 12;
      ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);

      // Inner border (Teal)
      const gap = sizeName === "mini" ? 10 : sizeName === "large" ? 40 : 20;
      ctx.strokeStyle = "#0EA394";
      ctx.lineWidth = sizeName === "mini" ? 2 : sizeName === "large" ? 6 : 3;
      ctx.strokeRect(gap, gap, canvas.width - gap*2, canvas.height - gap*2);

      // Header text
      ctx.fillStyle = "#1E2A4A";
      ctx.font = `bold ${sizeName === "mini" ? "14px" : sizeName === "large" ? "42px" : "21px"} sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("SCAN IF FOUND", canvas.width / 2, sizeName === "mini" ? 40 : sizeName === "large" ? 130 : 65);

      // Load and Draw QR Code Image
      const qrImg = document.createElement("img");
      qrImg.crossOrigin = "anonymous";
      qrImg.src = successData.qrUrl;

      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => {
          const qrSize = sizeName === "mini" ? 140 : sizeName === "large" ? 480 : 240;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = sizeName === "mini" ? 60 : sizeName === "large" ? 180 : 90;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = (err) => reject(err);
      });

      // Caption text
      ctx.fillStyle = "#4A5568";
      ctx.font = `medium ${sizeName === "mini" ? "8px" : sizeName === "large" ? "20px" : "11px"} sans-serif`;
      ctx.textAlign = "center";
      
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(" ");
        let line = "";
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, currentY);
      };

      const captionText = "This item might be lost. If found, please scan to contact the owner.";
      const textX = canvas.width / 2;
      const textY = sizeName === "mini" ? 220 : sizeName === "large" ? 720 : 360;
      const maxWidth = canvas.width - (gap * 3);
      const lineHeight = sizeName === "mini" ? 12 : sizeName === "large" ? 30 : 16;
      
      wrapText(captionText, textX, textY, maxWidth, lineHeight);

      // Unique label detail at the bottom
      ctx.fillStyle = "#1E2A4A";
      ctx.font = `bold ${sizeName === "mini" ? "8px" : sizeName === "large" ? "18px" : "10px"} monospace`;
      ctx.fillText(`ID: #${successData.registrationId}`, canvas.width / 2, canvas.height - (sizeName === "mini" ? 20 : sizeName === "large" ? 60 : 30));

      // Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `recover-sticker-${sizeName}-item-${successData.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate sticker label:", err);
      // Fallback: download raw QR
      handleDownloadQR();
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

            {/* QR Card Container */}
            <div className="bg-neutral-mist/40 border border-neutral-mist rounded-2xl p-6 flex flex-col items-center">
              {/* Sticker Preview */}
              <div className="bg-neutral-white p-6 rounded-xl shadow-xs border-4 border-primary max-w-[280px] w-full flex flex-col items-center space-y-4">
                <span className="text-primary font-bold text-xs uppercase tracking-wider">SCAN IF FOUND</span>
                
                <div className="bg-neutral-white p-2 rounded-lg border border-neutral-mist">
                  <Image
                    src={successData.qrUrl}
                    alt={`QR code for item registration ID ${successData.registrationId}`}
                    width={160}
                    height={160}
                    className="rounded-xs"
                    unoptimized
                  />
                </div>

                <p className="text-[9px] text-[#4A5568] leading-tight font-medium text-center max-w-[190px]">
                  This item might be lost. If found, please scan to contact the owner.
                </p>

                <span className="text-primary font-mono text-[9px] font-bold">
                  ID: #{successData.registrationId}
                </span>
              </div>

              <span className="text-xs text-neutral-slate mt-4 font-mono break-all max-w-[280px]">
                Metadata Hash: {successData.itemHash.substring(0, 16)}...
              </span>
            </div>

            {/* Sticker Presets Selection */}
            <div className="border-t border-neutral-mist pt-4 space-y-3 text-left">
              <span className="block text-xs font-bold text-primary uppercase tracking-wider">Select Sticker Label Size</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSize("mini")}
                  className={`border rounded-lg p-2.5 text-center cursor-pointer transition-all ${
                    selectedSize === "mini"
                      ? "border-accent bg-accent/5 text-accent font-semibold"
                      : "border-gray-200 hover:border-gray-300 text-neutral-slate"
                  }`}
                >
                  <span className="block text-xs">Mini</span>
                  <span className="block text-[9px] mt-0.5 opacity-85">~10x10mm</span>
                  <span className="block text-[8px] font-mono font-medium text-accent mt-0.5">(Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize("standard")}
                  className={`border rounded-lg p-2.5 text-center cursor-pointer transition-all ${
                    selectedSize === "standard"
                      ? "border-accent bg-accent/5 text-accent font-semibold"
                      : "border-gray-200 hover:border-gray-300 text-neutral-slate"
                  }`}
                >
                  <span className="block text-xs">Standard</span>
                  <span className="block text-[9px] mt-0.5 opacity-85">~25x25mm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize("large")}
                  className={`border rounded-lg p-2.5 text-center cursor-pointer transition-all ${
                    selectedSize === "large"
                      ? "border-accent bg-accent/5 text-accent font-semibold"
                      : "border-gray-200 hover:border-gray-300 text-neutral-slate"
                  }`}
                >
                  <span className="block text-xs">Large</span>
                  <span className="block text-[9px] mt-0.5 opacity-85">~50x50mm</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => handleDownloadStickerLabel(selectedSize)}
                className="bg-accent hover:bg-accent/90 text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Sticker PNG</span>
              </button>
              
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
          </div>
        )}
      </div>
    </main>
  );
}
