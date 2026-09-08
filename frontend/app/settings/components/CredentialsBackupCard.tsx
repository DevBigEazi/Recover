"use client";

import { useState } from "react";
import { useWalletDetailsModal } from "thirdweb/react";
import { client } from "@/lib/client";

interface CredentialsBackupCardProps {
  hasAccount: boolean;
}

export default function CredentialsBackupCard({ hasAccount }: CredentialsBackupCardProps) {
  const detailsModal = useWalletDetailsModal();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const handleLaunchExport = () => {
    if (!hasAccount) return;
    setShowBackupModal(false);
    detailsModal.open({
      client,
      screen: "export",
    });
  };

  return (
    <>
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
                    You are about to reveal your account&apos;s private credential key.
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
    </>
  );
}
