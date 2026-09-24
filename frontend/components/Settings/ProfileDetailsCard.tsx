"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "react-hot-toast";
import { Upload, X, Image as ImageIcon, Store, User as UserIcon } from "lucide-react";

interface ProfileDetailsCardProps {
  walletAddress: string;
}

export default function ProfileDetailsCard({ walletAddress }: ProfileDetailsCardProps) {
  const {
    fullName,
    companyName,
    businessLogo,
    username,
    phone,
    whatsapp,
    email,
    businessPhone,
    businessEmail,
    activeMode,
    refetchProfile,
  } = useProfile();

  // Shared Account Owner Name (identical across both Personal and Business modes)
  const [nameInput, setNameInput] = useState("");

  // Personal Mode Fields
  const [usernameInput, setUsernameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Business Mode Fields
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [businessPhoneInput, setBusinessPhoneInput] = useState("");
  const [businessEmailInput, setBusinessEmailInput] = useState("");
  const [logoInput, setLogoInput] = useState<string | null>(null);
  const [isReadingLogo, setIsReadingLogo] = useState(false);

  // Notification and Form States
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync profile details when profile data is loaded or refetched
  useEffect(() => {
    if (fullName) setNameInput(fullName);
    if (companyName) setCompanyNameInput(companyName);
    if (businessLogo !== undefined) setLogoInput(businessLogo);
    if (username) setUsernameInput(username);
    if (phone) setPhoneInput(phone);
    if (whatsapp) setWhatsappInput(whatsapp);
    if (email) setEmailInput(email);
    if (businessPhone) setBusinessPhoneInput(businessPhone);
    if (businessEmail) setBusinessEmailInput(businessEmail);
  }, [fullName, companyName, businessLogo, username, phone, whatsapp, email, businessPhone, businessEmail]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB.");
      return;
    }

    setIsReadingLogo(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setLogoInput(dataUrl);
        setIsReadingLogo(false);
      };
      img.onerror = () => {
        toast.error("Failed to process image.");
        setIsReadingLogo(false);
      };
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setIsReadingLogo(false);
    };
  };

  const handleRemoveLogo = () => {
    setLogoInput(null);
  };

  // Check current Web Push subscription status
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window) {
      if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) {
              setPushEnabled(true);
            }
          });
        });
      }
    }
  }, []);

  const handleTogglePush = async () => {
    if (!walletAddress || isRegisteringPush) return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setPushStatusMsg("Web Push notifications are not supported in this browser.");
      toast.error("Web Push notifications are not supported in this browser.");
      return;
    }

    setIsRegisteringPush(true);
    setPushStatusMsg(null);

    try {
      if (!pushEnabled) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushStatusMsg("Notification permission was denied in your browser settings.");
          toast.error("Notification permission was denied in your browser settings.");
          setIsRegisteringPush(false);
          return;
        }

        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register("/sw.js"));
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) {
          setPushStatusMsg("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined.");
          toast.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined.");
          setIsRegisteringPush(false);
          return;
        }

        const padding = "=".repeat((4 - (publicVapidKey.length % 4)) % 4);
        const base64 = (publicVapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray,
          });
        }

        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-owner-address": walletAddress,
          },
          body: JSON.stringify({ subscription }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Server error" }));
          throw new Error(errorData.error || "Subscription registration failed.");
        }

        setPushEnabled(true);
        setPushStatusMsg("Real-time Push Notifications enabled successfully on this device!");
        toast.success("Real-time Push Notifications enabled!");
      } else {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.ready);
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        setPushEnabled(false);
        setPushStatusMsg("Push Notifications disabled for this device.");
        toast.success("Push Notifications disabled.");
      }
    } catch (err: unknown) {
      console.error("Error toggling push notifications:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setPushStatusMsg(`Failed to update push notification preferences: ${errMsg}`);
      toast.error(`Failed to update push notification preferences: ${errMsg}`);
    } finally {
      setIsRegisteringPush(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    setIsSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    const cleanedName = nameInput.trim();

    if (cleanedName.length === 0 || cleanedName.length > 50) {
      setProfileError("Full Name must be between 1 and 50 characters.");
      toast.error("Full Name must be between 1 and 50 characters.");
      setIsSaving(false);
      return;
    }

    if (activeMode === "personal") {
      const cleanedUsername = usernameInput.trim().toLowerCase();
      const cleanedPhone = phoneInput.trim();
      const cleanedWhatsapp = whatsappInput.trim();
      const cleanedEmail = emailInput.trim();

      if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
        setProfileError(
          "Username must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens."
        );
        toast.error("Username must be between 3 and 30 characters.");
        setIsSaving(false);
        return;
      }

      if (!cleanedPhone && !cleanedWhatsapp && !cleanedEmail) {
        setProfileError(
          "At least one personal contact method (Phone, WhatsApp, or Email) is required on your profile."
        );
        toast.error("At least one personal contact method (Phone, WhatsApp, or Email) is required.");
        setIsSaving(false);
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            fullName: cleanedName,
            username: cleanedUsername,
            phone: cleanedPhone || undefined,
            whatsapp: cleanedWhatsapp || undefined,
            email: cleanedEmail || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update profile settings.");
        }

        refetchProfile();
        setProfileSuccess(true);
        toast.success("Personal profile updated successfully!");
        setTimeout(() => setProfileSuccess(false), 3000);
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setProfileError(msg);
        toast.error(msg);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Business Mode Save
      const cleanedCompanyName = companyNameInput.trim();
      const cleanedBusinessPhone = businessPhoneInput.trim();
      const cleanedBusinessEmail = businessEmailInput.trim();

      if (cleanedCompanyName.length === 0 || cleanedCompanyName.length > 80) {
        setProfileError("Store or Business Name must be between 1 and 80 characters.");
        toast.error("Store or Business Name must be between 1 and 80 characters.");
        setIsSaving(false);
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            fullName: cleanedName,
            companyName: cleanedCompanyName,
            businessLogo: logoInput || undefined,
            businessPhone: cleanedBusinessPhone || undefined,
            businessEmail: cleanedBusinessEmail || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update business settings.");
        }

        refetchProfile();
        setProfileSuccess(true);
        toast.success("Business profile updated successfully!");
        setTimeout(() => setProfileSuccess(false), 3000);
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setProfileError(msg);
        toast.error(msg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Determine dirty state based strictly on activeMode
  const isPersonalDirty =
    activeMode === "personal" &&
    (nameInput.trim() !== (fullName || "").trim() ||
      usernameInput.trim().toLowerCase() !== (username || "").trim().toLowerCase() ||
      phoneInput.trim() !== (phone || "").trim() ||
      whatsappInput.trim() !== (whatsapp || "").trim() ||
      emailInput.trim().toLowerCase() !== (email || "").trim().toLowerCase());

  const isBusinessDirty =
    activeMode === "merchant" &&
    (nameInput.trim() !== (fullName || "").trim() ||
      companyNameInput.trim() !== (companyName || "").trim() ||
      businessPhoneInput.trim() !== (businessPhone || "").trim() ||
      businessEmailInput.trim().toLowerCase() !== (businessEmail || "").trim().toLowerCase() ||
      logoInput !== (businessLogo || null));

  const isDirty = isPersonalDirty || isBusinessDirty;

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
          {activeMode === "merchant" ? (
            <>
              <Store className="w-5 h-5 text-blue-600" />
              <span>Business &amp; Store Profile</span>
            </>
          ) : (
            <>
              <UserIcon className="w-5 h-5 text-primary" />
              <span>Personal Profile Details</span>
            </>
          )}
        </h2>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              activeMode === "merchant"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {activeMode === "merchant" ? "🏪 Business Mode" : "👤 Personal Mode"}
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-slate mb-6">
        {activeMode === "merchant"
          ? "Manage your commercial store identity, official brand logo, and customer support channels for POS & dispatches."
          : "Manage your display name, username, and contact buttons used by finders on physical sticker reports."}
      </p>

      <form onSubmit={handleProfileSave} className="space-y-6">
        {profileError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{profileError}</span>
          </div>
        )}

        {profileSuccess && (
          <div className="bg-green-50 border border-green-200 text-accent p-4 rounded-xl text-xs flex gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE A: PERSONAL PROFILE ONLY */}
        {/* ========================================================================= */}
        {activeMode === "personal" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-primary mb-1.5">
                  Display Name / Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  required
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Account owner name (shared identically with Business mode).
                </span>
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-primary mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  required
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Lowercase letters, numbers, underscores, and hyphens.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-primary mb-1">
                Personal Contact Channels (At least 1 required)
              </label>
              <p className="text-[11px] text-neutral-slate mb-3">
                Finders will use these buttons on your item verification page to contact you directly if an item is found.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="settings_phone" className="block text-[11px] font-semibold text-primary mb-1">
                    📞 Phone Number (Calls)
                  </label>
                  <input
                    id="settings_phone"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. +2348012345678"
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="settings_whatsapp" className="block text-[11px] font-semibold text-primary mb-1">
                    💬 WhatsApp Number
                  </label>
                  <input
                    id="settings_whatsapp"
                    type="tel"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="e.g. +2348012345678"
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="settings_email" className="block text-[11px] font-semibold text-primary mb-1">
                    ✉️ Email Address
                  </label>
                  <input
                    id="settings_email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. owner@example.com"
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE B: BUSINESS & STORE PROFILE ONLY */}
        {/* ========================================================================= */}
        {activeMode === "merchant" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Account Owner Name (Shared) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ownerFullName" className="block text-xs font-semibold text-primary mb-1.5">
                  Account Owner / Representative Name *
                </label>
                <input
                  type="text"
                  id="ownerFullName"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  required
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Account owner name (shared identically with Personal mode).
                </span>
              </div>

              <div>
                <label htmlFor="companyName" className="block text-xs font-semibold text-primary mb-1.5">
                  Store / Business Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  placeholder="e.g. Acme Supermarket or Big Eazi Logistics"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary font-semibold focus:outline-none focus:border-accent"
                  required
                  maxLength={80}
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Appears on customer digital receipts, invoices, and dispatch tracking.
                </span>
              </div>
            </div>

            {/* Official Business Logo Upload */}
            <div className="p-4 rounded-xl border border-neutral-mist bg-neutral-cream/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-primary">
                    Official Business Logo
                  </label>
                  <p className="text-[11px] text-neutral-slate">
                    Appears on customer digital receipts, counter POS screens, and dispatch receipts.
                  </p>
                </div>
                {logoInput && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {logoInput ? (
                  <div className="relative w-16 h-16 rounded-xl border border-neutral-mist bg-neutral-white overflow-hidden shrink-0 shadow-xs flex items-center justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoInput}
                      alt="Business Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-mist bg-neutral-white flex items-center justify-center text-neutral-slate/60 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="business-logo-upload"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-slate/20 bg-neutral-white hover:bg-neutral-mist/50 text-xs font-bold text-primary shadow-xs cursor-pointer transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isReadingLogo ? "Processing..." : logoInput ? "Change Logo" : "Upload Business Logo"}</span>
                    <input
                      id="business-logo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      disabled={isReadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-neutral-slate/70 mt-1">
                    Supported formats: PNG, JPG, WebP. Resized and optimized automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Business Support Channels */}
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                Customer Support &amp; Dispatch Channels
              </label>
              <p className="text-[11px] text-neutral-slate mb-3">
                Printed on digital customer receipts and accessible to package recipients.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessPhone" className="block text-[11px] font-semibold text-primary mb-1">
                    📞 Business Support Phone
                  </label>
                  <input
                    type="tel"
                    id="businessPhone"
                    value={businessPhoneInput}
                    onChange={(e) => setBusinessPhoneInput(e.target.value)}
                    placeholder="e.g. +2348001234567"
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="businessEmail" className="block text-[11px] font-semibold text-primary mb-1">
                    ✉️ Business Support Email
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    value={businessEmailInput}
                    onChange={(e) => setBusinessEmailInput(e.target.value)}
                    placeholder="e.g. support@yourcompany.com"
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NOTIFICATION PREFERENCES (COMMON UTILITY) */}
        {/* ========================================================================= */}
        <div className="border-t border-neutral-mist pt-6 space-y-4">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Notification Preferences</h4>

          <div
            onClick={handleTogglePush}
            className={`bg-neutral-mist/40 border border-neutral-mist rounded-xl p-4 space-y-3 cursor-pointer hover:bg-neutral-mist/60 transition-colors select-none ${
              isRegisteringPush ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">📲 Real-time Mobile Push Notifications</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pushEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {pushEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <span className="block text-[11px] text-neutral-slate leading-normal">
                  Receive instant alerts on your screen when an item is scanned or when a shipment handover occurs.
                </span>
              </div>

              <div
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pushEnabled ? "bg-accent" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={pushEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    pushEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>

            {pushStatusMsg && (
              <div className="text-[11px] font-medium text-accent pt-1">
                {pushStatusMsg}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSaving || isReadingLogo}
            className={`font-semibold rounded-lg px-6 py-2.5 text-xs transition-colors shadow-xs flex items-center gap-2 ${
              isDirty && !isSaving && !isReadingLogo
                ? "bg-primary hover:bg-primary-light text-neutral-white cursor-pointer"
                : "bg-neutral-slate/15 text-neutral-slate border border-neutral-mist cursor-not-allowed opacity-60"
            }`}
          >
            {isSaving ? "Saving..." : activeMode === "merchant" ? "Save Business Settings" : "Save Personal Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
