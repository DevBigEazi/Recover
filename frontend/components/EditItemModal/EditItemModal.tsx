"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useProfile } from "@/context/ProfileContext";

interface LocalItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  instructions: string;
  owner: string;
  ownerName?: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
  category?: string;
  alternateContact?: string;
  receiptData?: string;
  secrets?: string;
  passphrase?: string;
  rewardType?: string;
  image?: string;
  showPublicContact?: boolean;
  phone?: string;
  whatsapp?: string;
  email?: string;
  publicContactMethod?: string;
}

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LocalItem;
  ownerAddress: string;
  onItemUpdated: () => void;
}

export default function EditItemModal({
  isOpen,
  onClose,
  item,
  ownerAddress,
  onItemUpdated,
}: EditItemModalProps) {
  const [name, setName] = useState(item.name || "");
  const [brand, setBrand] = useState(item.brand || "");
  const [serial, setSerial] = useState(item.serial || "");
  const [category, setCategory] = useState(item.category || "Other");
  const [reward, setReward] = useState(item.reward || "");
  const [instructions, setInstructions] = useState(item.instructions || "");
  const [alternateContact, setAlternateContact] = useState(item.alternateContact || "");
  const [passphrase, setPassphrase] = useState(item.passphrase || "");
  const { phone: profilePhone, whatsapp: profileWhatsapp, email: profileEmail } = useProfile();

  const [secrets, setSecrets] = useState(item.secrets || "");
  const [showPublicContactState, setShowPublicContactState] = useState(Boolean(item.showPublicContact));
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp" | "email">("phone");
  const [singleContactValue, setSingleContactValue] = useState("");

  // Sync state when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      setName(item.name || "");
      setBrand(item.brand || "");
      setSerial(item.serial || "");
      setCategory(item.category || "Other");
      setReward(item.reward || "");
      setInstructions(item.instructions || "");
      setAlternateContact(item.alternateContact || "");
      setPassphrase(item.passphrase || "");
      setSecrets(item.secrets || "");
      setItemImage(item.image || "");
      setReceiptImage(item.receiptData || "");

      const isPublic = Boolean(item.showPublicContact);
      setShowPublicContactState(isPublic);
      if (item.publicContactMethod) {
        setContactMethod(item.publicContactMethod as "phone" | "whatsapp" | "email");
      }
    }
  }, [isOpen, item]);

  // Initialize single contact value cleanly on open / method change
  useEffect(() => {
    if (contactMethod === "phone") {
      const initial = item.phone || profilePhone || (item.contact ? item.contact.split("|")[0]?.trim() : "") || "";
      setSingleContactValue(initial);
    } else if (contactMethod === "whatsapp") {
      const initial = item.whatsapp || profileWhatsapp || item.phone || profilePhone || (item.contact ? item.contact.split("|")[0]?.trim() : "") || "";
      setSingleContactValue(initial);
    } else if (contactMethod === "email") {
      const initial = item.email || profileEmail || (item.contact ? item.contact.split("|").find((s) => s.includes("@"))?.trim() : "") || "";
      setSingleContactValue(initial);
    }
  }, [contactMethod, item.phone, item.whatsapp, item.email, item.contact, profilePhone, profileWhatsapp, profileEmail]);

  // Photos (base64)
  const [itemImage, setItemImage] = useState(item.image || "");
  const [receiptImage, setReceiptImage] = useState(item.receiptData || "");

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateAiInstructions = async () => {
    if (!name.trim()) return;
    setIsGeneratingInstructions(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "instructions",
          itemName: name,
          category,
          brand,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "AI failed to generate." }));
        throw new Error(errorData.error || "AI failed to generate instructions.");
      }

      const data = await res.json();
      if (data.text) {
        setInstructions(data.text);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "AI failed to generate instructions.");
    } finally {
      setIsGeneratingInstructions(false);
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
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleItemImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setError(null);
    try {
      const compressed = await compressPhoto(file);
      setItemImage(compressed);
    } catch (err) {
      console.error("Failed to compress item photo:", err);
      setError("Failed to process item photo. Please try a different image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleReceiptImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setError(null);
    try {
      const compressed = await compressPhoto(file);
      setReceiptImage(compressed);
    } catch (err) {
      console.error("Failed to compress receipt photo:", err);
      setError("Failed to process receipt image. Please try a different file.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (category === "Phone" && !alternateContact.trim()) {
      setError("Alternate contact is required for phone registrations so finders can reach a trusted contact.");
      return;
    }

    if (showPublicContactState && !singleContactValue.trim()) {
      setError(`Please enter a valid ${contactMethod === "email" ? "email address" : "phone number"} to reveal to finders.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/items/${item.registrationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": ownerAddress,
        },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          serial: serial.trim(),
          category,
          reward: reward.trim(),
          instructions: instructions.trim(),
          alternateContact: alternateContact.trim(),
          passphrase: passphrase.trim(),
          secrets: secrets.trim(),
          showPublicContact: showPublicContactState,
          publicContactMethod: contactMethod,
          phone: contactMethod === "phone" ? singleContactValue.trim() : "",
          whatsapp: contactMethod === "whatsapp" ? singleContactValue.trim() : "",
          email: contactMethod === "email" ? singleContactValue.trim() : "",
          contactInfo: singleContactValue.trim(),
          receiptData: receiptImage,
          image: itemImage,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to update item." }));
        throw new Error(errorData.error || "Failed to update item details.");
      }

      onItemUpdated();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred while saving changes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl w-full space-y-6 my-8 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
          <div>
            <h3 className="text-lg font-bold text-primary font-display">Edit Item Details</h3>
            <p className="text-xs text-neutral-slate">Update item details, photos, recovery notes, and contact privacy settings.</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-slate hover:text-primary text-sm font-semibold cursor-pointer p-1 rounded-lg hover:bg-neutral-mist transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* Item Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit_name" className="block font-semibold text-primary mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="edit_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              />
            </div>

            <div>
              <label htmlFor="edit_category" className="block font-semibold text-primary mb-1">
                Category
              </label>
              <select
                id="edit_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              >
                <option value="Phone">Phone / Mobile</option>
                <option value="Laptop">Laptop / Computer</option>
                <option value="Keys">Keys</option>
                <option value="Bag">Bag / Backpack</option>
                <option value="Wallet">Wallet / Purse</option>
                <option value="Electronics">Electronics / Gadget</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Brand & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit_brand" className="block font-semibold text-primary mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                id="edit_brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Apple, Samsung, Dell"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              />
            </div>

            <div>
              <label htmlFor="edit_serial" className="block font-semibold text-primary mb-1">
                Serial Number / IMEI
              </label>
              <input
                type="text"
                id="edit_serial"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="e.g. SN123456789"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              />
            </div>
          </div>

          {/* Recovery Reward & Handover PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit_reward" className="block font-semibold text-primary mb-1">
                Recovery Reward (Optional)
              </label>
              <input
                type="text"
                id="edit_reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. 5,000 NGN or Coffee on me!"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              />
            </div>

            <div>
              <label htmlFor="edit_passphrase" className="block font-semibold text-primary mb-1">
                Handover Verification PIN
              </label>
              <input
                type="text"
                id="edit_passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="e.g. 4-digit code for in-person verification"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
              />
            </div>
          </div>

          {/* Custom Recovery Instructions */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="edit_instructions" className="block font-semibold text-primary">
                Public Recovery Instructions
              </label>
              <button
                type="button"
                onClick={handleGenerateAiInstructions}
                disabled={isGeneratingInstructions || !name.trim()}
                className="text-xs text-accent hover:text-accent/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors cursor-pointer select-none bg-accent/5 hover:bg-accent/10 px-2 py-1 rounded-lg border border-accent/20"
              >
                {isGeneratingInstructions ? (
                  <>
                    <span className="animate-spin text-[10px]">🌀</span>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Suggest</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="edit_instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide safe instructions for finders (e.g. Please leave with front security desk at 123 Main St)."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
            />
          </div>

          {/* Trusted Alternate Contact */}
          <div>
            <label htmlFor="edit_alternate" className="block font-semibold text-primary mb-1">
              Trusted Alternate Contact Details {category === "Phone" && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              id="edit_alternate"
              value={alternateContact}
              onChange={(e) => setAlternateContact(e.target.value)}
              placeholder="e.g. Close Friend or Next of Kin phone/email"
              required={category === "Phone"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
            />
            <p className="text-[10px] text-neutral-slate mt-1">
              Used to reach someone who knows you if you lose your phone or access to your primary device.
            </p>
          </div>

          {/* Private Distinguishing Marks & Secrets */}
          <div>
            <label htmlFor="edit_secrets" className="block font-semibold text-primary mb-1">
              Private Distinguishing Marks & Secrets (Off-Chain Only)
            </label>
            <textarea
              id="edit_secrets"
              rows={2}
              value={secrets}
              onChange={(e) => setSecrets(e.target.value)}
              placeholder="e.g. Small scratch on bottom left, custom engraving, internal serial sticker"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-accent focus:outline-hidden bg-neutral-mist/30"
            />
          </div>

          {/* Contact Privacy Mode Selection */}
          <div className="p-4 bg-neutral-mist/40 border border-neutral-mist rounded-xl space-y-3">
            <label className="block font-bold text-sm text-primary">
              Contact Privacy Preference
            </label>

            <div className="space-y-2">
              {/* Option 1: Keep Private */}
              <div
                onClick={() => setShowPublicContactState(false)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  !showPublicContactState
                    ? "bg-neutral-white border-accent shadow-xs"
                    : "bg-neutral-mist/30 border-gray-200 hover:bg-neutral-mist/50"
                }`}
              >
                <input
                  type="radio"
                  id="edit_privacy_private"
                  name="edit_privacy_mode"
                  checked={!showPublicContactState}
                  onChange={() => setShowPublicContactState(false)}
                  className="mt-0.5 text-accent focus:ring-accent cursor-pointer"
                />
                <label htmlFor="edit_privacy_private" className="cursor-pointer space-y-0.5">
                  <span className="block font-semibold text-xs text-primary">
                    🛡️ Keep Contact Details Private (Recommended)
                  </span>
                  <span className="block text-[11px] text-neutral-slate leading-relaxed">
                    Finders send messages directly to your dashboard. Your phone and email are hidden from public QR scans.
                  </span>
                </label>
              </div>

              {/* Option 2: Reveal Direct Contact */}
              <div
                onClick={() => setShowPublicContactState(true)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  showPublicContactState
                    ? "bg-neutral-white border-accent shadow-xs"
                    : "bg-neutral-mist/30 border-gray-200 hover:bg-neutral-mist/50"
                }`}
              >
                <input
                  type="radio"
                  id="edit_privacy_public"
                  name="edit_privacy_mode"
                  checked={showPublicContactState}
                  onChange={() => setShowPublicContactState(true)}
                  className="mt-0.5 text-accent focus:ring-accent cursor-pointer"
                />
                <label htmlFor="edit_privacy_public" className="cursor-pointer space-y-0.5">
                  <span className="block font-semibold text-xs text-primary">
                    📞 Reveal Direct Contact Button to Finders
                  </span>
                  <span className="block text-[11px] text-neutral-slate leading-relaxed">
                    Finders scanning your item's QR sticker will see a direct Call, WhatsApp, or Email button.
                  </span>
                </label>
              </div>
            </div>

            {showPublicContactState && (
              <div className="pt-3 border-t border-neutral-mist space-y-3 animate-fade-in">
                <div>
                  <label className="block font-semibold text-primary mb-1.5 text-xs">
                    Select Contact Method to Reveal (Only 1 Allowed)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setContactMethod("phone")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        contactMethod === "phone"
                          ? "bg-primary text-white border-primary"
                          : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                      }`}
                    >
                      <span>📞 Phone Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMethod("whatsapp")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        contactMethod === "whatsapp"
                          ? "bg-[#25D366] text-white border-[#25D366]"
                          : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                      }`}
                    >
                      <span>💬 WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMethod("email")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        contactMethod === "email"
                          ? "bg-primary text-white border-primary"
                          : "bg-neutral-white text-primary border-gray-300 hover:bg-neutral-mist"
                      }`}
                    >
                      <span>✉️ Email</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="single_contact_input" className="block font-semibold text-primary mb-1 text-[11px]">
                    {contactMethod === "phone" && "Public Phone Number (For Calls)"}
                    {contactMethod === "whatsapp" && "Public WhatsApp Number"}
                    {contactMethod === "email" && "Public Email Address"}
                  </label>
                  <input
                    type={contactMethod === "email" ? "email" : "text"}
                    id="single_contact_input"
                    value={singleContactValue}
                    onChange={(e) => setSingleContactValue(e.target.value)}
                    placeholder={
                      contactMethod === "email"
                        ? "e.g. owner@example.com"
                        : "e.g. +234 814 599 1080"
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-accent focus:outline-hidden bg-neutral-white font-mono"
                  />
                  <p className="text-[10px] text-neutral-slate mt-1">
                    Finders scanning your QR sticker when lost will see only this selected contact button.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Item Photo & Receipt Uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-mist pt-4">
            
            {/* Item Photo */}
            <div className="space-y-2">
              <label className="block font-semibold text-primary">Item Photo</label>
              {itemImage ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-mist bg-neutral-mist/30">
                  <Image src={itemImage} alt="Item photo preview" fill className="object-contain" />
                  <button
                    type="button"
                    onClick={() => setItemImage("")}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700 shadow-md cursor-pointer"
                    title="Remove Photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-accent transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleItemImageChange}
                    disabled={isCompressing}
                    className="block w-full text-xs text-neutral-slate file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-slate block mt-1">Upload clear photo of the item</span>
                </div>
              )}
            </div>

            {/* Receipt Image */}
            <div className="space-y-2">
              <label className="block font-semibold text-primary">Receipt / Proof of Purchase</label>
              {receiptImage ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-mist bg-neutral-mist/30">
                  <Image src={receiptImage} alt="Receipt preview" fill className="object-contain" />
                  <button
                    type="button"
                    onClick={() => setReceiptImage("")}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700 shadow-md cursor-pointer"
                    title="Remove Receipt"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-accent transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptImageChange}
                    disabled={isCompressing}
                    className="block w-full text-xs text-neutral-slate file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-slate block mt-1">Upload store receipt or purchase invoice</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Submit & Cancel */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-mist">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-neutral-slate hover:bg-neutral-mist transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="bg-accent hover:bg-accent/90 text-neutral-white font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">🌀</span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
