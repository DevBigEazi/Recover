"use client";

import { useState } from "react";
import { LocalItem } from "./ItemSecretsSection";

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

interface CurrencyInfo {
  currency: string;
  symbol: string;
  phonePrice: number;
  otherPrice: number;
}

interface ItemReportsInboxProps {
  item: LocalItem | null;
  reports: FinderReport[];
  currencyInfo: CurrencyInfo;
  isOwner: boolean;
  onRefresh: () => Promise<void>;
}

interface PaystackResponse {
  reference: string;
}

interface PaystackPopInstance {
  resumeTransaction: (
    accessCode: string,
    options?: {
      onSuccess?: (transaction: PaystackResponse) => void | Promise<void>;
      onCancel?: () => void;
    }
  ) => void;
}

interface PaystackPop {
  new (): PaystackPopInstance;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

export default function ItemReportsInbox({
  item,
  reports,
  currencyInfo,
  isOwner,
  onRefresh,
}: ItemReportsInboxProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.PaystackPop) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v2/inline.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUnlock = async (reportId: string) => {
    setIsActionLoading(true);
    try {
      const scriptLoaded = await loadPaystackScript();
      if (!scriptLoaded) {
        alert("Failed to load payment gateway. Please check your internet connection.");
        setIsActionLoading(false);
        return;
      }

      if (!window.PaystackPop) {
        alert("Payment gateway not loaded.");
        setIsActionLoading(false);
        return;
      }

      const pricing = currencyInfo;

      const initRes = await fetch("/api/reports/initialize-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, currency: pricing.currency })
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || "Failed to initialize payment.");
      }

      const { access_code } = await initRes.json();

      const popup = new window.PaystackPop();
      popup.resumeTransaction(access_code, {
        onSuccess: async (transaction: PaystackResponse) => {
          await completeUnlock(reportId, transaction.reference, pricing.currency);
        },
        onCancel: () => {
          setIsActionLoading(false);
        }
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to initialize checkout.";
      alert(errMsg);
      setIsActionLoading(false);
    }
  };

  const completeUnlock = async (reportId: string, reference: string, currency: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/reports/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, reference, currency })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Verification failed");
      }
      
      await onRefresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to unlock report.";
      alert(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isOwner || item?.status !== "Lost") return null;

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 shadow-xs space-y-4">
      <h3 className="text-md font-bold text-primary font-display flex items-center justify-between">
        <span>Finder Messages</span>
        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-mist text-neutral-slate">
          {reports.length}
        </span>
      </h3>

      {reports.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-neutral-mist rounded-xl">
          <svg className="w-6 h-6 text-neutral-slate mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
          <p className="text-xs text-neutral-slate font-medium">Inbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Safety Meetup Recommendation Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-warning font-bold text-xs">
              <span className="text-base">💡</span>
              <span>Safety Meetup Recommendations:</span>
            </div>
            <p className="text-neutral-slate leading-relaxed text-[11px]">
              When coordinating item pickups with finders, always prioritize your safety. Arrange meetups in well-lit, busy public areas such as coffee shops, shopping centers, or near transit entrances. Bringing a friend or meeting during daylight hours is highly recommended.
            </p>
          </div>

          <div className="space-y-4 max-h-75 overflow-y-auto pr-1">
            {reports.map((report) => (
              <div key={report.reportId} className="relative bg-neutral-mist/40 border border-neutral-mist rounded-xl p-4 text-xs space-y-2 overflow-hidden">
                <div className={`space-y-2 transition-all ${!report.unlocked ? "filter blur-sm select-none pointer-events-none" : ""}`}>
                  <div className="flex justify-between items-center text-[10px] text-neutral-slate border-b border-neutral-mist pb-1.5">
                    <span className="font-medium">Report #{report.reportId.substring(0, 8)}</span>
                    <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${report.deliveryMethod === "courier" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                      {report.deliveryMethod === "courier" ? "📦 Courier Return" : "🤝 In-Person Meetup"}
                    </span>
                  </div>

                  <p className="text-primary leading-relaxed font-sans mt-2">{report.message}</p>
                  
                  {report.contactInfo && (
                    <div className="bg-neutral-white border border-neutral-mist p-2 rounded-lg mt-2">
                      <span className="font-semibold text-primary block">Finder Contact:</span>
                      <span className="text-neutral-slate">{report.contactInfo}</span>
                    </div>
                  )}

                  {report.deliveryMethod === "courier" && report.courierDetails && (
                    <div className="bg-neutral-white border border-neutral-mist p-2 rounded-lg mt-2">
                      <span className="font-semibold text-primary block">Courier / Delivery Details:</span>
                      <span className="text-neutral-slate">{report.courierDetails}</span>
                    </div>
                  )}
                  
                  {report.location && (
                    <div className="mt-2 text-left">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location.replace(/Lat:\s*|Lng:\s*/gi, "").trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-medium text-[11px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                    <div className="flex flex-col w-full gap-2 px-4 max-w-55">
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUnlock(report.reportId)}
                        className="w-full bg-accent hover:bg-accent/90 text-neutral-white font-bold py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isActionLoading ? "Processing..." : `Unlock for ${currencyInfo.symbol}${item?.category === "Phone" ? currencyInfo.phonePrice.toLocaleString() : currencyInfo.otherPrice.toLocaleString()} ${currencyInfo.currency}`}
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
