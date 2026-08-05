"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useWalletDetailsModal } from "thirdweb/react";
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { client } from "@/lib/client";
import { toast } from "react-hot-toast";
import { detectUserCurrency, convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

const TIER_RANKS: Record<string, number> = {
  free: 0,
  pro_starter: 1,
  pro_growth: 2,
  pro_scale: 3,
};

const TIER_NAMES: Record<string, string> = {
  free: "Free Bootstrap",
  pro_starter: "Pro Starter",
  pro_growth: "Pro Growth",
  pro_scale: "Pro Scale",
};

export default function SettingsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const { 
    fullName, 
    companyName,
    username, 
    phone, 
    whatsapp, 
    email, 
    role, 
    plan, 
    billingCycle,
    billingCycleStart,
    shipmentsThisMonth, 
    rolloverQuota,
    overageCharges, 
    apiKey,
    isProfileLoaded,
    refetchProfile 
  } = useProfile();
  const detailsModal = useWalletDetailsModal();

  // API Key state
  const [localApiKey, setLocalApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [showRollKeyModal, setShowRollKeyModal] = useState(false);
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  const activeApiKey = apiKey || localApiKey;

  useEffect(() => {
    if (apiKey) {
      setLocalApiKey(apiKey);
    }
  }, [apiKey]);


  // Profile Form States
  const [nameInput, setNameInput] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Backup Modal States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  // Upgrade Plan Modal States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<"pro_starter" | "pro_growth" | "pro_scale">("pro_growth");
  const [selectedUpgradeCycle, setSelectedUpgradeCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleGenerateApiKey = async () => {
    if (!account) return;
    setIsGeneratingApiKey(true);
    try {
      const res = await fetch("/api/profile/api-key", {
        method: "POST",
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate API Key");
      }
      const data = await res.json();
      setLocalApiKey(data.apiKey);
      toast.success("API Key generated successfully!");
      refetchProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setIsGeneratingApiKey(false);
    }
  };

  // Sync profile details when loaded
  useEffect(() => {
    if (fullName) setNameInput(fullName);
    if (companyName) setCompanyNameInput(companyName);
    if (username) setUsernameInput(username);
    if (phone) setPhoneInput(phone);
    if (whatsapp) setWhatsappInput(whatsapp);
    if (email) setEmailInput(email);
  }, [fullName, companyName, username, phone, whatsapp, email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    if (sessionId) {
      const verifySub = async () => {
        try {
          toast.loading("Verifying subscription checkout...");
          const res = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          toast.dismiss();
          if (res.ok) {
            toast.success("Subscription updated successfully!");
            refetchProfile();
          }
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) {
          toast.dismiss();
          console.error("Subscription verification error:", e);
        }
      };
      verifySub();
    }
  }, [refetchProfile]);

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
    if (!account || isRegisteringPush) return;
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

        const registration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register("/sw.js");
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
            "x-owner-address": account.address,
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
        const registration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready;
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
    if (!account) return;

    setIsSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    // Validation
    const cleanedName = nameInput.trim();
    const cleanedCompanyName = companyNameInput.trim();
    const cleanedUsername = usernameInput.trim().toLowerCase();
    const cleanedPhone = phoneInput.trim();
    const cleanedWhatsapp = whatsappInput.trim();
    const cleanedEmail = emailInput.trim();

    if (role !== "merchant" && (cleanedName.length === 0 || cleanedName.length > 50)) {
      setProfileError("Full Name must be between 1 and 50 characters.");
      toast.error("Full Name must be between 1 and 50 characters.");
      setIsSaving(false);
      return;
    }

    if (role === "merchant" && (cleanedCompanyName.length === 0 || cleanedCompanyName.length > 80)) {
      setProfileError("Company Name must be between 1 and 80 characters.");
      toast.error("Company Name must be between 1 and 80 characters.");
      setIsSaving(false);
      return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
      setProfileError(
        "Username must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens."
      );
      toast.error(
        "Username must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens."
      );
      setIsSaving(false);
      return;
    }

    if (role === "merchant") {
      if (!cleanedPhone || !cleanedEmail) {
        setProfileError("All Business Contact Channels (Support Phone and Support Email) are compulsory.");
        toast.error("Support Phone and Business Support Email are required.");
        setIsSaving(false);
        return;
      }
    } else {
      if (!cleanedPhone && !cleanedWhatsapp && !cleanedEmail) {
        setProfileError(
          "At least one contact method (Phone Number, WhatsApp Number, or Email Address) is required on your profile."
        );
        toast.error(
          "At least one contact method (Phone, WhatsApp, or Email) is required on your profile."
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          fullName: role === "merchant" ? (cleanedName || undefined) : cleanedName,
          companyName: role === "merchant" ? cleanedCompanyName : undefined,
          username: cleanedUsername,
          phone: cleanedPhone,
          whatsapp: role === "merchant" ? undefined : cleanedWhatsapp,
          email: cleanedEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update settings.");
      }

      refetchProfile();
      setProfileSuccess(true);
      toast.success("Profile settings updated successfully!");
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!account) return;
    setIsUpgrading(true);
    try {
      const initRes = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          email: emailInput.trim() || email || "",
          planTier: selectedUpgradeTier,
          billingCycle: selectedUpgradeCycle,
        }),
      });
      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Initialization failed");
      }
      const initData = await initRes.json();
      if (initData.url) {
        window.location.href = initData.url;
      } else {
        throw new Error("Stripe checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg);
      setIsUpgrading(false);
    }
  };

  const handleLaunchExport = () => {
    if (!account) return;
    setShowBackupModal(false);
    detailsModal.open({
      client,
      screen: "export",
    });
  };

  // 1. Auth loading — don't flash the "not signed in" UI while thirdweb restores the session
  if (isAuthLoading || !isProfileLoaded) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </main>
    );
  }

  // 2. Not Connected State Gating
  if (!account) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-12 text-center mt-12">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary font-display mb-2">Sign In to View Settings</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Please connect your account to view and manage your profile settings.
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href={role === "merchant" ? "/shipments" : "/dashboard"}
            className="text-sm font-medium text-neutral-slate hover:text-primary flex items-center gap-1"
          >
            ← Back to {role === "merchant" ? "Shipments" : "Dashboard"}
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-primary font-display mb-8">
          Account Settings
        </h1>
        <div className="space-y-8">
          {/* 1. Profile Details Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-primary font-display mb-2">
              {role === "merchant" ? "Company Profile Details" : "Profile Details"}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                role === "merchant"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}>
                {role === "merchant" ? "🏢 Company Account" : "👤 Individual Account"}
              </span>
            </div>
            <p className="text-xs text-neutral-slate mb-6">
              {role === "merchant"
                ? "Manage your company name and logistics dispatch username."
                : "Manage your display name and username associated with physical sticker reports."}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name — merchants only */}
                {role === "merchant" && (
                  <div className="md:col-span-2">
                    <label htmlFor="companyName" className="block text-xs font-semibold text-primary mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      placeholder="e.g. Acme Logistics Ltd"
                      className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent font-semibold"
                      required
                      maxLength={80}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-primary mb-2">
                    {role === "merchant" ? "Primary Contact Name (Optional)" : "Display Name / Full Name"}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={role === "merchant" ? "e.g. Jane Smith" : "Enter your name"}
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                    required={role !== "merchant"}
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-primary mb-2">
                    {role === "merchant" ? "Logistics ID / Username" : "Username"}
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder={role === "merchant" ? "e.g. acme_dispatch" : "e.g. johndoe"}
                    className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                    required
                  />
                  <span className="block text-[10px] text-neutral-slate mt-1.5 leading-relaxed">
                    Allowed characters: lowercase letters, numbers, underscores, and hyphens.
                  </span>
                </div>

                {/* Permanent Contact Channels */}
                <div className="md:col-span-2 border-t border-neutral-mist pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      {role === "merchant" ? "Support Contact Channels" : "Permanent Contact Channels (At least 1 required)"}
                    </h4>
                    <p className="text-[11px] text-neutral-slate mt-0.5">
                      {role === "merchant"
                        ? "Both customer support phone line and support email details are mandatory for logistics company tracking updates."
                        : "Finders will use these buttons on your item verify page to contact you directly when an item is found."}
                    </p>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-${role === "merchant" ? 2 : 3} gap-4`}>
                    <div>
                      <label htmlFor="settings_phone" className="block text-xs font-semibold text-primary mb-1.5">
                        {role === "merchant" ? "📞 Support Phone Number *" : "📞 Phone Number (Calls)"}
                      </label>
                      <input
                        id="settings_phone"
                        type="tel"
                        required={role === "merchant"}
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. +2348012345678"
                        className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                      />
                    </div>

                    {role !== "merchant" && (
                      <div>
                        <label htmlFor="settings_whatsapp" className="block text-xs font-semibold text-primary mb-1.5">
                          💬 WhatsApp Number
                        </label>
                        <input
                          id="settings_whatsapp"
                          type="tel"
                          value={whatsappInput}
                          onChange={(e) => setWhatsappInput(e.target.value)}
                          placeholder="e.g. +2348012345678"
                          className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="settings_email" className="block text-xs font-semibold text-primary mb-1.5">
                        {role === "merchant" ? "✉️ Business Support Email *" : "✉️ Email Address"}
                      </label>
                      <input
                        id="settings_email"
                        type="email"
                        required={role === "merchant"}
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={role === "merchant" ? "e.g. support@acme.com" : "e.g. owner@example.com"}
                        className="w-full bg-neutral-mist border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-mist pt-6 space-y-5">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Notification Preferences</h4>
                
                {/* Mobile & Web Push Notifications Toggle Card */}
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
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pushEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {pushEnabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <span className="block text-[11px] text-neutral-slate leading-normal">
                        Receive instant push alerts on your phone or device screen when a scan or report occurs.
                      </span>
                    </div>

                    {/* Interactive Toggle Switch (Visual Representation) */}
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

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? "Saving profile details..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* 1.5. Billing & Subscription Section */}
          {role === "merchant" ? (
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  📦 Logistics &amp; Delivery Subscription
                </h2>
                <p className="text-xs text-neutral-slate mt-1">
                  Manage your active SaaS shipments subscription tier and monthly dispatch quota.
                </p>
              </div>

              <div className="border border-neutral-mist rounded-2xl p-5 space-y-5 bg-neutral-mist/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-mist pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">Active Plan</span>
                    <h4 className="text-sm font-extrabold text-primary">
                      {plan === "pro_starter"
                        ? "Pro Starter Tier"
                        : plan === "pro_growth"
                        ? "Pro Growth Tier"
                        : plan === "pro_scale"
                        ? "Pro Scale Tier"
                        : plan === "pro"
                        ? "Pro Tier"
                        : "Free Bootstrap Tier"}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan !== "free" ? (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
                        {billingCycle === "yearly" ? "Annual Billing · 10% Discount Applied" : "Monthly Billing"}
                      </span>
                    ) : (
                      <span className="bg-neutral-100 text-neutral-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-neutral-200 uppercase">
                        Free Tier
                      </span>
                    )}
                    {(() => {
                      const baseLimit = plan === "pro_starter" ? 10000 : plan === "pro_growth" ? 100000 : plan === "pro_scale" ? 500000 : plan === "pro" ? 100000 : 100;
                      const totalCap = baseLimit + (rolloverQuota || 0);
                      const isFreeLimitReached = plan === "free" && shipmentsThisMonth >= totalCap;
                      const isProOverQuota = plan !== "free" && shipmentsThisMonth >= totalCap;

                      if (isFreeLimitReached) {
                        return (
                          <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-red-200 uppercase">
                            Limit Reached
                          </span>
                        );
                      }
                      if (isProOverQuota) {
                        return (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase">
                            Metered Overage Active
                          </span>
                        );
                      }
                      return (
                        <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-green-200 uppercase">
                          Active
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Shipment Quota &amp; Usage</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary">
                        {shipmentsThisMonth.toLocaleString()} / {(
                          (plan === "pro_starter" ? 10000 : plan === "pro_growth" ? 100000 : plan === "pro_scale" ? 500000 : plan === "pro" ? 100000 : 100) + (rolloverQuota || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                    {billingCycleStart && (
                      <span className="text-[10px] text-neutral-slate block mt-1">
                        📅 Cycle started {new Date(billingCycleStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {rolloverQuota > 0 && (
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                        ✨ +{rolloverQuota.toLocaleString()} unused shipments rolled over from previous plan
                      </span>
                    )}
                  </div>
                  <div className="bg-neutral-white border border-neutral-mist p-4 rounded-xl shadow-xs">
                    <span className="text-[10px] text-neutral-slate font-semibold block mb-0.5">Metered Overage Fees</span>
                    <span className="text-lg font-bold text-primary">{convertUsdPrice(overageCharges, userCurrency).formattedLocal}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-mist">
                  <span className="text-xs text-neutral-slate">
                    Need to adjust your dispatch volume limit or switch billing cycles?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    Upgrade Plan →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  🏷️ Account Billing Model: Pay-As-You-Go
                </h2>
                <p className="text-xs text-neutral-slate mt-1">
                  Individual accounts operate strictly on a Pay-As-You-Go basis per physical sticker registered. No monthly subscriptions, recurring fees, or lock-in contracts.
                </p>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Current Model: Pay-As-You-Go</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
                  Active
                </span>
              </div>
            </div>
          )}

          {/* Developer API Key Card for Merchants */}
          {role === "merchant" && (
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                  🔌 Developer REST API &amp; Secret Authentication Key
                </h2>
                <p className="text-xs text-neutral-slate mt-1">
                  Authenticate server-to-server requests from your e-commerce backend (Shopify, WooCommerce, custom ERP) without logging in.
                </p>
              </div>

              {/* Rule 9 Security Notice */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Secret API Key Security Notice:</strong> Treat your Secret API key like a password. Store it securely in your server&apos;s environment variables. Never expose it in client-side browser code or public repositories.
                </div>
              </div>

              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider block">Secret API Key</span>
                    <code className="text-xs sm:text-sm font-mono font-bold text-primary bg-neutral-white px-2.5 py-1 rounded border border-neutral-mist inline-block mt-0.5">
                      {activeApiKey ? (showApiKey ? activeApiKey : `${activeApiKey.slice(0, 12)}••••••••••••••••`) : "No API Key generated yet"}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeApiKey && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary p-1.5 rounded-lg transition-colors cursor-pointer"
                          title={showApiKey ? "Hide API Key" : "Reveal API Key"}
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeApiKey) {
                              navigator.clipboard.writeText(activeApiKey);
                              toast.success("API Key copied to clipboard!");
                            }
                          }}
                          className="bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Copy
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeApiKey) {
                          setShowRollKeyModal(true);
                        } else {
                          handleGenerateApiKey();
                        }
                      }}
                      disabled={isGeneratingApiKey}
                      className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingApiKey ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                      ) : activeApiKey ? (
                        "Roll Key 🔄"
                      ) : (
                        "Generate API Key ✨"
                      )}
                    </button>
                  </div>
                </div>

                <Link href="/developers" className="text-xs text-accent underline">Learn how to integrate Recover via API →</Link>
              </div>
            </div>
          )}

          {/* 2. Account Credentials Backup Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
                🔑 Account Credentials Backup
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Generate a backup key of your digital recovery account. Keep it offline and safe.
              </p>
            </div>

            <div className="bg-[#1e2a4a05] border border-neutral-mist rounded-2xl p-4 sm:p-6 space-y-4">
              <h4 className="text-xs font-bold text-primary">Why is this important?</h4>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Your recovery account is safely linked to your sign-in email or social login, allowing you to access your registered items on any device. However, you can export a secure credentials backup key for your records. This backup key ensures you always retain direct, independent control of your account.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmTerms(false);
                    setShowBackupModal(true);
                  }}
                  className="bg-accent hover:bg-accent/90 text-neutral-white font-semibold rounded-lg px-5 py-2.5 text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Backup Credentials
                </button>
              </div>
            </div>
          </div>

          {/* 3. Linked Session & Accounts Info */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display">Linked Session Info</h2>
            <div className="border border-neutral-mist rounded-xl p-4 space-y-2.5 text-xs text-neutral-slate bg-neutral-mist/20">
              <div className="flex justify-between">
                <span className="font-medium text-primary">Account ID:</span>
                <span className="font-mono text-primary font-semibold break-all text-right max-w-50 sm:max-w-xs">{account.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-primary">Session Status:</span>
                <span className="text-green-600 font-semibold uppercase tracking-wider text-[10px]">Active</span>
              </div>
            </div>
          </div>

          {/* 4. Danger Zone */}
          <div className="bg-neutral-white border border-red-100 rounded-2xl p-6 sm:p-8 shadow-xs border-t-4 border-t-red-500 space-y-4">
            <h2 className="text-lg font-bold text-red-600 font-display">Danger Zone</h2>
            <p className="text-xs text-neutral-slate">
              Once you delete or reset your profile credentials, the action is irreversible. All physical stickers registered under this profile ID will lose their display names.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert("Please contact Recover Support at support@recover.platform to request full account data deletion.")}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-lg px-5 py-2.5 text-xs transition-colors cursor-pointer"
              >
                Reset Profile Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-full shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-primary font-display">
                  Critical Credentials Security Alert
                </h3>
                <div className="text-xs text-neutral-slate leading-relaxed space-y-2">
                  <p>
                    You are about to reveal your account's private credential key.
                  </p>
                  <p className="font-semibold text-red-600 bg-red-50/50 p-2 border border-red-100 rounded-lg">
                    ⚠️ WARNING: Anyone who obtains this key will have absolute control over your profile and your physical items.
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Never paste this key into any website, app, or email.</li>
                    <li>Never share this key with anyone, including our support team.</li>
                    <li>We will never prompt you to enter this key unless you explicitly choose to restore your account.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Checkbox confirmation */}
            <div className="border-t border-neutral-mist pt-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmTerms}
                  onChange={(e) => setConfirmTerms(e.target.checked)}
                  className="mt-1 accent-accent"
                />
                <span className="text-xs text-primary leading-normal">
                  I understand that this key must be kept secret and offline, and that exposing it gives anyone full control of my registered items.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunchExport}
                disabled={!confirmTerms}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-neutral-white font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Proceed to Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Upgrade Plan Modal */}
      {showUpgradeModal && (() => {
        const currentRank = TIER_RANKS[plan || "free"] || 0;
        const targetRank = TIER_RANKS[selectedUpgradeTier] || 0;
        const isDowngrade = targetRank < currentRank;
        const isSameTier = targetRank === currentRank;
        const currentName = TIER_NAMES[plan || "free"] || "Current Plan";
        const targetName = TIER_NAMES[selectedUpgradeTier] || "Selected Plan";

        const isCycleDowngrade = isSameTier && billingCycle === "yearly" && selectedUpgradeCycle === "monthly";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827b3] backdrop-blur-xs animate-fade-in">
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-mist pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-primary font-display">
                    {isDowngrade ? "Change Logistics Subscription Tier" : "Upgrade Logistics Subscription Tier"}
                  </h3>
                  <p className="text-xs text-neutral-slate mt-0.5">
                    Select a plan tier and cycle. Changes take effect in real time upon payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-neutral-slate hover:text-primary font-bold text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Downgrade Warning Notice */}
              {isDowngrade && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="shrink-0 text-base mt-0.5">⚠️</span>
                  <div className="space-y-0.5">
                    <strong className="font-bold text-amber-950 block text-xs">Plan Downgrade &amp; Rollover Notice</strong>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You are currently active on <strong>{currentName}</strong>. Selecting <strong>{targetName}</strong> will switch your plan tier upon checkout. All remaining unused shipment capacity from your current plan will automatically roll over into your account so no paid quota is lost.
                    </p>
                  </div>
                </div>
              )}

              {/* Monthly vs Annual Cycle Toggle */}
              <div className="flex items-center justify-center gap-2 p-1.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedUpgradeCycle("monthly")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedUpgradeCycle === "monthly"
                      ? "bg-neutral-white text-primary shadow-xs"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUpgradeCycle("yearly")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedUpgradeCycle === "yearly"
                      ? "bg-primary text-neutral-white shadow-xs"
                      : "text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                    SAVE 10%
                  </span>
                </button>
              </div>

              {/* 3 Pro Tier Cards */}
              <div className="space-y-2.5">
                {/* Pro Starter */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_starter"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_starter")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_starter"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_starter"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Starter Tier</span>
                      {plan === "pro_starter" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                      {(TIER_RANKS["pro_starter"] < currentRank) && (
                        <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Lower Tier (Disabled)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">0 – 9,999 shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(162, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(15, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(13.5, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>

                {/* Pro Growth */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_growth"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_growth")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_growth"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_growth"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Growth Tier</span>
                      {plan === "pro_growth" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                      {(TIER_RANKS["pro_growth"] < currentRank) && (
                        <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Lower Tier (Disabled)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">10,000 – 99,999 shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(486, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(45, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(40.5, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>

                {/* Pro Scale */}
                <button
                  type="button"
                  disabled={TIER_RANKS["pro_scale"] < currentRank}
                  onClick={() => setSelectedUpgradeTier("pro_scale")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    TIER_RANKS["pro_scale"] < currentRank
                      ? "border-neutral-mist/60 bg-neutral-mist/10 opacity-50 cursor-not-allowed"
                      : selectedUpgradeTier === "pro_scale"
                      ? "border-accent bg-neutral-white ring-2 ring-accent cursor-pointer shadow-xs"
                      : "border-neutral-mist hover:border-gray-300 bg-neutral-mist/20 cursor-pointer"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-extrabold text-primary">Pro Scale Tier</span>
                      {plan === "pro_scale" && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">Current Plan</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-slate">500,000+ shipments / mo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-accent block">
                      {selectedUpgradeCycle === "yearly"
                        ? `${convertUsdPrice(1080, userCurrency).formattedLocal} / yr (Annual Billing)`
                        : `${convertUsdPrice(100, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                    </span>
                    {selectedUpgradeCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        {convertUsdPrice(90, userCurrency).formattedLocal} / mo (effective)
                      </span>
                    )}
                  </div>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary border border-gray-300 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpgradePlan}
                  disabled={isUpgrading || (isSameTier && billingCycle === selectedUpgradeCycle) || targetRank < currentRank || isCycleDowngrade}
                  className="bg-accent hover:bg-accent-light text-neutral-white font-bold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading Stripe Checkout...</span>
                    </>
                  ) : isSameTier && (billingCycle === selectedUpgradeCycle || isCycleDowngrade) ? (
                    <span>Current Active Plan</span>
                  ) : (
                    <span>
                      {isSameTier ? "Switch to " : "Upgrade to "}
                      {selectedUpgradeTier === "pro_starter"
                        ? (selectedUpgradeCycle === "yearly" ? convertUsdPrice(162, userCurrency).formattedLocal : convertUsdPrice(15, userCurrency).formattedLocal)
                        : selectedUpgradeTier === "pro_growth"
                        ? (selectedUpgradeCycle === "yearly" ? convertUsdPrice(486, userCurrency).formattedLocal : convertUsdPrice(45, userCurrency).formattedLocal)
                        : (selectedUpgradeCycle === "yearly" ? convertUsdPrice(1080, userCurrency).formattedLocal : convertUsdPrice(100, userCurrency).formattedLocal)
                      } / {selectedUpgradeCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Roll API Key Confirmation Modal */}
      {showRollKeyModal && (
        <div className="fixed inset-0 bg-neutral-primary/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold font-display">Roll Secret API Key?</h3>
            </div>

            <p className="text-xs text-neutral-slate leading-relaxed">
              Rolling your API key will <strong>immediately revoke and invalidate your current secret key</strong>. Any e-commerce store, Shopify app, WooCommerce plugin, or backend server using the old API key will be disconnected until updated with the new key.
            </p>

            <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-3 text-[11px] font-mono text-neutral-slate">
              Current Key: {activeApiKey ? `${activeApiKey.slice(0, 16)}••••` : "None"}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-mist">
              <button
                type="button"
                onClick={() => setShowRollKeyModal(false)}
                className="bg-neutral-mist hover:bg-neutral-mist/80 text-primary font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRollKeyModal(false);
                  await handleGenerateApiKey();
                }}
                disabled={isGeneratingApiKey}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isGeneratingApiKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, Revoke & Roll Key 🔄"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

