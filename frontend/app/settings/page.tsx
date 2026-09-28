"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useWalletDetailsModal, useDisconnect, useActiveWallet } from "thirdweb/react";
import { Loader2, ArrowLeft, ShieldCheck, User, Bell, Wallet, ExternalLink, Check, Copy } from "lucide-react";
import { client } from "@/lib/client";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { 
    fullName, 
    username, 
    phone, 
    whatsapp, 
    email, 
    isProfileLoaded, 
    refetchProfile 
  } = useProfile();
  const detailsModal = useWalletDetailsModal();

  // Local form states
  const [localFullName, setLocalFullName] = useState("");
  const [localUsername, setLocalUsername] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localWhatsapp, setLocalWhatsapp] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Sync profile details to local form state on initial load
  useEffect(() => {
    if (fullName) setLocalFullName(fullName);
    if (username) setLocalUsername(username);
    if (phone) setLocalPhone(phone);
    if (whatsapp) setLocalWhatsapp(whatsapp);
    if (email) setLocalEmail(email);
  }, [fullName, username, phone, whatsapp, email]);

  const handleCopyAddress = () => {
    if (account?.address && navigator.clipboard) {
      navigator.clipboard.writeText(account.address);
      setCopiedAddress(true);
      toast.success("Wallet address copied to clipboard");
      setTimeout(() => setCopiedAddress(false), 3000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const cleanedName = localFullName.trim();
    const cleanedUsername = localUsername.trim().toLowerCase();
    const cleanedPhone = localPhone.trim();
    const cleanedWhatsapp = localWhatsapp.trim();
    const cleanedEmail = localEmail.trim();

    if (cleanedName.length === 0 || cleanedName.length > 50) {
      toast.error("Full name must be between 1 and 50 characters.");
      return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
      toast.error("Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens.");
      return;
    }

    if (!cleanedPhone && !cleanedWhatsapp && !cleanedEmail) {
      toast.error("At least one contact method (Phone, WhatsApp, or Email) is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          fullName: cleanedName,
          username: cleanedUsername,
          phone: cleanedPhone || null,
          whatsapp: cleanedWhatsapp || null,
          email: cleanedEmail || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile.");
      }

      toast.success("Profile updated successfully!");
      refetchProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || !isProfileLoaded) {
    return (
      <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
        <div>
          <Header />
          <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!account) {
    return (
      <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
        <div>
          <Header />
          <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-primary font-display">Account Settings</h1>
            <p className="text-sm text-neutral-slate">
              Please sign in with your email, social account, or wallet to manage your profile and notification settings.
            </p>
            <button
              onClick={openLogin}
              className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-6 py-3 text-sm transition-all shadow-md cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary font-display">
                Account &amp; Privacy Settings
              </h1>
              <p className="text-xs sm:text-sm text-neutral-slate">
                Manage your identity, confidential contact channels, and secure notification preferences.
              </p>
            </div>
          </div>

          {/* Profile Form Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-mist flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-primary font-display">Profile Information</h2>
                <p className="text-xs text-neutral-slate">
                  Your personal details and protected contact channels.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="settings-name" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    required
                    maxLength={50}
                    value={localFullName}
                    onChange={(e) => setLocalFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="settings-username" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                    Username / Handle *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm text-neutral-slate/60 select-none">@</span>
                    <input
                      id="settings-username"
                      type="text"
                      required
                      maxLength={30}
                      value={localUsername}
                      onChange={(e) => setLocalUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="alex_j"
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl pl-8 pr-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Channels Section */}
              <div className="pt-4 border-t border-neutral-mist space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-neutral-slate uppercase tracking-wider">
                    Protected Contact Channels
                  </h3>
                  <p className="text-[11px] text-neutral-slate mt-0.5">
                    Finders will only see these channels when they scan a lost item sticker and submit an authentic report.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="settings-phone" className="block text-xs font-semibold text-neutral-slate">
                      📞 Phone Number
                    </label>
                    <input
                      id="settings-phone"
                      type="tel"
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <label htmlFor="settings-whatsapp" className="block text-xs font-semibold text-neutral-slate">
                      💬 WhatsApp
                    </label>
                    <input
                      id="settings-whatsapp"
                      type="tel"
                      value={localWhatsapp}
                      onChange={(e) => setLocalWhatsapp(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="settings-email" className="block text-xs font-semibold text-neutral-slate">
                      ✉️ Email Address
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={localEmail}
                      onChange={(e) => setLocalEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Wallet & Web3 Identity Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-mist flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary font-display">Decentralized Ownership Identity</h2>
                  <p className="text-xs text-neutral-slate">
                    Items are securely anchored to your wallet on Electroneum Mainnet.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-mist/50 border border-neutral-mist rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-neutral-slate tracking-wider block">
                    Electroneum Address
                  </span>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-primary break-all">
                    {account.address}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 border border-gray-300 hover:bg-neutral-white rounded-lg text-neutral-slate hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAddress ? "Copied" : "Copy"}</span>
                  </button>

                  <a
                    href={`https://blockexplorer.electroneum.com/address/${account.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-gray-300 hover:bg-neutral-white rounded-lg text-neutral-slate hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Explorer</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => detailsModal.open({ client })}
                  className="bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary font-medium rounded-xl px-4 py-2 text-xs transition-colors cursor-pointer"
                >
                  Manage Wallet Connection
                </button>
                <button
                  onClick={() => {
                    if (activeWallet) disconnect(activeWallet);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 font-medium rounded-xl px-4 py-2 text-xs transition-colors cursor-pointer"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Guarantee Card */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-2.5 bg-accent/10 rounded-xl text-accent shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-primary font-display">Zero-Knowledge Privacy Guarantee</h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Recover never prints your personal contact information or wallet address on physical QR stickers. Finders who scan your QR codes see only your safe public instructions. Real-time alerts are delivered via gasless relayer workflows so you remain in complete control.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
