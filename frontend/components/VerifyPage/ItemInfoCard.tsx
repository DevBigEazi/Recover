"use client";

import Link from "next/link";

export interface SyncedItem {
  registrationId: string;
  name: string;
  brand: string;
  serial: string;
  reward: string;
  contact: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instructions: string;
  owner: string;
  status: "Active" | "Lost" | "Recovered";
  itemHash: string;
  registeredAt: number;
  lastUpdated: number;
  showPublicContact?: boolean;
}

interface ItemInfoCardProps {
  item: SyncedItem;
  ownerName: string | null;
  copiedEmail: string | null;
  handleEmailClick: (e: React.MouseEvent, targetEmail: string) => void;
  setShowReportForm: (show: boolean) => void;
}

export default function ItemInfoCard({
  item,
  ownerName,
  copiedEmail,
  handleEmailClick,
  setShowReportForm,
}: ItemInfoCardProps) {
  const isPublicContact = Boolean(item.showPublicContact);
  const phoneVal = item.phone?.trim() || "";
  const whatsappVal = item.whatsapp?.trim() || "";
  const emailVal = item.email?.trim() || "";
  const contactVal = item.contact?.trim() || "";
  const hasDirectChannel = Boolean(phoneVal || whatsappVal || emailVal || contactVal);

  const renderContactSection = () => {
    if (!isPublicContact) {
      return (
        <div className="bg-neutral-mist/50 border border-neutral-mist p-3 rounded-xl text-center space-y-1 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
            <span>🛡️</span>
            <span>Owner Privacy Protected</span>
          </div>
          <p className="text-[11px] text-neutral-slate leading-relaxed">
            All finder messages are delivered safely via Recover in-app messaging and push notifications without exposing owner phone or email.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-w-md mx-auto">
        {hasDirectChannel ? (
          <div>
            {phoneVal ? (
              <a
                href={`tel:${phoneVal}`}
                className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span className="text-base">📞</span>
                <span>Call Owner ({phoneVal})</span>
              </a>
            ) : whatsappVal ? (
              <a
                href={`https://wa.me/${whatsappVal.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-neutral-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span className="text-base">💬</span>
                <span>Chat on WhatsApp ({whatsappVal})</span>
              </a>
            ) : emailVal ? (
              <a
                href={`mailto:${emailVal}`}
                onClick={(e) => handleEmailClick(e, emailVal)}
                className="w-full bg-primary hover:bg-primary-light text-neutral-white font-semibold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span className="text-base">✉️</span>
                <span>Email Owner ({emailVal})</span>
              </a>
            ) : contactVal ? (
              <div className="text-center p-3 bg-neutral-mist/50 rounded-xl border border-neutral-mist">
                <span className="text-xs text-neutral-slate font-medium block mb-1">Owner Contact Info:</span>
                <span className="text-xs font-semibold text-primary font-mono select-all">{contactVal}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs space-y-1">
            <span className="font-semibold block">📞 Direct Owner Contact Enabled</span>
            <p className="text-[11px] leading-relaxed">No direct phone or email was provided.</p>
          </div>
        )}

        {copiedEmail && (
          <div className="bg-green-50 border border-green-200 text-accent p-3 rounded-xl text-xs text-center animate-fade-in font-medium">
            📋 Copied email <strong>{copiedEmail}</strong> to clipboard! Opening email app...
          </div>
        )}
      </div>
    );
  };

  if (item.status !== "Lost") {
    /* ACTIVE / RECOVERED CARD STATE (Teal Theme) */
    return (
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-green-50 rounded-full border border-green-100">
            <svg className="w-12 h-12 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 shadow-2xs select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Verified Active
          </span>
          <h2 className="text-2xl font-bold text-primary font-display mt-2">Verified Owner Ownership</h2>
          <p className="text-sm text-neutral-slate max-w-md mx-auto">
            This item is secured in Recover's decentralized registry. It belongs to the verified owner below.
          </p>
        </div>

        {/* Item Details block */}
        <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
          <div className="flex justify-between border-b border-neutral-mist pb-2">
            <span className="text-neutral-slate">Item name:</span>
            <span className="font-semibold text-primary">{item.name}</span>
          </div>
          {item.brand && (
            <div className="flex justify-between border-b border-neutral-mist pb-2">
              <span className="text-neutral-slate">Brand:</span>
              <span className="font-semibold text-primary">{item.brand}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-slate">Owner:</span>
            <span className="font-semibold text-primary">
              {ownerName || "Secured Owner"}
            </span>
          </div>
        </div>

        {renderContactSection()}

        <div className="text-xs text-neutral-slate max-w-sm mx-auto">
          If this is your item, you can toggle its status or edit metadata via the{" "}
          <Link href="/dashboard" className="text-accent hover:underline font-semibold">
            Dashboard
          </Link>
          .
        </div>
      </div>
    );
  }

  /* LOST CARD STATE (Amber Theme) */
  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-8 shadow-xs text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
          <svg className="w-12 h-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-800 shadow-2xs select-none">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
          </span>
          Reported Missing
        </span>
        <h2 className="text-2xl font-bold text-primary font-display mt-2">This Item is Missing</h2>
        <p className="text-sm text-neutral-slate max-w-md mx-auto">
          The owner of this item has flagged it as missing. If you have found it, please contact them using the buttons below.
        </p>
      </div>

      {item.reward && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto flex items-center justify-center gap-2">
          <span className="text-lg">🎁</span>
          <span className="text-sm font-bold text-warning">
            Recovery Reward offered: {item.reward}
          </span>
        </div>
      )}

      {/* Item Details block */}
      <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-5 max-w-md mx-auto text-left space-y-3 text-sm">
        <div className="flex justify-between border-b border-neutral-mist pb-2">
          <span className="text-neutral-slate">Item name:</span>
          <span className="font-semibold text-primary">{item.name}</span>
        </div>
        {item.brand && (
          <div className="flex justify-between border-b border-neutral-mist pb-2">
            <span className="text-neutral-slate">Brand:</span>
            <span className="font-semibold text-primary">{item.brand}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-slate">Lost Since:</span>
          <span className="font-semibold text-primary">
            {new Date(item.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {item.instructions && (
        <div className="bg-neutral-mist/35 border border-neutral-mist p-6 rounded-xl text-left max-w-md mx-auto">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Instructions from Owner</h4>
          <p className="text-sm text-neutral-slate leading-relaxed font-sans">{item.instructions}</p>
        </div>
      )}

      <div className="pt-4 space-y-3 max-w-md mx-auto">
        <button
          onClick={() => setShowReportForm(true)}
          className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          <span>I Found This Item (Submit Report)</span>
        </button>

        {renderContactSection()}
      </div>
    </div>
  );
}
