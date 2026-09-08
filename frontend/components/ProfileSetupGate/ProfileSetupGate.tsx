"use client";

import React, { useState, useEffect } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { client } from "@/lib/client";
import { getUserEmail } from "thirdweb/wallets/in-app";
import { detectUserCurrency, UserCurrencyInfo } from "@/lib/currency";

import StagingAccessModal from "./StagingAccessModal";
import ProfileDetailsStep from "./ProfileDetailsStep";
import MerchantPlanStep from "./MerchantPlanStep";

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
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro_lite" | "pro_starter" | "pro_growth" | "pro_scale">("pro_starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [randomSuffix] = useState(() => Math.floor(100 + Math.random() * 900));

  const [hasAccess, setHasAccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const unlocked = localStorage.getItem("recover_access_unlocked") === "true";
      setHasAccess(unlocked);
    }
  }, []);

  useEffect(() => {
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
    return <StagingAccessModal onVerified={() => setHasAccess(true)} />;
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

  // 4. If there is a query load error, intercept with a reload card
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

  // 5. If profile setup is not done and account is logged in, intercept rendering with the setup card
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
              <ProfileDetailsStep
                accountType={accountType}
                setAccountType={setAccountType}
                fullName={fullName}
                setFullName={setFullName}
                companyName={companyName}
                setCompanyName={setCompanyName}
                username={username}
                setUsername={setUsername}
                isUsernameManuallyEdited={isUsernameManuallyEdited}
                setIsUsernameManuallyEdited={setIsUsernameManuallyEdited}
                randomSuffix={randomSuffix}
                phone={phone}
                setPhone={setPhone}
                whatsapp={whatsapp}
                setWhatsapp={setWhatsapp}
                email={email}
                setEmail={setEmail}
                isLoading={isLoading}
              />
            ) : (
              <MerchantPlanStep
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
                userCurrency={userCurrency}
                isUpgrading={isUpgrading}
                isLoading={isLoading}
                onBack={() => setStep(1)}
                onProPayment={handleProPayment}
              />
            )}
          </form>
        </div>
      </div>
    );
  }

  // 6. Otherwise, render children normally (user is not logged in or profile setup is complete)
  return <>{children}</>;
}
