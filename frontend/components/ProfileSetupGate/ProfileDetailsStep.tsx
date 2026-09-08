"use client";

import React from "react";

interface ProfileDetailsStepProps {
  accountType: "user" | "merchant";
  setAccountType: (type: "user" | "merchant") => void;
  fullName: string;
  setFullName: (val: string) => void;
  companyName: string;
  setCompanyName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  isUsernameManuallyEdited: boolean;
  setIsUsernameManuallyEdited: (val: boolean) => void;
  randomSuffix: number;
  phone: string;
  setPhone: (val: string) => void;
  whatsapp: string;
  setWhatsapp: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  isLoading: boolean;
}

export default function ProfileDetailsStep({
  accountType,
  setAccountType,
  fullName,
  setFullName,
  companyName,
  setCompanyName,
  username,
  setUsername,
  isUsernameManuallyEdited,
  setIsUsernameManuallyEdited,
  randomSuffix,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  email,
  setEmail,
  isLoading,
}: ProfileDetailsStepProps) {
  return (
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
  );
}
