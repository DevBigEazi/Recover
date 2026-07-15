"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header/Header";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { client } from "@/lib/client";
import { electroneum } from "@/lib/chain";
import { recoverContract } from "@/lib/contract";
import { prepareContractCall, parseEventLogs, prepareEvent, waitForReceipt } from "thirdweb";
import { useAuth } from "@/context/AuthContext";

// Client-side SHA-256 utility using browser native Web Crypto API
async function computeSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hashHex;
}

export default function RegisterPage() {
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { openLogin } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [reward, setReward] = useState("");
  const [contact, setContact] = useState("");
  const [instructions, setInstructions] = useState("");

  // UI/Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    qrUrl: string;
    itemHash: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!name.trim()) {
      setError("Item Name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Serialize off-chain metadata
      const metadata = {
        name: name.trim(),
        brand: brand.trim(),
        serial: serial.trim(),
        reward: reward.trim(),
        contact: contact.trim(),
        instructions: instructions.trim(),
        owner: account.address,
        registeredAt: Date.now(),
      };

      // 2. Compute client-side hash
      const itemHash = await computeSHA256(JSON.stringify(metadata));

      // 3. Prepare the smart contract call
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function registerItem(bytes32 itemHash) returns (uint256)",
        params: [itemHash as `0x${string}`],
      });

      // 4. Send transaction & wait for receipt
      const txResult = await sendTx(transaction);
      const receipt = await waitForReceipt({
        client,
        chain: electroneum,
        transactionHash: txResult.transactionHash,
      });

      // 5. Parse logs to extract the registrationId
      const itemRegisteredEvent = prepareEvent({
        signature: "event ItemRegistered(uint256 indexed registrationId, address indexed owner, bytes32 itemHash, uint256 timestamp)",
      });

      const logs = parseEventLogs({
        logs: receipt.logs,
        events: [itemRegisteredEvent],
      });

      if (logs.length === 0) {
        throw new Error("Registration log not found in receipt.");
      }

      const registrationId = logs[0].args.registrationId.toString();

      // 6. Save metadata to SQLite Database
      const apiResponse = await fetch("/api/items/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...metadata,
          registrationId,
          status: "Active",
          itemHash,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || "Failed to persist metadata in database.");
      }

      // 7. Set success states & generate QR URL
      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        window.location.origin + "/verify/" + registrationId
      )}`;

      setSuccessData({
        registrationId,
        qrUrl: qrDataUrl,
        itemHash,
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during registration.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!successData) return;
    try {
      const response = await fetch(successData.qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recover-qr-item-${successData.registrationId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      // Fallback: open in new tab
      window.open(successData.qrUrl, "_blank");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-mist">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-display sm:text-4xl">
            Register New Item
          </h1>
          <p className="mt-2 text-md text-neutral-slate max-w-lg mx-auto">
            Secure your valuables on-chain. We keep your sensitive details private and generate a printable QR code for recovery.
          </p>
        </div>

        {/* Not Connected State */}
        {!account ? (
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 text-center max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-[#1e2a4a0f] rounded-full">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-primary font-display mb-2">Sign In to Continue</h2>
            <p className="text-sm text-neutral-slate mb-6">
              Sign in to register and manage your items.
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
        ) : !successData ? (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Item Name */}
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-semibold text-primary">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Leather Wallet, MacBook Pro"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Brand / Model */}
              <div className="sm:col-span-2">
                <label htmlFor="brand" className="block text-sm font-semibold text-primary">
                  Brand / Model
                </label>
                <input
                  type="text"
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Apple, Bellroy"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Serial Number */}
              <div className="sm:col-span-6">
                <label htmlFor="serial" className="block text-sm font-semibold text-primary">
                  Serial Number / Unique Identifier
                </label>
                <input
                  type="text"
                  id="serial"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="Keep it blank if not applicable"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Reward Amount */}
              <div className="sm:col-span-3">
                <label htmlFor="reward" className="block text-sm font-semibold text-primary">
                  Optional Reward Info
                </label>
                <input
                  type="text"
                  id="reward"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="e.g. 500 ETN, Cup of Coffee"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Preferred Contact Method */}
              <div className="sm:col-span-3">
                <label htmlFor="contact" className="block text-sm font-semibold text-primary">
                  Preferred Contact
                </label>
                <input
                  type="text"
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. Email address, phone number"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>

              {/* Recovery Instructions */}
              <div className="sm:col-span-6">
                <label htmlFor="instructions" className="block text-sm font-semibold text-primary">
                  Recovery Instructions
                </label>
                <textarea
                  id="instructions"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Provide helpful instructions for the finder. (e.g. Please drop it off at the security desk)"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent bg-neutral-mist/30"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Note on privacy */}
            <div className="p-4 bg-neutral-mist rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-neutral-slate shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-neutral-slate leading-relaxed">
                <strong>Privacy Safeguard:</strong> None of the data entered above is stored in plain text on the Electroneum blockchain. We only commit a cryptographic hash of this data. Your privacy remains secure.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving your item...</span>
                  </>
                ) : (
                  <span>Register & Generate QR</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success State (QR display) */
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl shadow-xs p-8 text-center space-y-6 max-w-xl mx-auto">
            {/* Visual Success Accent */}
            <div className="flex justify-center">
              <div className="p-3 bg-green-50 rounded-full border border-green-100">
                <svg className="w-8 h-8 text-accent animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary font-display">Item Registered Successfully!</h2>
              <p className="text-sm text-neutral-slate">
                Your item has been assigned a secure identity on the Electroneum chain.
              </p>
            </div>

            {/* QR Card Container */}
            <div className="bg-neutral-mist/40 border border-neutral-mist rounded-2xl p-6 flex flex-col items-center">
              <div className="bg-neutral-white p-4 rounded-xl shadow-xs border border-neutral-mist">
                <Image
                  src={successData.qrUrl}
                  alt={`QR code for item registration ID ${successData.registrationId}`}
                  width={200}
                  height={200}
                  className="rounded-sm"
                  unoptimized // avoid next/image optimizing external api qr code
                />
              </div>
              <span className="text-xs text-neutral-slate mt-4 font-mono">
                Registration ID: #{successData.registrationId}
              </span>
              <span className="text-xs text-neutral-slate mt-1 font-mono break-all max-w-[280px]">
                Hash: {successData.itemHash.substring(0, 16)}...
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleDownloadQR}
                className="bg-accent hover:bg-accent/90 text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download QR Code</span>
              </button>
              
              <Link
                href="/dashboard"
                className="bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
