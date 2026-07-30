"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import ConfirmRegistrationModal from "@/components/RegistrationPage/ConfirmRegistrationModal";
import RegistrationSuccessCard from "@/components/RegistrationPage/RegistrationSuccessCard";
import ContactPrivacySection from "@/components/RegistrationPage/ContactPrivacySection";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function RegisterPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const { phone: profilePhone, whatsapp: profileWhatsapp, email: profileEmail } = useProfile();

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [reward, setReward] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("Other");
  const [alternateContact, setAlternateContact] = useState("");
  const [secrets, setSecrets] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [rewardType, setRewardType] = useState("none");
  const [keepPrivate, setKeepPrivate] = useState(true);
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp" | "email">("phone");
  const [singleContactValue, setSingleContactValue] = useState("");

  // Sync single contact value when method or profile changes
  useEffect(() => {
    if (contactMethod === "phone") {
      setSingleContactValue(profilePhone || "");
    } else if (contactMethod === "whatsapp") {
      setSingleContactValue(profileWhatsapp || profilePhone || "");
    } else if (contactMethod === "email") {
      setSingleContactValue(profileEmail || "");
    }
  }, [contactMethod, profilePhone, profileWhatsapp, profileEmail]);

  // File Upload states
  const [receiptBase64, setReceiptBase64] = useState("");
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);
  const [imageBase64, setImageBase64] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);

  // UI/Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [aiInstructionsError, setAiInstructionsError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    qrUrl: string;
    itemHash: string;
  } | null>(null);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Generate random PIN on mount
  useEffect(() => {
    setPassphrase(Math.floor(100000 + Math.random() * 900000).toString());
  }, []);

  const handleGenerateAiInstructions = async () => {
    if (!name.trim()) return;
    setIsGeneratingInstructions(true);
    setAiInstructionsError(null);
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
      setAiInstructionsError(err instanceof Error ? err.message : "AI failed to generate instructions.");
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

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
      toast.error("Failed to read receipt file.");
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
        toast.error("Failed to process image.");
        setIsReadingImage(false);
      };
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      toast.error("Failed to read image file.");
      setIsReadingImage(false);
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!name.trim()) {
      setError("Item Name is required.");
      toast.error("Item Name is required.");
      return;
    }
    if (category === "Phone" && !alternateContact.trim()) {
      setError("Trusted alternate contact is required for mobile devices.");
      toast.error("Trusted alternate contact is required for mobile devices.");
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
      const response = await fetch("/api/items/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: account.address,
          name: name.trim(),
          brand: brand.trim(),
          serial: serial.trim(),
          reward: rewardType === "custom" ? reward.trim() : "",
          instructions: instructions.trim(),
          category,
          alternateContact: category === "Phone" || alternateContact.trim() ? alternateContact.trim() : "",
          receiptData: receiptBase64,
          secrets: secrets.trim(),
          passphrase: passphrase.trim(),
          rewardType,
          image: imageBase64,
          showPublicContact: !keepPrivate,
          publicContactMethod: contactMethod,
          phone: contactMethod === "phone" ? singleContactValue.trim() : profilePhone || "",
          whatsapp: contactMethod === "whatsapp" ? singleContactValue.trim() : profileWhatsapp || "",
          email: contactMethod === "email" ? singleContactValue.trim() : profileEmail || "",
          contactInfo: singleContactValue.trim() || [profilePhone, profileEmail].filter(Boolean).join(" | "),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save item details.");
      }

      const itemData = await response.json();

      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + itemData.registrationId
      )}`;

      setSuccessData({
        registrationId: itemData.registrationId,
        qrUrl: qrDataUrl,
        itemHash: itemData.itemHash,
      });
      toast.success("Item registered successfully!");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3 text-amber-800 animate-fade-in shadow-xs">
          <span className="text-xl shrink-0 leading-none">⚠️</span>
          <div className="space-y-1 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Invite-Only Alpha-Testing</h4>
            <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
              Recover is currently in its invite-only alpha-testing phase. All item registrations, QR labels, and reporting interactions are for pre-launch testing purposes only.
            </p>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-4xl">
            Register New Item
          </h1>
          <p className="mt-2 text-md text-neutral-slate max-w-lg mx-auto">
            Secure your valuables on the blockchain registry. Your sensitive information is kept private off-chain, and we generate a printable QR sticker for physical recovery.
          </p>
        </div>

        {isAuthLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : !account ? (
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

              <ContactPrivacySection
                keepPrivate={keepPrivate}
                setKeepPrivate={setKeepPrivate}
                contactMethod={contactMethod}
                setContactMethod={setContactMethod}
                singleContactValue={singleContactValue}
                setSingleContactValue={setSingleContactValue}
              />

              <div className="sm:col-span-6 space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="instructions" className="block text-sm font-semibold text-primary">
                    Recovery Instructions
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiInstructions}
                    disabled={isGeneratingInstructions || !name.trim()}
                    className="text-xs text-accent hover:text-accent/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors cursor-pointer select-none bg-accent/5 hover:bg-accent/10 px-2 py-1 rounded-lg border border-accent/20"
                  >
                    {isGeneratingInstructions ? (
                      <>
                        <Loader2 className="animate-spin text-[10px] w-3 h-3" />
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
                {aiInstructionsError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-xs flex items-start gap-1.5 animate-fade-in font-medium mt-1">
                    <span className="shrink-0 text-red-500 mt-0.5">⚠️</span>
                    <span>{aiInstructionsError}</span>
                  </div>
                )}
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

            <div className="p-4 bg-neutral-mist rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-neutral-slate shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-neutral-slate leading-relaxed">
                <strong>Privacy Safeguard:</strong> None of the data entered above is stored in plain text on the public blockchain registry. We only anchor a cryptographic fingerprint (hash) of this data to secure it. Your details remain private off-chain.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isReadingReceipt || isReadingImage}
                className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    <span>Saving your item details...</span>
                  </>
                ) : (
                  <span>Register & Generate Sticker</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <RegistrationSuccessCard
            successData={successData}
            reward={reward}
            rewardType={rewardType}
            onRegisterAnother={() => {
              setSuccessData(null);
              setName("");
              setCategory("Other");
              setSerial("");
              setBrand("");
              setReward("");
              setInstructions("");
            }}
          />
        )}
      </div>

      {showConfirmModal && (
        <ConfirmRegistrationModal
          name={name}
          category={category}
          brand={brand}
          serial={serial}
          passphrase={passphrase}
          alternateContact={alternateContact}
          rewardType={rewardType}
          reward={reward}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={executeRegistration}
        />
      )}
    </main>
  );
}
