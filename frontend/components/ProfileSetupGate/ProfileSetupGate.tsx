"use client";

import React, { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2, User, UserCheck } from "lucide-react";
import { usePathname } from "next/navigation";

interface ProfileSetupGateProps {
  children: React.ReactNode;
}

export function ProfileSetupGate({ children }: ProfileSetupGateProps) {
  const account = useActiveAccount();
  const { isOpenSetup, isProfileLoaded, isError, refetchProfile, closeProfileSetup } = useProfile();
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/about" || pathname.startsWith("/verify/");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasAccess, setHasAccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const unlocked = localStorage.getItem("recover_access_unlocked") === "true";
      setHasAccess(unlocked);
    }
  }, []);

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
    const handleSubmit = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (!fullName.trim() || !username.trim()) return;

      setIsLoading(true);
      setError(null);

      const cleanedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
        setError(
          "Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens."
        );
        setIsLoading(false);
        return;
      }

      if (!phone.trim() && !whatsapp.trim() && !email.trim()) {
        setError(
          "At least one contact method (Phone Number, WhatsApp Number, or Email Address) is required so finders can reach you."
        );
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: account.address,
            fullName: fullName.trim(),
            username: cleanedUsername,
            phone: phone.trim(),
            whatsapp: whatsapp.trim(),
            email: email.trim(),
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to save profile.");
        }

        refetchProfile();
        closeProfileSetup();
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to update profile.");
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
              Choose your profile display details and at least one contact method so finders can reach you when items are found.
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="gate-full-name"
                className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
              >
                Full Name
              </label>
              <input
                id="gate-full-name"
                type="text"
                required
                maxLength={50}
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="gate-username"
                className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
              >
                Username
              </label>
              <input
                id="gate-username"
                type="text"
                required
                maxLength={30}
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
              />
              <p className="text-[10px] text-neutral-slate mt-0.5">
                3-30 characters, lowercase letters, numbers, _ or - only.
              </p>
            </div>

            {/* Permanent Contact Channels */}
            <div className="border-t border-neutral-mist pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Contact Channels (At Least 1 Compulsory)
                </h4>
                <p className="text-[11px] text-neutral-slate mt-0.5">
                  Finders will use these buttons on your item verify page to contact you directly.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_phone" className="block text-xs font-semibold text-neutral-slate">
                  📞 Phone Number (For Calls)
                </label>
                <input
                  id="gate_phone"
                  type="tel"
                  placeholder="e.g. +2348012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                />
              </div>

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

              <div className="space-y-1.5">
                <label htmlFor="gate_email" className="block text-xs font-semibold text-neutral-slate">
                  ✉️ Email Address
                </label>
                <input
                  id="gate_email"
                  type="email"
                  placeholder="e.g. owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !fullName.trim() || !username.trim() || (!phone.trim() && !whatsapp.trim() && !email.trim())}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Save & Continue</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Otherwise, render children normally (user is not logged in or profile setup is complete)
  return <>{children}</>;
}
