"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header/Header";
import { useActiveAccount } from "thirdweb/react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useWalletDetailsModal } from "thirdweb/react";
import { client } from "@/lib/client";

export default function SettingsPage() {
  const account = useActiveAccount();
  const { openLogin } = useAuth();
  const { fullName, username, refetchProfile } = useProfile();
  const detailsModal = useWalletDetailsModal();

  // Profile Form States
  const [nameInput, setNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Backup Modal States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  // Sync profile details when loaded
  useEffect(() => {
    if (fullName) setNameInput(fullName);
    if (username) setUsernameInput(username);
  }, [fullName, username]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    // Validation
    const cleanedName = nameInput.trim();
    const cleanedUsername = usernameInput.trim().toLowerCase();

    if (cleanedName.length === 0 || cleanedName.length > 50) {
      setProfileError("Full Name must be between 1 and 50 characters.");
      setIsSaving(false);
      return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
      setProfileError(
        "Username must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens."
      );
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          fullName: cleanedName,
          username: cleanedUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update settings.");
      }

      refetchProfile();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      console.error(err);
      setProfileError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
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

  // 1. Not Connected State Gating
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
          <Link href="/dashboard" className="text-sm font-medium text-neutral-slate hover:text-primary flex items-center gap-1">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-primary font-display mb-8">
          Account Settings
        </h1>

        <div className="space-y-8">
          {/* 1. Profile Details Card */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-primary font-display mb-2">Profile Details</h2>
            <p className="text-xs text-neutral-slate mb-6">
              Manage your display name and username associated with physical sticker reports.
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
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-primary mb-2">
                    Display Name / Full Name
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
                </div>

                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-primary mb-2">
                    Username
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
                  <span className="block text-[10px] text-neutral-slate mt-1.5 leading-relaxed">
                    Allowed characters: lowercase letters, numbers, underscores, and hyphens.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
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
                <span className="font-mono text-primary font-semibold break-all text-right max-w-[200px] sm:max-w-xs">{account.address}</span>
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
    </main>
  );
}
