"use client";

import React from "react";

interface ProfileDetailsStepProps {
  accountType: "user" | "merchant";
  setAccountType: (type: "user" | "merchant") => void;
  // Personal mode state
  personalFullName: string;
  setPersonalFullName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  isUsernameManuallyEdited: boolean;
  setIsUsernameManuallyEdited: (val: boolean) => void;
  personalPhone: string;
  setPersonalPhone: (val: string) => void;
  personalWhatsapp: string;
  setPersonalWhatsapp: (val: string) => void;
  personalEmail: string;
  setPersonalEmail: (val: string) => void;
  // Business mode state
  companyName: string;
  setCompanyName: (val: string) => void;
  businessRepName: string;
  setBusinessRepName: (val: string) => void;
  businessHandle: string;
  setBusinessHandle: (val: string) => void;
  isBusinessHandleManuallyEdited: boolean;
  setIsBusinessHandleManuallyEdited: (val: boolean) => void;
  businessPhone: string;
  setBusinessPhone: (val: string) => void;
  businessEmail: string;
  setBusinessEmail: (val: string) => void;
  // Shared
  randomSuffix: number;
  isLoading: boolean;
}

export default function ProfileDetailsStep({
  accountType,
  setAccountType,
  personalFullName,
  setPersonalFullName,
  username,
  setUsername,
  isUsernameManuallyEdited,
  setIsUsernameManuallyEdited,
  personalPhone,
  setPersonalPhone,
  personalWhatsapp,
  setPersonalWhatsapp,
  personalEmail,
  setPersonalEmail,
  companyName,
  setCompanyName,
  businessRepName,
  setBusinessRepName,
  businessHandle,
  setBusinessHandle,
  isBusinessHandleManuallyEdited,
  setIsBusinessHandleManuallyEdited,
  businessPhone,
  setBusinessPhone,
  businessEmail,
  setBusinessEmail,
  randomSuffix,
  isLoading,
}: ProfileDetailsStepProps) {
  return (
    <>
      {/* Starting Focus Options */}
      <div className="space-y-2.5">
        <div>
          <span className="block text-xs font-bold text-neutral-slate uppercase tracking-wider">
            Choose your starting focus:
          </span>
          <p className="text-[11px] text-neutral-slate mt-0.5">
            One account covers both. You can activate and switch between Personal and Business modes anytime from settings.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setAccountType("user")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              accountType === "user"
                ? "border-accent bg-accent/5 ring-1 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <span>👤</span> Personal Items
              </span>
              {accountType === "user" && <span className="text-xs text-accent">●</span>}
            </div>
            <p className="text-[11px] text-neutral-slate leading-normal">
              Protect personal phones, keys, pets, and laptops with smart QR stickers.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("merchant")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              accountType === "merchant"
                ? "border-accent bg-accent/5 ring-1 ring-accent"
                : "border-neutral-mist hover:border-gray-300 bg-neutral-white"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <span>🏪</span> Business & Retail
              </span>
              {accountType === "merchant" && <span className="text-xs text-accent">●</span>}
            </div>
            <p className="text-[11px] text-neutral-slate leading-normal">
              Issue digital receipts, run POS, dispatch parcels, and invite staff.
            </p>
          </button>
        </div>
      </div>

      {/* Form Fields: Completely Decoupled based on accountType */}
      <div className="space-y-4 pt-2 border-t border-neutral-mist">
        {accountType === "merchant" ? (
          /* ========================================================================= */
          /* BUSINESS ONBOARDING FIELDS */
          /* ========================================================================= */
          <>
            <div className="space-y-1.5">
              <label htmlFor="gate-company-name" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Store / Business Name *
              </label>
              <input
                id="gate-company-name"
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Acme Supermarket or Big Eazi Logistics"
                value={companyName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompanyName(val);
                  if (!isBusinessHandleManuallyEdited) {
                    const baseSlug = val.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "_");
                    if (baseSlug) {
                      const maxBaseLength = 30 - String(randomSuffix).length - 1;
                      setBusinessHandle(`${baseSlug.substring(0, maxBaseLength)}_${randomSuffix}`);
                    } else {
                      setBusinessHandle("");
                    }
                  }
                }}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gate-business-rep" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Account Owner / Representative Name (Optional)
              </label>
              <input
                id="gate-business-rep"
                type="text"
                maxLength={50}
                placeholder="e.g. Jane Smith"
                value={businessRepName}
                onChange={(e) => setBusinessRepName(e.target.value)}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gate-business-handle" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Business Handle *
              </label>
              <input
                id="gate-business-handle"
                type="text"
                required
                maxLength={30}
                placeholder="e.g. acme_logistics"
                value={businessHandle}
                onChange={(e) => {
                  setBusinessHandle(e.target.value);
                  setIsBusinessHandleManuallyEdited(true);
                }}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
              />
              <p className="text-[10px] text-neutral-slate mt-0.5">
                Unique handle (e.g. @acme_logistics) printed on customer digital receipts, invoices, and tracking.
              </p>
            </div>

            {/* Business Contact Channels */}
            <div className="border-t border-neutral-mist pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Business Support Channels (Mandatory)
                </h4>
                <p className="text-[11px] text-neutral-slate mt-0.5">
                  Printed on digital receipts and accessible to package recipients for customer support.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_business_phone" className="block text-xs font-semibold text-neutral-slate">
                  📞 Business Support Phone *
                </label>
                <input
                  id="gate_business_phone"
                  type="tel"
                  required
                  placeholder="e.g. +2348001234567"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_business_email" className="block text-xs font-semibold text-neutral-slate">
                  ✉️ Business Support Email *
                </label>
                <input
                  id="gate_business_email"
                  type="email"
                  required
                  placeholder="e.g. support@yourcompany.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                />
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* PERSONAL ONBOARDING FIELDS */
          /* ========================================================================= */
          <>
            <div className="space-y-1.5">
              <label htmlFor="gate-personal-name" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Full Name *
              </label>
              <input
                id="gate-personal-name"
                type="text"
                required
                maxLength={50}
                placeholder="e.g. John Doe"
                value={personalFullName}
                onChange={(e) => {
                  const val = e.target.value;
                  setPersonalFullName(val);
                  if (!isUsernameManuallyEdited) {
                    const baseSlug = val.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "_");
                    if (baseSlug) {
                      const maxBaseLength = 30 - String(randomSuffix).length - 1;
                      setUsername(`${baseSlug.substring(0, maxBaseLength)}_${randomSuffix}`);
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
              <label htmlFor="gate-personal-username" className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                Personal Username *
              </label>
              <input
                id="gate-personal-username"
                type="text"
                required
                maxLength={30}
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setIsUsernameManuallyEdited(true);
                }}
                disabled={isLoading}
                className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
              />
              <p className="text-[10px] text-neutral-slate mt-0.5">
                Unique personal handle (e.g. @johndoe) displayed to finders on sticker reports.
              </p>
            </div>

            {/* Personal Contact Channels */}
            <div className="border-t border-neutral-mist pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Contact Channels (At Least 1 Compulsory)
                </h4>
                <p className="text-[11px] text-neutral-slate mt-0.5">
                  Finders will use these buttons on your item verification page to contact you directly.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_personal_phone" className="block text-xs font-semibold text-neutral-slate">
                  📞 Phone Number (Calls)
                </label>
                <input
                  id="gate_personal_phone"
                  type="tel"
                  placeholder="e.g. +2348012345678"
                  value={personalPhone}
                  onChange={(e) => setPersonalPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_personal_whatsapp" className="block text-xs font-semibold text-neutral-slate">
                  💬 WhatsApp Number
                </label>
                <input
                  id="gate_personal_whatsapp"
                  type="tel"
                  placeholder="e.g. +2348012345678"
                  value={personalWhatsapp}
                  onChange={(e) => setPersonalWhatsapp(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gate_personal_email" className="block text-xs font-semibold text-neutral-slate">
                  ✉️ Email Address
                </label>
                <input
                  id="gate_personal_email"
                  type="email"
                  placeholder="e.g. owner@example.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-2.5 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all bg-neutral-mist/30"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          (accountType === "user" && (!personalFullName.trim() || !username.trim() || (!personalPhone.trim() && !personalWhatsapp.trim() && !personalEmail.trim()))) ||
          (accountType === "merchant" && (!companyName.trim() || !businessHandle.trim() || !businessPhone.trim() || !businessEmail.trim()))
        }
        className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-4"
      >
        {accountType === "merchant" ? "Next: Choose Plan →" : "Complete Registration ✓"}
      </button>
    </>
  );
}
