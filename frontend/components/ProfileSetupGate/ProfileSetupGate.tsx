"use client";

import React, { useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { useProfile } from "@/context/ProfileContext";
import { Loader2, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { client } from "@/lib/client";
import { getUserEmail } from "thirdweb/wallets/in-app";

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
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [randomSuffix] = useState(() => Math.floor(100 + Math.random() * 900));

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

  // 4. If there is a query load error, intercept with a reload card
  if (account && isError && !isPublicPage) {
    return (
      <div className="min-h-screen bg-neutral-mist flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl p-6 text-center space-y-4 animate-fade-in">
          <div className="flex justify-center text-red-500 text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-primary">Connection Lost</h2>
          <p className="text-xs text-neutral-slate max-w-xs mx-auto">
            We encountered a database error while checking your profile. Please make sure the server is reachable.
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

  // 5. If profile setup is not done and account is logged in, show setup card
  if (account && isOpenSetup && !isPublicPage) {
    const handleSubmit = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (!fullName.trim()) {
        setError("Full name is required.");
        toast.error("Please enter your full name.");
        return;
      }
      if (!username.trim()) {
        setError("Username is required.");
        toast.error("Please enter a username.");
        return;
      }

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

      if (!phone.trim() && !whatsapp.trim() && !email.trim()) {
        setError(
          "At least one contact method (Phone Number, WhatsApp Number, or Email Address) is required so finders can reach you."
        );
        toast.error(
          "At least one contact method (Phone, WhatsApp, or Email) is required."
        );
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
            fullName: fullName.trim(),
            username: cleanedUsername,
            phone: phone.trim() || undefined,
            whatsapp: whatsapp.trim() || undefined,
            email: email.trim() || undefined,
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
              Set up your display name and at least one contact channel so good samaritans can reach you when your items are found.
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="gate-full-name"
                  className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                >
                  Full Name *
                </label>
                <input
                  id="gate-full-name"
                  type="text"
                  required
                  maxLength={50}
                  placeholder="e.g. Alex Johnson"
                  value={fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
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

              {/* Username */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="gate-username"
                    className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                  >
                    Public Handle *
                  </label>
                  <span className="text-[10px] text-neutral-slate">
                    3-30 chars, lowercase, numbers, _, -
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm text-neutral-slate/60 select-none">
                    @
                  </span>
                  <input
                    id="gate-username"
                    type="text"
                    required
                    maxLength={30}
                    placeholder="alex_j"
                    value={username}
                    onChange={(e) => {
                      setIsUsernameManuallyEdited(true);
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                    }}
                    disabled={isLoading}
                    className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl pl-8 pr-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                  />
                </div>
              </div>

              {/* Contact Channels Section */}
              <div className="pt-2 border-t border-neutral-mist space-y-3">
                <span className="block text-xs font-bold text-neutral-slate uppercase tracking-wider">
                  Contact Channels (At least one required)
                </span>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="gate-phone"
                    className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                  >
                    Phone Number
                  </label>
                  <input
                    id="gate-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="gate-whatsapp"
                    className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                  >
                    WhatsApp Number
                  </label>
                  <input
                    id="gate-whatsapp"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    disabled={isLoading}
                    className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="gate-email"
                    className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <input
                    id="gate-email"
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <span>Save & Continue</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
