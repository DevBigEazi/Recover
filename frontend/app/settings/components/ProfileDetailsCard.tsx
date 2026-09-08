"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "react-hot-toast";

interface ProfileDetailsCardProps {
  walletAddress: string;
}

export default function ProfileDetailsCard({ walletAddress }: ProfileDetailsCardProps) {
  const {
    fullName,
    companyName,
    username,
    phone,
    whatsapp,
    email,
    role,
    refetchProfile,
  } = useProfile();

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

  // Sync profile details when loaded
  useEffect(() => {
    if (fullName) setNameInput(fullName);
    if (companyName) setCompanyNameInput(companyName);
    if (username) setUsernameInput(username);
    if (phone) setPhoneInput(phone);
    if (whatsapp) setWhatsappInput(whatsapp);
    if (email) setEmailInput(email);
  }, [fullName, companyName, username, phone, whatsapp, email]);

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
          walletAddress,
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

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
      <h2 className="text-lg font-bold text-primary font-display mb-2">
        {role === "merchant" ? "Company Profile Details" : "Profile Details"}
      </h2>
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            role === "merchant"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
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
                  Receive instant push alerts on your phone or device screen when a scan or report occurs.
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
  );
}
