"use client";

import React, { useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2, User, UserCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { client } from "@/lib/client";
import { getUserEmail } from "thirdweb/wallets/in-app";
import { detectUserCurrency, convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

interface ProfileSetupGateProps {
  children: React.ReactNode;
}

export function ProfileSetupGate({ children }: ProfileSetupGateProps) {
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { isOpenSetup, isProfileLoaded, isError, refetchProfile, closeProfileSetup } = useProfile();
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/about" || pathname.startsWith("/verify/");

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"user" | "merchant">("user");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro_starter" | "pro_growth" | "pro_scale">("pro_starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [randomSuffix] = useState(() => Math.floor(100 + Math.random() * 900));

  const [hasAccess, setHasAccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  React.useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const unlocked = localStorage.getItem("recover_access_unlocked") === "true";
      setHasAccess(unlocked);
    }
  }, []);

  React.useEffect(() => {
    const fetchWalletEmail = async () => {
      if (activeWallet) {
        try {
          const mail = await getUserEmail({ client });
          if (mail) {
            setEmail(mail);
            return;
          }
        } catch {
          // fallback
        }

        try {
          const walletWithProfile = activeWallet as unknown as {
            getProfiles?: () => Promise<Array<{ type: string; email?: string }>>;
          };
          if (walletWithProfile.getProfiles) {
            const profiles = await walletWithProfile.getProfiles();
            const emailProfile = profiles.find((p) => p.email);
            if (emailProfile && emailProfile.email) {
              setEmail(emailProfile.email);
            }
          }
        } catch (err) {
          console.error("Failed to fetch wallet email profile:", err);
        }
      }
    };

    if (!email) {
      fetchWalletEmail();
    }
  }, [activeWallet, email]);

  const handleVerifyAccess = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const trimmed = accessCode.trim().toUpperCase();
    const validCodes = ["RECOVER2026", "ALPHA2026", "INVITE2026"];
    if (process.env.NEXT_PUBLIC_ACCESS_CODE) {
      validCodes.push(process.env.NEXT_PUBLIC_ACCESS_CODE.trim().toUpperCase());
    }

    if (validCodes.includes(trimmed)) {
      if (typeof window !== "undefined") {
        localStorage.setItem("recover_access_unlocked", "true");
      }
      setHasAccess(true);
    } else {
      setAccessError("Invalid invite or access code. Please try again.");
    }
  };

  // 1. Hydration safety loading state
  if (!isMounted && account && !isPublicPage) {
    return (
      <div className="min-h-screen bg-neutral-mist flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs font-medium text-neutral-slate">Verifying access...</span>
      </div>
    );
  }

  // 2. Private Beta Access Restricted Screen
  if (account && !hasAccess && !isPublicPage) {
    return (
      <div className="min-h-screen bg-neutral-mist flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-amber-50 rounded-full text-amber-500 border border-amber-100 animate-pulse">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary font-display">Alpha-Testing Access</h2>
            <p className="text-xs text-neutral-slate max-w-xs mx-auto leading-normal">
              Recover is currently in invite-only alpha-testing. Please enter your invite code to continue.
            </p>
          </div>

          <form onSubmit={handleVerifyAccess} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="invite-code" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                required
                placeholder="Enter invite code (e.g. ACCESS2026)"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setAccessError(null);
                }}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono text-center tracking-widest uppercase font-semibold"
              />
            </div>

            {accessError && (
              <p className="text-xs font-medium text-red-600 animate-fade-in">
                {accessError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. If wallet is connected but profile is still loading, show global loader
  if (account && !isProfileLoaded && !isPublicPage) {
    return (
      <div className="min-h-screen bg-neutral-mist flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs font-medium text-neutral-slate">Loading profile...</span>
      </div>
    );
  }

  // 1.5 If there is a query load error, intercept with a reload card
  if (account && isError && !isPublicPage) {
    return (
      <div className="min-h-screen bg-neutral-mist flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl p-6 text-center space-y-4 animate-fade-in">
          <div className="flex justify-center text-red-500 text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-primary">Connection Lost</h2>
          <p className="text-xs text-neutral-slate max-w-xs mx-auto">
            We encountered a database error while checking your profile. Please make sure the dev server is running and has been restarted.
          </p>
          <button
            onClick={refetchProfile}
            className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // 2. If profile setup is not done and account is logged in, intercept rendering with the setup card
  if (account && isOpenSetup && !isPublicPage) {

    const handleProPayment = async () => {
      if (!email.trim()) {
        toast.error("Please provide an email address first to proceed with the subscription payment.");
        return;
      }
      setIsUpgrading(true);

      try {
        const initRes = await fetch("/api/subscription/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: account.address,
            email: email.trim(),
            planTier: selectedPlan,
            billingCycle: billingCycle,
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
        const msg = err instanceof Error ? err.message : "Billing failed";
        toast.error(msg);
        setIsUpgrading(false);
      }
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (accountType === "user" && !fullName.trim()) return;
      if (!username.trim()) return;
      if (accountType === "merchant" && !companyName.trim()) return;

      const cleanedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
        setError(
          "Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens."
        );
        toast.error(
          "Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens."
        );
        return;
      }

      if (accountType === "merchant") {
        if (!companyName.trim()) {
          setError("Company name is required.");
          toast.error("Please enter your company name.");
          return;
        }
        if (!phone.trim() || !email.trim()) {
          setError("All Business Contact Channels (Support Phone and Support Email) are compulsory.");
          toast.error("Support Phone and Business Support Email are required.");
          return;
        }
      } else {
        if (!phone.trim() && !whatsapp.trim() && !email.trim()) {
          setError(
            "At least one contact method (Phone Number, WhatsApp Number, or Email Address) is required so finders can reach you."
          );
          toast.error(
            "At least one contact method (Phone, WhatsApp, or Email) is required."
          );
          return;
        }
      }

      if (step === 1 && accountType === "merchant") {
        // Transition to plan selection screen
        setStep(2);
        return;
      }

      if (step === 2 && accountType === "merchant" && selectedPlan !== "free") {
        await handleProPayment();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: account.address,
            fullName: accountType === "merchant" && !fullName.trim() ? companyName.trim() : (fullName.trim() || undefined),
            companyName: accountType === "merchant" ? companyName.trim() : undefined,
            username: cleanedUsername,
            phone: phone.trim(),
            whatsapp: accountType === "merchant" ? undefined : whatsapp.trim(),
            email: email.trim(),
            role: accountType,
            plan: accountType === "merchant" ? selectedPlan : "free",
            billingCycle: accountType === "merchant" ? billingCycle : "monthly",
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to save profile.");
        }

        toast.success("Profile setup complete!");
        refetchProfile();
        closeProfileSetup();
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Failed to update profile.";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-neutral-mist flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl overflow-hidden animate-fade-in flex flex-col">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-neutral-mist text-center space-y-1">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-accent/15 rounded-full text-accent">
                <User className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-primary font-display">
              Complete Your Profile
            </h2>
            <p className="text-xs text-neutral-slate max-w-xs mx-auto">
              {accountType === "user"
                ? "Choose your profile display details and at least one contact method so finders can reach you when items are found."
                : "Set up your company profile details. Customer support phone line and business email are compulsory for deliveries."}
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {step === 1 ? (
              <>
                {/* Account Type Options */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-neutral-slate uppercase tracking-wider">
                    I want to use Recover as a:
                  </span>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType("user")}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        accountType === "user"
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-extrabold text-primary">Individual User</span>
                        {accountType === "user" && <span className="text-xs text-accent">●</span>}
                      </div>
                      <p className="text-[11px] text-neutral-slate leading-normal">
                        Register personal items (keys, phones, pets) and configure contact details for lost alerts.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("merchant")}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        accountType === "merchant"
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-extrabold text-primary">Logistics / Delivery Company</span>
                        {accountType === "merchant" && <span className="text-xs text-accent">●</span>}
                      </div>
                      <p className="text-[11px] text-neutral-slate leading-normal">
                        Track tamper-proof deliveries, print dispatch QR codes, and receive webhook triggers.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Standard Profile Fields */}
                <div className="space-y-4 pt-2 border-t border-neutral-mist">
                  {/* Company Name — merchants only */}
                  {accountType === "merchant" && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="gate-company-name"
                        className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                      >
                        Company Name *
                      </label>
                      <input
                        id="gate-company-name"
                        type="text"
                        required
                        maxLength={80}
                        placeholder="e.g. Acme Logistics Ltd"
                        value={companyName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompanyName(val);
                          if (!isUsernameManuallyEdited) {
                            const baseSlug = val
                              .toLowerCase()
                              .replace(/[^\w\s-]/g, "")
                              .replace(/[\s_-]+/g, "_");
                            if (baseSlug) {
                              const maxBaseLength = 30 - String(randomSuffix).length - 1;
                              const truncatedBase = baseSlug.substring(0, maxBaseLength);
                              setUsername(`${truncatedBase}_${randomSuffix}`);
                            } else {
                              setUsername("");
                            }
                          }
                        }}
                        disabled={isLoading}
                        className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-semibold"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="gate-full-name"
                      className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                    >
                      {accountType === "user" ? "Full Name" : "Primary Contact Name (Optional)"}
                    </label>
                    <input
                      id="gate-full-name"
                      type="text"
                      required={accountType === "user"}
                      maxLength={50}
                      placeholder={accountType === "user" ? "e.g. John Doe" : "e.g. Jane Smith (optional)"}
                      value={fullName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFullName(val);
                        if (accountType === "user" && !isUsernameManuallyEdited) {
                          const baseSlug = val
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/[\s_-]+/g, "_");
                          if (baseSlug) {
                            const maxBaseLength = 30 - String(randomSuffix).length - 1;
                            const truncatedBase = baseSlug.substring(0, maxBaseLength);
                            setUsername(`${truncatedBase}_${randomSuffix}`);
                          } else {
                            setUsername("");
                          }
                        }
                      }}
                      disabled={isLoading}
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="gate-username"
                      className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                    >
                      {accountType === "user" ? "Username" : "Logistics ID / Username"}
                    </label>
                    <input
                      id="gate-username"
                      type="text"
                      required
                      maxLength={30}
                      placeholder={accountType === "user" ? "e.g. johndoe" : "e.g. acme_dispatch"}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setIsUsernameManuallyEdited(true);
                      }}
                      disabled={isLoading}
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                    />
                    <p className="text-[10px] text-neutral-slate mt-0.5">
                      3-30 characters, lowercase letters, numbers, _ or - only.
                    </p>
                  </div>

                  {/* Contact Channels */}
                  <div className="border-t border-neutral-mist pt-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        {accountType === "user" ? "Contact Channels (At Least 1 Compulsory)" : "Business Contact Channels"}
                      </h4>
                      <p className="text-[11px] text-neutral-slate mt-0.5">
                        {accountType === "user"
                          ? "Finders will use these buttons on your item verify page to contact you directly."
                          : "Both customer support phone line and support email details are mandatory for logistics company tracking updates."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="gate_phone" className="block text-xs font-semibold text-neutral-slate">
                        {accountType === "user" ? "📞 Phone Number (For Calls)" : "📞 Customer Support Line *"}
                      </label>
                      <input
                        id="gate_phone"
                        type="tel"
                        required={accountType === "merchant"}
                        placeholder="e.g. +2348012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                      />
                    </div>

                    {/* WhatsApp — individual users only */}
                    {accountType === "user" && (
                      <div className="space-y-1.5">
                        <label htmlFor="gate_whatsapp" className="block text-xs font-semibold text-neutral-slate">
                          💬 WhatsApp Number
                        </label>
                        <input
                          id="gate_whatsapp"
                          type="tel"
                          placeholder="e.g. +2348012345678"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          disabled={isLoading}
                          className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="gate_email" className="block text-xs font-semibold text-neutral-slate">
                        {accountType === "user" ? "✉️ Email Address" : "✉️ Business Support Email *"}
                      </label>
                      <input
                        id="gate_email"
                        type="email"
                        required={accountType === "merchant"}
                        placeholder={accountType === "user" ? "e.g. owner@example.com" : "e.g. support@acme.com"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    (accountType === "user" && !fullName.trim()) ||
                    !username.trim() ||
                    (accountType === "merchant" && !companyName.trim()) ||
                    (accountType === "user" && !phone.trim() && !whatsapp.trim() && !email.trim()) ||
                    (accountType === "merchant" && (!phone.trim() || !email.trim()))
                  }
                  className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4"
                >
                  {accountType === "merchant" ? "Next: Choose Plan →" : "Complete Registration ✓"}
                </button>
              </>
            ) : (
              <>
                {/* Step 2 Plan Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                      Select Logistics Plan:
                    </h3>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-neutral-slate hover:text-primary font-semibold"
                    >
                      ← Back
                    </button>
                  </div>

                  {/* Monthly vs Annual Billing Toggle */}
                  <div className="flex items-center justify-center gap-2 p-1.5 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("monthly")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        billingCycle === "monthly"
                          ? "bg-neutral-white text-primary shadow-xs"
                          : "text-neutral-slate hover:text-primary"
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("yearly")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        billingCycle === "yearly"
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

                  {/* Plan Tiers Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Pro Starter */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro_starter")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedPlan === "pro_starter"
                          ? "border-accent bg-neutral-white ring-2 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
                      }`}
                    >
                      <span className="block text-xs font-extrabold text-primary">Pro Starter</span>
                      <span className="text-[10px] text-accent font-semibold block mt-0.5">0 – 9,999 shipments</span>
                      <div className="mt-2 text-xs font-bold text-primary">
                        {billingCycle === "yearly"
                          ? convertUsdPrice(162, userCurrency).formattedLocal
                          : convertUsdPrice(15, userCurrency).formattedLocal}
                      </div>
                      <span className="text-[9px] text-neutral-slate block mt-0.5">
                        {billingCycle === "yearly"
                          ? `${convertUsdPrice(13.5, userCurrency).formattedLocal} effective`
                          : "Up to 10k pkgs"}
                      </span>
                    </button>

                    {/* Pro Growth */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro_growth")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedPlan === "pro_growth"
                          ? "border-accent bg-neutral-white ring-2 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
                      }`}
                    >
                      <span className="block text-xs font-extrabold text-primary">Pro Growth</span>
                      <span className="text-[10px] text-accent font-semibold block mt-0.5">10k – 99k shipments</span>
                      <div className="mt-2 text-xs font-bold text-primary">
                        {billingCycle === "yearly"
                          ? convertUsdPrice(486, userCurrency).formattedLocal
                          : convertUsdPrice(45, userCurrency).formattedLocal}
                      </div>
                      <span className="text-[9px] text-neutral-slate block mt-0.5">
                        {billingCycle === "yearly"
                          ? `${convertUsdPrice(40.5, userCurrency).formattedLocal} effective`
                          : "Up to 100k pkgs"}
                      </span>
                    </button>

                    {/* Pro Scale */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("pro_scale")}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedPlan === "pro_scale"
                          ? "border-accent bg-neutral-white ring-2 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white/70"
                      }`}
                    >
                      <span className="block text-xs font-extrabold text-primary">Pro Scale</span>
                      <span className="text-[10px] text-accent font-semibold block mt-0.5">500k+ shipments</span>
                      <div className="mt-2 text-xs font-bold text-primary">
                        {billingCycle === "yearly"
                          ? convertUsdPrice(1080, userCurrency).formattedLocal
                          : convertUsdPrice(100, userCurrency).formattedLocal}
                      </div>
                      <span className="text-[9px] text-neutral-slate block mt-0.5">
                        {billingCycle === "yearly"
                          ? `${convertUsdPrice(90, userCurrency).formattedLocal} effective`
                          : "Up to 500k pkgs"}
                      </span>
                    </button>
                  </div>

                  {/* Free bootstrap option */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan("free")}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedPlan === "free"
                          ? "border-accent bg-neutral-white ring-1 ring-accent"
                          : "border-neutral-mist hover:border-gray-300 bg-neutral-white/50"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-primary">Free Bootstrap Plan</span>
                        <span className="text-[10px] text-neutral-slate ml-2">For initial testing (100 shipments/mo)</span>
                      </div>
                      <span className="text-xs font-extrabold text-primary">$0</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-slate leading-relaxed bg-neutral-mist/30 p-3 rounded-lg border border-neutral-mist/50">
                    * Annual billing includes an automatic 10% discount off standard rates. Stripe Adaptive Pricing presents local currency pricing automatically.
                  </p>
                </div>

                {selectedPlan !== "free" ? (
                  <button
                    type="button"
                    onClick={handleProPayment}
                    disabled={isUpgrading}
                    className="w-full bg-accent hover:bg-accent-light disabled:opacity-50 text-neutral-white font-bold py-3 rounded-xl text-sm transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mt-6"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading Stripe Checkout...</span>
                      </>
                    ) : (
                      <span>
                        Pay {
                          selectedPlan === "pro_starter"
                            ? (billingCycle === "yearly" ? convertUsdPrice(162, userCurrency).formattedLocal : convertUsdPrice(15, userCurrency).formattedLocal)
                            : selectedPlan === "pro_growth"
                            ? (billingCycle === "yearly" ? convertUsdPrice(486, userCurrency).formattedLocal : convertUsdPrice(45, userCurrency).formattedLocal)
                            : (billingCycle === "yearly" ? convertUsdPrice(1080, userCurrency).formattedLocal : convertUsdPrice(100, userCurrency).formattedLocal)
                        } / {billingCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-6"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Confirm &amp; Start Tracking</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </form>
        </div>
      </div>
    );
  }

  // 3. Otherwise, render children normally (user is not logged in or profile setup is complete)
  return <>{children}</>;
}
