"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";

interface SyncedItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instructions: string;
  owner: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VerifyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const [item, setItem] = useState<SyncedItem | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle state to reveal finder report form
  const [showReportForm, setShowReportForm] = useState(false);

  // Finder Report form states
  const [finderMessage, setFinderMessage] = useState("");
  const [finderContact, setFinderContact] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  
  const [photoBase64, setPhotoBase64] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Handover PIN verification states
  const [inputPin, setInputPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleEmailClick = (e: React.MouseEvent, targetEmail: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(targetEmail);
      setCopiedEmail(targetEmail);
      setTimeout(() => setCopiedEmail(null), 4000);
    }
  };

  // Client-side image compression downscale (zero-dependency canvas)
  const compressPhoto = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // 60% quality JPEG
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setReportError(null);
    try {
      const compressed = await compressPhoto(file);
      setPhotoBase64(compressed);
    } catch (err) {
      console.error("Image compression failed:", err);
      setReportError("Failed to compress and upload photo. Try a smaller file.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleLocationToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setShareLocation(checked);
    if (!checked) {
      setLocationCoords("");
      return;
    }

    if (!navigator.geolocation) {
      setReportError("Geolocation is not supported by your browser.");
      setShareLocation(false);
      return;
    }

    setIsLocating(true);
    setReportError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLocationCoords(`lat: ${lat}, lng: ${lng}`);
        setIsLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setReportError("Location access denied or unavailable.");
        setShareLocation(false);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finderMessage.trim().length < 10) {
      setReportError("Message must be at least 10 characters long.");
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      // 1. Submit report to database API (includes backend rate-limit checks)
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: itemId,
          message: finderMessage.trim(),
          contactInfo: finderContact.trim(),
          location: locationCoords,
          photo: photoBase64,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit report to backend database.");
      }

      setReportSuccess(true);
      setFinderMessage("");
      setFinderContact("");
      setShareLocation(false);
      setLocationCoords("");
      setPhotoBase64("");
    } catch (err: unknown) {
      console.error(err);
      setReportError(err instanceof Error ? err.message : "An unexpected error occurred while submitting.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin.trim()) return;

    setIsVerifyingPin(true);
    setPinResult(null);

    try {
      const res = await fetch(`/api/items/${itemId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: inputPin.trim() }),
      });

      const data = await res.json();
      setPinResult({ valid: data.valid, message: data.message });
    } catch (err) {
      console.error("Failed to verify PIN:", err);
      setPinResult({ valid: false, message: "Failed to connect to verification server." });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const syncOnChainStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Read metadata from database API
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) {
        setItem(null);
        return;
      }
      const dbItem = await res.json();
      const localItem: SyncedItem = {
        registrationId: dbItem.registrationId,
        name: dbItem.name,
        brand: dbItem.brand || "",
        serial: dbItem.serial || "",
        reward: dbItem.reward || "",
        contact: dbItem.contactInfo || "",
        phone: dbItem.phone || "",
        whatsapp: dbItem.whatsapp || "",
        email: dbItem.email || "",
        instructions: dbItem.instructions || "",
        owner: dbItem.ownerAddress,
        status: dbItem.status,
        itemHash: dbItem.itemHash,
        registeredAt: new Date(dbItem.createdAt).getTime(),
        lastUpdated: new Date(dbItem.updatedAt).getTime(),
      };
      setItem(localItem);

      // Trigger verify scan endpoint to notify owner of the scan event in real-time
      try {
        fetch("/api/verify/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId: itemId }),
        });
      } catch (scanErr) {
        console.error("Failed to notify scan event:", scanErr);
      }

      // Fetch owner display name
      if (localItem.owner) {
        try {
          const profileRes = await fetch(`/api/profile?walletAddress=${localItem.owner}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setOwnerName(profileData.fullName);
          }
        } catch (err) {
          console.error("Failed to fetch owner display name:", err);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load item status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncOnChainStatus();
  }, [itemId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-neutral-slate font-medium">Verifying item details...</span>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-amber-50 rounded-full border border-amber-200 text-amber-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary font-display mb-2">QR Code De-registered</h2>
          <p className="text-sm text-neutral-slate mb-6 leading-relaxed">
            This QR code sticker was de-registered and permanently deleted from the Electroneum Blockchain registry by the owner (sold, gifted, or replaced). This sticker is no longer active.
          </p>
          <Link href="/" className="bg-primary hover:bg-primary-light text-neutral-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Branch on Status */}
        {item.status !== "Lost" ? (
          /* ACTIVE / RECOVERED CARD STATE (Teal Theme) */
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-green-50 rounded-full border border-green-100">
                {/* Shield Check Icon */}
                <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-xs font-bold text-accent uppercase tracking-wider">
                ✅ Verified Active
              </span>
              <h2 className="text-2xl font-bold text-primary font-display mt-2">Verified Owner Ownership</h2>
              <p className="text-sm text-neutral-slate max-w-md mx-auto">
                This item is registered on the Recover registry. It belongs to the verified owner below.
              </p>
            </div>

            {/* Item Details block */}
            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
              <div className="flex justify-between border-b border-neutral-mist pb-2">
                <span className="text-neutral-slate">Item name:</span>
                <span className="font-semibold text-primary">{item.name}</span>
              </div>
              {item.brand && (
                <div className="flex justify-between border-b border-neutral-mist pb-2">
                  <span className="text-neutral-slate">Brand:</span>
                  <span className="font-semibold text-primary">{item.brand}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-slate">Owner:</span>
                <span className="font-semibold text-primary">
                  {ownerName || "Secured Owner"}
                </span>
              </div>
            </div>

            <div className="text-xs text-neutral-slate max-w-sm mx-auto">
              If this is your item, you can toggle its status or edit metadata via the{" "}
              <Link href="/dashboard" className="text-accent hover:underline font-semibold">
                Dashboard
              </Link>
              .
            </div>
          </div>
        ) : (
          /* LOST CARD STATE (Amber Theme) */
          <div className="space-y-6">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
              
              {/* Alert Warning icon */}
              <div className="flex justify-center">
                <div className="p-4 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                  <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold text-warning uppercase tracking-wider">
                  ⚠️ Reported Lost
                </span>
                <h2 className="text-2xl font-bold text-primary font-display mt-2">This Item is Missing</h2>
                <p className="text-sm text-neutral-slate max-w-md mx-auto">
                  The owner of this item has flagged it as missing. If you have found it, please contact them using the buttons below.
                </p>
              </div>

              {/* Reward info */}
              {item.reward && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto flex items-center justify-center gap-2">
                  <span className="text-lg">🎁</span>
                  <span className="text-sm font-bold text-warning">
                    Recovery Reward offered: {item.reward}
                  </span>
                </div>
              )}

              {/* Item Details block */}
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
                <div className="flex justify-between border-b border-neutral-mist pb-2">
                  <span className="text-neutral-slate">Item name:</span>
                  <span className="font-semibold text-primary">{item.name}</span>
                </div>
                {item.brand && (
                  <div className="flex justify-between border-b border-neutral-mist pb-2">
                    <span className="text-neutral-slate">Brand:</span>
                    <span className="font-semibold text-primary">{item.brand}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-slate">Lost Since:</span>
                  <span className="font-semibold text-primary">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Custom Recovery Instructions */}
              {item.instructions && (
                <div className="bg-neutral-mist/35 border border-neutral-mist p-6 rounded-xl text-left max-w-md mx-auto">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Instructions from Owner</h4>
                  <p className="text-sm text-neutral-slate leading-relaxed font-sans">{item.instructions}</p>
                </div>
              )}

              {/* Action Trigger Buttons */}
              <div className="pt-4 space-y-3 max-w-md mx-auto">
                <button
                  onClick={() => setShowReportForm(true)}
                  className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                  <span>I Found This Item (Submit Report)</span>
                </button>

                {/* Direct Owner Contact Channels */}
                {(() => {
                  const phoneVal = item.phone?.trim() || (item.contact && /\+?[0-9\s-]{7,}/.test(item.contact) ? item.contact.match(/\+?[0-9\s-]{7,}/)?.[0].trim() : "");
                  const whatsappVal = item.whatsapp?.trim() || phoneVal;
                  const emailVal = item.email?.trim() || (item.contact && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(item.contact) ? item.contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] : "");

                  const hasDirectChannels = phoneVal || whatsappVal || emailVal;

                  return (
                    <div className="space-y-2 pt-1">
                      {hasDirectChannels ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {phoneVal && (
                            <a
                              href={`tel:${phoneVal}`}
                              className="bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>📞 Call Owner</span>
                            </a>
                          )}

                          {whatsappVal && (
                            <a
                              href={`https://wa.me/${whatsappVal.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-neutral-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>💬 WhatsApp</span>
                            </a>
                          )}

                          {emailVal && (
                            <a
                              href={`mailto:${emailVal}`}
                              onClick={(e) => handleEmailClick(e, emailVal)}
                              className="bg-primary hover:bg-primary-light text-neutral-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>✉️ Email Owner</span>
                            </a>
                          )}
                        </div>
                      ) : item.contact ? (
                        <div className="text-center p-3 bg-neutral-mist/50 rounded-xl border border-neutral-mist">
                          <span className="text-xs text-neutral-slate font-medium block mb-1">Owner Contact Info:</span>
                          <span className="text-xs font-semibold text-primary font-mono select-all">{item.contact}</span>
                        </div>
                      ) : null}

                      {copiedEmail && (
                        <div className="bg-green-50 border border-green-200 text-accent p-3 rounded-xl text-xs text-center animate-fade-in font-medium">
                          📋 Copied email <strong>{copiedEmail}</strong> to clipboard! Opening email app...
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Submit Found Report Modal */}
            {showReportForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in overflow-y-auto">
                <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xl max-w-lg w-full space-y-4 my-8 animate-scale-up max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
                    <h3 className="text-lg font-bold text-primary font-display">Submit Found Report</h3>
                    <button
                      onClick={() => {
                        setShowReportForm(false);
                        setReportSuccess(false);
                        setReportError(null);
                      }}
                      className="text-neutral-slate hover:text-primary text-sm font-semibold cursor-pointer p-1 rounded-lg hover:bg-neutral-mist"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {reportSuccess ? (
                    <div className="bg-green-50 border border-green-200 text-accent p-6 rounded-xl text-center space-y-3 my-4">
                      <svg className="w-12 h-12 text-accent mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-bold text-base text-primary">Report Submitted Successfully!</h4>
                      <p className="text-xs text-neutral-slate max-w-xs mx-auto">
                        Your message has been delivered to the owner's inbox. Thank you for helping return this item!
                      </p>
                      <button
                        onClick={() => {
                          setShowReportForm(false);
                          setReportSuccess(false);
                        }}
                        className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-6 py-2.5 text-xs transition-colors cursor-pointer mt-2"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                      {reportError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-start gap-2">
                          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{reportError}</span>
                        </div>
                      )}

                      {/* Message */}
                      <div>
                        <label htmlFor="msg" className="block text-xs font-semibold text-primary">
                          Message to Owner <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="msg"
                          rows={4}
                          value={finderMessage}
                          onChange={(e) => setFinderMessage(e.target.value)}
                          placeholder="Provide details about where or how you found the item. (Min 10 characters, max 1000)"
                          minLength={10}
                          maxLength={1000}
                          required
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/30"
                          disabled={isSubmittingReport}
                        />
                        <div className="text-[10px] text-neutral-slate mt-1 text-right">
                          {finderMessage.length} / 1000 characters
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div>
                        <label htmlFor="finder_contact" className="block text-xs font-semibold text-primary">
                          Your Contact Information (Optional)
                        </label>
                        <input
                          type="text"
                          id="finder_contact"
                          value={finderContact}
                          onChange={(e) => setFinderContact(e.target.value)}
                          placeholder="e.g. email@address.com or phone number"
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/30"
                          disabled={isSubmittingReport}
                        />
                      </div>

                      {/* Geolocation Capture */}
                      <div className="flex items-center justify-between p-3 bg-neutral-mist/40 border border-neutral-mist rounded-xl">
                        <div className="space-y-0.5">
                          <label htmlFor="geo_toggle" className="block text-xs font-semibold text-primary cursor-pointer">
                            Share Current Location
                          </label>
                          <p className="text-[10px] text-neutral-slate">
                            Helps the owner pinpoint where the item was found. Requires browser prompt consent.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLocating && (
                            <svg className="animate-spin h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          <input
                            type="checkbox"
                            id="geo_toggle"
                            checked={shareLocation}
                            onChange={handleLocationToggle}
                            disabled={isSubmittingReport || isLocating}
                            className="h-4.5 w-4.5 rounded-sm border-gray-300 text-accent focus:ring-accent cursor-pointer"
                          />
                        </div>
                      </div>

                      {locationCoords && (
                        <div className="text-[10px] text-accent font-medium bg-green-50/50 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Location Captured: {locationCoords}</span>
                        </div>
                      )}

                      {/* Photo Upload */}
                      <div>
                        <label htmlFor="photo_upload" className="block text-xs font-semibold text-primary mb-1">
                          Upload Photo of Item (Optional)
                        </label>
                        <input
                          type="file"
                          id="photo_upload"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          disabled={isSubmittingReport || isCompressing}
                          className="block w-full text-xs text-neutral-slate file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-mist file:text-primary hover:file:bg-neutral-mist/80 cursor-pointer"
                        />
                        {isCompressing && (
                          <div className="text-[10px] text-neutral-slate mt-1 flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3 text-neutral-slate" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Compressing image on client...</span>
                          </div>
                        )}
                        {photoBase64 && !isCompressing && (
                          <div className="mt-3 flex items-center gap-2 border border-neutral-mist p-2 rounded-xl bg-neutral-mist/20 w-max">
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-neutral-mist">
                              <Image
                                src={photoBase64}
                                alt="Thumbnail of item"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPhotoBase64("")}
                              className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingReport || isCompressing || isLocating}
                        className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-neutral-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        {isSubmittingReport ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Submitting Found Report...</span>
                          </>
                        ) : (
                          <span>Submit Found Report</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
            {/* Handover PIN Verification Card for Finder (Only when item is Lost) */}
            <div className="mt-8 bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-neutral-mist pb-4">
                <div className="p-2.5 bg-accent/10 rounded-xl text-accent shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary font-display">In-Person Handover PIN Verification</h3>
                  <p className="text-xs text-neutral-slate mt-0.5">
                    Meeting the owner? Ask them for their 4-6 digit Handover PIN code and enter it below to confirm authentic ownership before handing over the item.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                  <input
                    type="text"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value)}
                    placeholder="Enter owner's PIN code (e.g. 849232)"
                    maxLength={10}
                    className="flex-1 bg-neutral-mist/30 border border-neutral-mist rounded-xl px-2 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingPin || !inputPin.trim()}
                    className="bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2"
                  >
                    {isVerifyingPin ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      "Verify PIN"
                    )}
                  </button>
                </div>

                {pinResult && (
                  <div
                    className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      pinResult.valid
                        ? "bg-green-50 border border-green-200 text-accent"
                        : "bg-red-50 border border-red-200 text-critical"
                    }`}
                  >
                    <span>{pinResult.message}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
