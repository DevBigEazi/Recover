"use client";

import { useState } from "react";
import { LocalItem } from "./ItemSecretsSection";
import { convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

export interface FinderReport {
  reportId: string;
  itemId: string;
  message: string;
  contactInfo: string;
  location: string;
  locationContext?: string | null;
  unlocked?: boolean;
  deliveryMethod?: "meetup" | "courier";
  courierDetails?: string | null;
  timestamp: number;
}

interface ItemReportsInboxProps {
  item: LocalItem | null;
  reports: FinderReport[];
  userCurrency?: UserCurrencyInfo | null;
  isOwner: boolean;
  onRefresh?: () => Promise<void>;
}

export default function ItemReportsInbox({
  item,
  reports,
  userCurrency,
  isOwner,
}: ItemReportsInboxProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleUnlock = async (reportId: string) => {
    setIsActionLoading(true);
    try {
      const initRes = await fetch("/api/reports/initialize-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId })
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || "Failed to initialize Stripe payment.");
      }

      const { url } = await initRes.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Stripe checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to initialize checkout.";
      alert(errMsg);
      setIsActionLoading(false);
    }
  };

  if (!isOwner || item?.status !== "Lost") return null;

  const isPhone = (item?.category || "").toLowerCase() === "phone";
  const baseUsdPrice = isPhone ? 3.5 : 1.5;
  const priceInfo = convertUsdPrice(baseUsdPrice, userCurrency);

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-neutral-mist pb-4">
        <div>
          <h3 className="text-lg font-bold text-primary font-display flex items-center gap-2">
            <span>📥 Finder Reports Inbox</span>
            <span className="text-xs font-normal text-neutral-slate bg-neutral-mist px-2.5 py-0.5 rounded-full">
              {reports.length} {reports.length === 1 ? "Report" : "Reports"}
            </span>
          </h3>
          <p className="text-xs text-neutral-slate mt-1">
            Real-time coordinates and finder notifications submitted for this lost item.
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 bg-neutral-mist/20 border border-dashed border-neutral-mist rounded-xl space-y-2">
          <p className="text-sm font-semibold text-primary">No Finder Reports Yet</p>
          <p className="text-xs text-neutral-slate max-w-md mx-auto">
            When someone scans your physical sticker and reports finding your item, their message and location coordinates will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2">
            <span className="shrink-0 text-sm mt-0.5">ℹ️</span>
            <div>
              <strong>Physical Verification &amp; Security Notice:</strong>
              <p className="mt-0.5 text-blue-800 text-[11px] leading-relaxed">
                Finder rewards are display-only coordinate-based agreements verified upon physical handover. To unlock direct phone &amp; messaging contact details, click the unlock button below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => (
              <div
                key={report.reportId}
                className="relative bg-neutral-mist/20 border border-neutral-mist rounded-xl p-4 sm:p-5 space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs text-neutral-slate border-b border-neutral-mist/60 pb-2">
                  <span className="font-mono text-[11px] text-primary font-bold">
                    Report ID: {report.reportId.slice(0, 10)}...
                  </span>
                  <span>{new Date(report.timestamp).toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate block mb-1">
                      Delivery Method:
                    </span>
                    <span className="inline-flex items-center gap-1 bg-neutral-white border border-neutral-mist px-2.5 py-1 rounded-md text-xs font-semibold text-primary">
                      {report.deliveryMethod === "courier" ? "📦 Courier Handover" : "🤝 In-Person Meetup"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate block mb-1">
                      Finder Message:
                    </span>
                    <p className="text-xs text-primary bg-neutral-white p-3 rounded-lg border border-neutral-mist leading-relaxed font-mono">
                      {report.unlocked ? report.message : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                    </p>
                  </div>

                  {report.unlocked && (
                    <div className="space-y-2 pt-2 border-t border-neutral-mist/60">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate block mb-1">
                          Finder Contact Information:
                        </span>
                        <div className="text-xs font-bold text-accent bg-accent/10 p-2.5 rounded-lg border border-accent/20 font-mono">
                          {report.contactInfo}
                        </div>
                      </div>

                      {report.deliveryMethod === "courier" && report.courierDetails && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate block mb-1">
                            Courier / Waybill Details:
                          </span>
                          <div className="text-xs text-primary bg-neutral-white p-2.5 rounded-lg border border-neutral-mist font-mono">
                            {report.courierDetails}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {report.location && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate block mb-1">
                        GPS Coordinates / Location:
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(report.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono bg-neutral-white px-3 py-1.5 rounded-lg border border-neutral-mist shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>📍 Open Location on Google Maps ({report.location}) ↗</span>
                      </a>
                      {report.locationContext && (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-2.5 mt-1.5 text-[10px] text-amber-800 leading-normal flex items-start gap-1.5 text-left">
                          <span className="shrink-0 text-xs mt-0.5">💡</span>
                          <div>
                            <strong className="font-semibold text-amber-900 block mb-0.5">AI Location Insight</strong>
                            {report.locationContext}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!report.unlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-white/80 backdrop-blur-xs p-4 text-center space-y-3">
                    <div className="p-2 bg-amber-500/10 rounded-full text-warning text-base leading-none">
                      🔒
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-primary text-xs font-display">Locked Finder Report</h4>
                      <p className="text-[10px] text-neutral-slate max-w-60 leading-normal">
                        Pay a one-time fee to unlock the finder's message and contact details to coordinate return.
                      </p>
                    </div>
                    <div className="flex flex-col w-full gap-2 px-4 max-w-65">
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUnlock(report.reportId)}
                        className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isActionLoading ? "Processing..." : `Unlock for ${priceInfo.formattedLocal}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
