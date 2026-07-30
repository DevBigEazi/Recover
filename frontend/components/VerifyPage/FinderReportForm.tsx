"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface FinderReportFormProps {
  itemId: string;
  itemName: string;
  setShowReportForm: (show: boolean) => void;
}

export default function FinderReportForm({ itemId, itemName, setShowReportForm }: FinderReportFormProps) {
  const [finderMessage, setFinderMessage] = useState("");
  const [finderContact, setFinderContact] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"meetup" | "courier">("meetup");
  const [courierCompany, setCourierCompany] = useState("");
  const [courierTracking, setCourierTracking] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const [photoBase64, setPhotoBase64] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  const handleGenerateAiMessage = async () => {
    setIsGeneratingMessage(true);
    setReportError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          itemName: itemName,
          finderNotes: finderMessage,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "AI failed to generate." }));
        throw new Error(errorData.error || "AI failed to generate template.");
      }

      const data = await res.json();
      if (data.text) {
        setFinderMessage(data.text);
      }
    } catch (err: unknown) {
      console.error(err);
      setReportError(err instanceof Error ? err.message : "AI failed to generate template.");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
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
      toast.error("Failed to compress and upload photo. Try a smaller file.");
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
      toast.error("Geolocation is not supported by your browser.");
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
        toast.error("Location access denied or unavailable.");
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
      toast.error("Message must be at least 10 characters long.");
      return;
    }

    if (!finderContact.trim()) {
      setReportError("Contact information is required.");
      toast.error("Contact information is required.");
      return;
    }

    if (deliveryMethod === "courier" && (!courierCompany.trim() || !courierTracking.trim())) {
      setReportError("Courier service name and tracking/contact details are required.");
      toast.error("Courier service name and tracking/contact details are required.");
      return;
    }

    const combinedCourierDetails = deliveryMethod === "courier"
      ? `Company: ${courierCompany.trim()} | Tracking/Contact: ${courierTracking.trim()}${courierNotes.trim() ? ` | Notes: ${courierNotes.trim()}` : ""}`
      : "";

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: itemId,
          message: finderMessage.trim(),
          contactInfo: finderContact.trim(),
          location: locationCoords,
          photo: photoBase64,
          deliveryMethod,
          courierDetails: deliveryMethod === "courier" ? combinedCourierDetails.trim() : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit report to backend database.");
      }

      toast.success("Found report submitted successfully!");
      setReportSuccess(true);
      setFinderMessage("");
      setFinderContact("");
      setDeliveryMethod("meetup");
      setCourierCompany("");
      setCourierTracking("");
      setCourierNotes("");
      setShareLocation(false);
      setLocationCoords("");
      setPhotoBase64("");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while submitting.";
      setReportError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
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
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="msg" className="block text-xs font-semibold text-primary">
                  Message to Owner <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAiMessage}
                  disabled={isGeneratingMessage}
                  className="text-[10px] text-accent hover:text-accent/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors cursor-pointer select-none bg-accent/5 hover:bg-accent/10 px-2 py-0.5 rounded-lg border border-accent/20"
                >
                  {isGeneratingMessage ? (
                    <>
                      <Loader2 className="animate-spin text-[8px] w-3 h-3" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>AI Write Template</span>
                    </>
                  )}
                </button>
              </div>
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
                Your Contact Information
              </label>
              <input
                type="text"
                id="finder_contact"
                value={finderContact}
                onChange={(e) => setFinderContact(e.target.value)}
                placeholder="e.g. email@address.com or phone number"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-mist/30"
                disabled={isSubmittingReport}
              />
            </div>

            {/* Handover Preference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-primary">
                Handover Preference
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="meetup"
                    checked={deliveryMethod === "meetup"}
                    onChange={() => {
                      setDeliveryMethod("meetup");
                      setCourierCompany("");
                      setCourierTracking("");
                      setCourierNotes("");
                    }}
                    disabled={isSubmittingReport}
                    className="h-4 w-4 text-accent focus:ring-accent border-gray-300 cursor-pointer"
                  />
                  🤝 Public Meetup
                </label>
                <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="courier"
                    checked={deliveryMethod === "courier"}
                    onChange={() => setDeliveryMethod("courier")}
                    disabled={isSubmittingReport}
                    className="h-4 w-4 text-accent focus:ring-accent border-gray-300 cursor-pointer"
                  />
                  📦 Send via Courier
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-slate font-medium cursor-not-allowed select-none group relative">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="integrated"
                    disabled={true}
                    className="h-4 w-4 text-accent focus:ring-accent border-gray-300 cursor-not-allowed opacity-50"
                  />
                  <span className="opacity-50">🚚 Integrated Courier</span>
                  <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 py-0.5 rounded-sm uppercase tracking-wide opacity-80">Coming Soon</span>
                  <span className="cursor-help text-neutral-slate text-[11px] font-bold">ⓘ</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 p-3 bg-[#1e293b] text-[#f8fafc] text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 leading-relaxed font-normal text-center border border-slate-700">
                    Coming soon: Dispatches automated courier partners (Uber/DHL) to pick up items anonymously, protecting your home address privacy.
                  </span>
                </label>
              </div>
            </div>

            {/* Courier Details */}
            {deliveryMethod === "courier" && (
              <div className="space-y-3 bg-neutral-mist/20 p-3.5 border border-neutral-mist rounded-xl">
                <h4 className="text-xs font-bold text-primary font-display flex items-center gap-1.5">
                  📦 Courier Delivery Setup
                </h4>
                
                <div>
                  <label htmlFor="courier_company" className="block text-[11px] font-semibold text-neutral-slate">
                    Courier Service / Company Name <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="courier_company"
                    value={courierCompany}
                    onChange={(e) => setCourierCompany(e.target.value)}
                    placeholder="e.g. GIG Logistics, DHL, Local Dispatch Rider"
                    required={deliveryMethod === "courier"}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-white"
                    disabled={isSubmittingReport}
                  />
                </div>

                <div>
                  <label htmlFor="courier_tracking" className="block text-[11px] font-semibold text-neutral-slate">
                    Tracking Number or Dispatch Contact <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="courier_tracking"
                    value={courierTracking}
                    onChange={(e) => setCourierTracking(e.target.value)}
                    placeholder="e.g. Waybill ID or rider's phone number"
                    required={deliveryMethod === "courier"}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs focus:border-accent focus:outline-hidden bg-neutral-white"
                    disabled={isSubmittingReport}
                  />
                </div>

                <div>
                  <label htmlFor="courier_notes" className="block text-[11px] font-semibold text-neutral-slate">
                    Additional Delivery Instructions (Optional)
                  </label>
                  <textarea
                    id="courier_notes"
                    rows={2}
                    value={courierNotes}
                    onChange={(e) => setCourierNotes(e.target.value)}
                    placeholder="e.g. package details, expected delivery day, or special instructions."
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-accent focus:outline-hidden bg-neutral-white"
                    disabled={isSubmittingReport}
                  />
                </div>
              </div>
            )}

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
                  <Loader2 className="animate-spin h-4 w-4 text-accent" />
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
                  <Loader2 className="animate-spin h-3 w-3 text-neutral-slate" />
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
                  <Loader2 className="animate-spin h-4 w-4 text-white" />
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
  );
}
