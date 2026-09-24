"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "react-hot-toast";
import { Upload, X, Image as ImageIcon, Store, User as UserIcon } from "lucide-react";
import ActivateMerchantModal from "./ActivateMerchantModal";

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
    businessHandle,
    activeMode,
    hasPersonalProfile,
    hasMerchantProfile,
    switchMode,
    refetchProfile,
  } = useProfile();

  // Tab State: allows viewing & activating either profile regardless of current activeMode
  const [activeTab, setActiveTab] = useState<"personal" | "merchant">(activeMode);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Sync activeTab if activeMode changes from external trigger
  useEffect(() => {
    setActiveTab(activeMode);
  }, [activeMode]);

  // Form State
  // Form State: strictly decoupled
  const [personalNameInput, setPersonalNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [companyNameInput, setCompanyNameInput] = useState("");
  const [businessRepNameInput, setBusinessRepNameInput] = useState("");
  const [businessHandleInput, setBusinessHandleInput] = useState("");
  const [businessPhoneInput, setBusinessPhoneInput] = useState("");
  const [businessEmailInput, setBusinessEmailInput] = useState("");
  const [logoInput, setLogoInput] = useState<string | null>(null);
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync profile details without cross-contaminating tabs
  useEffect(() => {
    if (fullName) {
      if (hasPersonalProfile) setPersonalNameInput(fullName);
      if (hasMerchantProfile) setBusinessRepNameInput(fullName);
      if (!hasPersonalProfile && !hasMerchantProfile) {
        setPersonalNameInput(fullName);
        setBusinessRepNameInput(fullName);
      }
    }
    if (companyName) setCompanyNameInput(companyName);
    if (businessHandle) setBusinessHandleInput(businessHandle);
    if (businessLogo !== undefined) setLogoInput(businessLogo);
    if (username) setUsernameInput(username);
    if (phone) setPhoneInput(phone);
    if (whatsapp) setWhatsappInput(whatsapp);
    if (email) setEmailInput(email);
    if (businessPhone) setBusinessPhoneInput(businessPhone);
    if (businessEmail) setBusinessEmailInput(businessEmail);
  }, [fullName, companyName, businessHandle, businessLogo, username, phone, whatsapp, email, businessPhone, businessEmail, hasPersonalProfile, hasMerchantProfile]);

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
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = Math.round(height * (MAX_DIM / width));
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round(width * (MAX_DIM / height));
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        setLogoInput(canvas.toDataURL("image/jpeg", 0.75));
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
            if (sub) setPushEnabled(true);
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
          return;
        }

        const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) {
          setPushStatusMsg("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined.");
          toast.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined.");
          return;
        }

        const padding = "=".repeat((4 - (publicVapidKey.length % 4)) % 4);
        const base64 = (publicVapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);

        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: outputArray });
        }

        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-address": walletAddress },
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
        const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
        const subscription = await reg?.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
        setPushEnabled(false);
        setPushStatusMsg("Push Notifications disabled for this device.");
        toast.success("Push Notifications disabled.");
      }
    } catch (err: unknown) {
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

    if (activeTab === "personal") {
      const cleanedPersonalName = personalNameInput.trim();
      const cleanedUsername = usernameInput.trim().toLowerCase();
      const cleanedPhone = phoneInput.trim();
      const cleanedWhatsapp = whatsappInput.trim();
      const cleanedEmail = emailInput.trim();

      if (cleanedPersonalName.length === 0 || cleanedPersonalName.length > 50) {
        setProfileError("Full Name must be between 1 and 50 characters.");
        toast.error("Full Name must be between 1 and 50 characters.");
        setIsSaving(false);
        return;
      }

      if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
        setProfileError("Personal Username must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens.");
        toast.error("Personal Username must be between 3 and 30 characters.");
        setIsSaving(false);
        return;
      }

      if (!cleanedPhone && !cleanedWhatsapp && !cleanedEmail) {
        setProfileError("At least one personal contact method (Phone, WhatsApp, or Email) is required on your profile.");
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
            fullName: cleanedPersonalName,
            username: cleanedUsername,
            phone: cleanedPhone || undefined,
            whatsapp: cleanedWhatsapp || undefined,
            email: cleanedEmail || undefined,
            hasPersonalProfile: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update profile settings.");
        }

        refetchProfile();
        setProfileSuccess(true);
        toast.success(hasPersonalProfile ? "Personal profile updated successfully!" : "Personal profile activated successfully!");
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
      const cleanedBusinessRepName = businessRepNameInput.trim();
      const cleanedCompanyName = companyNameInput.trim();
      const cleanedBusinessHandle = (businessHandleInput || companyNameInput)
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "_")
        .slice(0, 30);
      const cleanedBusinessPhone = businessPhoneInput.trim();
      const cleanedBusinessEmail = businessEmailInput.trim();

      if (cleanedCompanyName.length === 0 || cleanedCompanyName.length > 80) {
        setProfileError("Store or Business Name must be between 1 and 80 characters.");
        toast.error("Store or Business Name must be between 1 and 80 characters.");
        setIsSaving(false);
        return;
      }

      if (!/^[a-z0-9_-]{3,30}$/.test(cleanedBusinessHandle)) {
        setProfileError("Business Handle must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens.");
        toast.error("Business Handle must be between 3 and 30 characters.");
        setIsSaving(false);
        return;
      }

      // If business profile is not yet active, prompt user to select a Merchant Operations Plan!
      if (!hasMerchantProfile) {
        setIsSaving(false);
        setShowPlanModal(true);
        return;
      }

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            fullName: cleanedBusinessRepName || cleanedCompanyName,
            companyName: cleanedCompanyName,
            businessHandle: cleanedBusinessHandle,
            businessLogo: logoInput || undefined,
            businessPhone: cleanedBusinessPhone || undefined,
            businessEmail: cleanedBusinessEmail || undefined,
            hasMerchantProfile: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update business settings.");
        }

        refetchProfile();
        setProfileSuccess(true);
        toast.success(hasMerchantProfile ? "Business profile updated successfully!" : "Business profile activated successfully!");
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

  // Determine dirty state based strictly on activeTab
  const isPersonalDirty = activeTab === "personal" && (personalNameInput.trim() !== (hasPersonalProfile ? (fullName || "").trim() : "") || usernameInput.trim().toLowerCase() !== (username || "").trim().toLowerCase() || phoneInput.trim() !== (phone || "").trim() || whatsappInput.trim() !== (whatsapp || "").trim() || emailInput.trim().toLowerCase() !== (email || "").trim().toLowerCase());
  const isBusinessDirty = activeTab === "merchant" && (businessRepNameInput.trim() !== (hasMerchantProfile ? (fullName || "").trim() : "") || companyNameInput.trim() !== (companyName || "").trim() || businessHandleInput.trim().toLowerCase() !== (businessHandle || "").trim().toLowerCase() || businessPhoneInput.trim() !== (businessPhone || "").trim() || businessEmailInput.trim().toLowerCase() !== (businessEmail || "").trim().toLowerCase() || logoInput !== (businessLogo || null));
  const isDirty = isPersonalDirty || isBusinessDirty;

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
      {/* 1. Active Mode Switcher (Visible only when BOTH profiles are activated) */}
      {hasPersonalProfile && hasMerchantProfile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-cream/40 border border-neutral-slate/15 rounded-xl mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">Active Navigation Mode:</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${activeMode === "merchant" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                {activeMode === "merchant" ? "🏪 Business Mode" : "👤 Personal Mode"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-slate mt-0.5">
              Switch your primary workspace mode for top navigation and dashboards.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-white p-1 rounded-lg border border-neutral-slate/15 shrink-0">
            <button
              type="button"
              onClick={() => switchMode("personal")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeMode === "personal"
                  ? "bg-primary text-neutral-white shadow-xs"
                  : "text-neutral-slate hover:text-primary"
              }`}
            >
              👤 Personal
            </button>
            <button
              type="button"
              onClick={() => switchMode("merchant")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeMode === "merchant"
                  ? "bg-blue-600 text-neutral-white shadow-xs"
                  : "text-neutral-slate hover:text-primary"
              }`}
            >
              🏪 Business
            </button>
          </div>
        </div>
      )}

      {/* 2. Centralized Profile Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-mist mb-6 pb-1 sm:pb-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-1.5 sm:gap-2 pb-1.5 sm:pb-2 px-2 sm:px-3 text-[11px] sm:text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "personal" ? "border-primary text-primary" : "border-transparent text-neutral-slate hover:text-primary"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Personal<span className="hidden sm:inline"> Profile</span></span>
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${hasPersonalProfile ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-slate/10 text-neutral-slate border border-neutral-slate/20"}`}>
              {hasPersonalProfile ? "Active" : "Inactive"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("merchant")}
            className={`flex items-center gap-1.5 sm:gap-2 pb-1.5 sm:pb-2 px-2 sm:px-3 text-[11px] sm:text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "merchant" ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-slate hover:text-primary"
            }`}
          >
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Business<span className="hidden sm:inline"> Profile</span></span>
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${hasMerchantProfile ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-neutral-slate/10 text-neutral-slate border border-neutral-slate/20"}`}>
              {hasMerchantProfile ? "Active" : "Inactive"}
            </span>
          </button>
        </div>
      </div>

      {/* Inactive Profile Guidance Banner */}
      {activeTab === "personal" && !hasPersonalProfile && (
        <div className="mb-6 p-4 rounded-xl bg-neutral-cream/40 border border-neutral-slate/15 text-xs text-neutral-slate">
          <p className="font-semibold text-primary mb-1">Personal Recovery Profile Not Activated</p>
          Fill in your display name, username, and at least one contact method below to activate your personal profile and protect your personal items.
        </div>
      )}

      {activeTab === "merchant" && !hasMerchantProfile && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs text-blue-900">
          <p className="font-semibold text-blue-950 mb-1">Business Store Profile Not Activated</p>
          Configure your business name, logo, and customer support channels below to activate merchant operations (POS receipts, logistics dispatches, API keys, and staff).
        </div>
      )}

      <form onSubmit={handleProfileSave} className="space-y-6">
        {profileError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <span>{profileError}</span>
          </div>
        )}

        {profileSuccess && (
          <div className="bg-green-50 border border-green-200 text-accent p-3 rounded-xl text-xs flex items-center gap-2">
            <span>Profile updated successfully!</span>
          </div>
        )}

        {/* TAB A: PERSONAL PROFILE */}
        {activeTab === "personal" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-primary mb-1.5">
                  Display Name / Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={personalNameInput}
                  onChange={(e) => setPersonalNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  required
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Personal identity displayed on sticker recovery verification.
                </span>
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-primary mb-1.5">
                  Personal Username *
                </label>
                <input
                  type="text"
                  id="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                  placeholder="e.g. johndoe"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  required
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Unique personal handle (e.g. @johndoe) displayed to finders on sticker reports.
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
                  <label htmlFor="settings_phone" className="block text-[11px] font-semibold text-primary mb-1">📞 Phone Number (Calls)</label>
                  <input id="settings_phone" type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="e.g. +2348012345678" className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label htmlFor="settings_whatsapp" className="block text-[11px] font-semibold text-primary mb-1">💬 WhatsApp Number</label>
                  <input id="settings_whatsapp" type="tel" value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} placeholder="e.g. +2348012345678" className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label htmlFor="settings_email" className="block text-[11px] font-semibold text-primary mb-1">✉️ Email Address</label>
                  <input id="settings_email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="e.g. owner@example.com" className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: BUSINESS & STORE PROFILE */}
        {activeTab === "merchant" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Account Owner / Representative Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ownerFullName" className="block text-xs font-semibold text-primary mb-1.5">
                  Account Owner / Representative Name (Optional)
                </label>
                <input
                  type="text"
                  id="ownerFullName"
                  value={businessRepNameInput}
                  onChange={(e) => setBusinessRepNameInput(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                />
                <span className="block text-[10px] text-neutral-slate mt-1">
                  Primary business representative name for invoicing and merchant operations.
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
                  onChange={(e) => {
                    setCompanyNameInput(e.target.value);
                    if (!businessHandleInput) {
                      const slug = e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "_").slice(0, 30);
                      setBusinessHandleInput(slug);
                    }
                  }}
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

            <div>
              <label htmlFor="businessHandle" className="block text-xs font-semibold text-primary mb-1.5">
                Business Handle *
              </label>
              <input
                type="text"
                id="businessHandle"
                value={businessHandleInput}
                onChange={(e) => setBusinessHandleInput(e.target.value.toLowerCase())}
                placeholder="e.g. acme_logistics"
                className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                required
                maxLength={30}
              />
              <span className="block text-[10px] text-neutral-slate mt-1">
                Unique handle (e.g. @acme_logistics) printed on customer digital receipts, invoices, and shipment tracking.
              </span>
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
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${pushEnabled ? "translate-x-5" : "translate-x-0"}`} />
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
            {isSaving
              ? "Saving..."
              : activeTab === "merchant"
              ? hasMerchantProfile
                ? "Save Business Settings"
                : "Activate Business Profile"
              : hasPersonalProfile
              ? "Save Personal Settings"
              : "Activate Personal Profile"}
          </button>
        </div>
      </form>

      {/* Merchant Operations Plan Selection Modal */}
      <ActivateMerchantModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        walletAddress={walletAddress}
        businessDetails={{ fullName: businessRepNameInput || companyNameInput, companyName: companyNameInput, businessHandle: businessHandleInput, businessLogo: logoInput, businessPhone: businessPhoneInput, businessEmail: businessEmailInput }}
        userEmail={email}
        onSuccess={() => refetchProfile()}
      />
    </div>
  );
}
