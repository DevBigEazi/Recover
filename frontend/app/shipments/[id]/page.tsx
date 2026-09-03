"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, AlertTriangle, User, MapPin, X, Loader2, FileText, Calendar, CheckCircle, ChevronLeft, Globe, Share2, ShieldAlert, Lock } from "lucide-react";
import EditPackageModal from "./EditPackageModal";
import { useAuthReady } from "@/hooks/useAuthReady";
import { isRealTxHash } from "@/lib/chain";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { formatTrackingCode, formatOperatorName, formatWeight } from "@/lib/format";



interface ShipmentEvent {
  event: string;
  operator: string;
  location?: { lat: number; lng: number } | null;
  locationContext?: string | null;
  timestamp: string;
  onChainTxHash?: string | null;
}

interface Shipment {
  _id: string;
  trackingCode?: string;
  shipperAddress: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  metadata?: Record<string, unknown> | null;
  events: ShipmentEvent[];
  webhookUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ShipmentTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const { role, companyName, isProfileLoaded } = useProfile();

  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [riderPlateNumber, setRiderPlateNumber] = useState("");
  const [handoverLocation, setHandoverLocation] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [lastHandoverResult, setLastHandoverResult] = useState<{
    riderLink: string;
    recipientLink: string;
    courierPin: string;
    riderPhone: string | null;
    riderName: string | null;
  } | null>(null);

  // Edit Package state
  const [showEditModal, setShowEditModal] = useState(false);

  // Redirect individual users immediately
  useEffect(() => {
    if (account && isProfileLoaded && role !== "merchant") {
      router.replace("/dashboard");
    }
  }, [account, isProfileLoaded, role, router]);

  // Fetch shipment details — only for merchants
  const { data: shipment, isLoading, error } = useQuery<Shipment>({
    queryKey: ["shipment-tracking", id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/shipments/${id}/history`, {
        headers: account?.address ? { "x-owner-address": account.address } : {},
      });
      if (!response.ok) throw new Error("Failed to load shipment details");
      return response.json();
    },
    enabled: !!account && role === "merchant",
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const handleLogHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!riderPhone.trim()) {
      toast.error("Please provide the rider's contact phone number.");
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const response = await fetch(`/api/v1/shipments/${id}/handover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": account.address,
        },
        body: JSON.stringify({
          operatorAddress: account.address,
          riderName: riderName.trim() || undefined,
          riderPhone: riderPhone.trim(),
          riderPlateNumber: riderPlateNumber.trim() || undefined,
          locationContext: handoverLocation.trim() || undefined,
          notes: handoverNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to record custody handover.");
      }

      const data = await response.json();
      toast.success("Custody handover logged successfully!");
      setLastHandoverResult({
        riderLink: data.riderLink,
        recipientLink: data.recipientLink,
        courierPin: data.courierPin,
        riderPhone: data.riderPhone || riderPhone.trim() || null,
        riderName: data.riderName || riderName.trim() || null,
      });
      setShowHandoverModal(false);
      setRiderName("");
      setRiderPhone("");
      setRiderPlateNumber("");
      setHandoverLocation("");
      setHandoverNotes("");
      queryClient.invalidateQueries({ queryKey: ["shipment-tracking", id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Handover error";
      toast.error(msg);
    } finally {
      setIsSubmittingHandover(false);
    }
  };



  // Auth loading
  if (isAuthLoading || !isProfileLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!account) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
        <Header />
        <div className="max-w-md mx-auto px-4 pt-24 text-center">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 space-y-4 backdrop-blur-sm">
            <Lock className="w-10 h-10 text-blue-400 mx-auto" />
            <h2 className="text-xl font-bold">Company Login Required</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              This is a private shipment tracking view. Sign in with your logistics company account to continue.
            </p>
            <button
              onClick={openLogin}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-md"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Role guard — individual user somehow reached this page
  if (role !== "merchant") {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans pb-12">
        <Header />
        <div className="flex flex-col justify-center items-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-xs">Redirecting to your personal dashboard...</p>
        </div>
      </div>
    );
  }

  // Ownership check — the logged-in merchant is not the shipper of this package
  const isOwnerMismatch =
    shipment && shipment.shipperAddress.toLowerCase() !== account.address.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white pb-12">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <div className="mb-6">
          <Link
            href="/shipments"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Shipments
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error || !shipment ? (
          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold">Shipment Not Found</h2>
            <p className="text-slate-400 text-xs">Verify the tracking ID URL and try again.</p>
          </div>
        ) : isOwnerMismatch ? (
          <div className="bg-amber-950/20 border border-amber-900/50 p-6 rounded-2xl text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold">Access Denied</h2>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              This shipment belongs to a different company account. Only the registered shipper can view private tracking details.
            </p>
            <Link href="/shipments" className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300">
              ← Back to my Shipments
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header info */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">Tracking Code</span>
                  <span className="font-mono text-xs bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 select-all">
                    {shipment.trackingCode || formatTrackingCode(shipment._id)}
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">
                  {(shipment.metadata?.name as string) || "General Package"}
                </h1>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(shipment.createdAt).toLocaleDateString()}</span>
                  <span>Weight: {formatWeight(shipment.metadata?.weight as string)}</span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Package Status</span>
                <span
                  className={`text-sm px-4 py-1 rounded-full font-bold uppercase tracking-wider ${
                    shipment.status === "Verified"
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50"
                      : shipment.status === "Disputed"
                      ? "bg-rose-950/80 text-rose-400 border border-rose-900/50"
                      : shipment.status === "InTransit"
                      ? "bg-blue-950/80 text-blue-400 border border-blue-900/50"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {shipment.status}
                </span>

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <button
                    disabled={!lastHandoverResult?.courierPin}
                    onClick={() => {
                      if (lastHandoverResult) return;
                      const trackingCode = shipment.trackingCode || formatTrackingCode(shipment._id);
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      setLastHandoverResult({
                        riderLink: `${origin}/scan/${trackingCode}`,
                        recipientLink: `${origin}/scan/${trackingCode}`,
                        courierPin: "Not Generated",
                        riderPhone: (shipment.metadata?.riderPhone as string) || null,
                        riderName: (shipment.metadata?.riderName as string) || null,
                      });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!lastHandoverResult?.courierPin ? "Log a custody handover to generate dispatch links & PIN" : "Share dispatch links"}
                  >
                    <Share2 className="w-3 h-3" /> Share Links
                  </button>
                  <Link
                    href={`/scan/${shipment.trackingCode || formatTrackingCode(shipment._id)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    <Globe className="w-3 h-3" /> View Public Scan Page
                  </Link>
                </div>
              </div>
            </div>

            {/* Disputed Resolution Note */}
            {shipment.status === "Disputed" && (
              <div className="bg-rose-950/30 border border-rose-900/60 rounded-2xl p-5 space-y-3 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <h3 className="text-sm font-bold text-rose-300">Delivery Disputed — Custody Frozen On-Chain</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A tampering or damage dispute has been permanently logged on Electroneum mainnet for audit compliance.
                </p>
                <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider block">
                    Resolution &amp; Re-Registration Guidance
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Once resolved between involved parties, a new replacement package can be registered and handed over to courier again, or concluded according to the terms agreed upon by the involved parties.
                  </p>
                </div>
              </div>
            )}

            {/* Tracking History Timeline */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-md font-bold tracking-tight">Chain of Custody Timeline</h2>
                {shipment.status !== "Verified" && shipment.status !== "Disputed" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Edit Package
                    </button>
                    {shipment.status === "Created" && (
                      <button
                        onClick={() => setShowHandoverModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Log Custody Handover
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="relative border-l border-slate-800 pl-6 space-y-8 ml-3">
                {shipment.events
                  .filter((evt) => (evt.event as string) !== "MetadataUpdated")
                  .map((evt, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon marker */}
                    <span className={`absolute -left-9 top-0.5 rounded-full p-1 border ${
                      evt.event === "Verified"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-900/50"
                        : evt.event === "Disputed"
                        ? "bg-rose-950 text-rose-400 border-rose-900/50"
                        : evt.event === "InTransit"
                        ? "bg-blue-950 text-blue-400 border-blue-900/50"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {evt.event === "Verified" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : evt.event === "Disputed" ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : evt.event === "InTransit" ? (
                        <Globe className="w-3.5 h-3.5" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                    </span>

                    {/* Timeline Item Content */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="font-extrabold text-sm text-white capitalize">{evt.event}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Operator:
                        <span className="font-medium text-slate-300">{formatOperatorName(evt.operator, { userAddress: account?.address, shipperAddress: shipment?.shipperAddress, companyName: companyName || undefined })}</span>
                      </p>
                      {evt.locationContext && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location:
                          <span className="text-slate-300">{evt.locationContext}</span>
                        </p>
                      )}
                      {isRealTxHash(evt.onChainTxHash) ? (
                        <a
                          href={`https://blockexplorer.electroneum.com/tx/${evt.onChainTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                        >
                          <FileText className="w-3 h-3" /> View Tamper-Proof Record
                        </a>
                      ) : evt.onChainTxHash ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium font-mono">
                          <FileText className="w-3 h-3" /> Sandbox Simulated Record
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" /> Log Custody Handover
              </h3>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Record custody transfer to a delivery rider or driver. The event will be logged onto the tamper-proof ledger.
            </p>

            <form onSubmit={handleLogHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Rider Contact Phone Number *
                </label>
                <input
                  type="tel"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="e.g. +234 802 123 4567"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Rider Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="e.g. Abubakar Sanusi"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Ride / Vehicle Plate No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={riderPlateNumber}
                    onChange={(e) => setRiderPlateNumber(e.target.value)}
                    placeholder="e.g. KJA-492-XY"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Delivery Location / Checkpoint (Optional)
                </label>
                <input
                  type="text"
                  value={handoverLocation}
                  onChange={(e) => setHandoverLocation(e.target.value)}
                  placeholder="e.g. Lekki Phase 1 Hub, Lagos"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Handover Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Handle with care, fragile items enclosed"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHandover || !riderPhone.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2.5 rounded-lg transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingHandover ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Logging...</>
                  ) : (
                    "Record Handover"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Success & Dual Dedicated Link Sharing Modal */}
      {lastHandoverResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5 text-emerald-400" /> Custody Handover Logged!
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Rider / Driver PIN: <span className="font-mono text-white font-extrabold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">{lastHandoverResult.courierPin}</span>
                </p>
              </div>
              <button
                onClick={() => setLastHandoverResult(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Share dedicated links with the delivery rider/driver and recipient. Riders/drivers use their link to view the recipient manifest, and recipients use theirs to track &amp; verify delivery.
            </p>

            <div className="space-y-3 pt-1">
              {/* Rider Link Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    🛵 1. Delivery Rider / Driver Link
                  </span>
                  <span className="text-[9px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                    Includes PIN ?pin={lastHandoverResult.courierPin}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Unlocks Recipient Name, Phone (click-to-call), and Delivery Address on rider/driver&apos;s phone browser without login.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const cleanPhone = lastHandoverResult.riderPhone ? lastHandoverResult.riderPhone.replace(/\D/g, "") : "";
                      const msg = `Hi ${lastHandoverResult.riderName || "Rider/Driver"}, here is your Recover delivery manifest link for package: ${lastHandoverResult.riderLink} (Rider/Driver PIN: ${lastHandoverResult.courierPin})`;
                      const waUrl = cleanPhone
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
                        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      window.open(waUrl, "_blank");
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Rider Link (WhatsApp)
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastHandoverResult.riderLink);
                      toast.success("Rider/Driver link copied to clipboard!");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Recipient Link Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    📦 2. Recipient Link (Package Customer)
                  </span>
                  <span className="text-[9px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                    {lastHandoverResult.courierPin && lastHandoverResult.courierPin !== "Not Generated" ? `Includes PIN ?pin=${lastHandoverResult.courierPin}` : "Public Scan"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Includes authorization PIN so recipient can view dispatched delivery rider/driver contact info and verify delivery upon arrival.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const msg = `Hi, track your incoming package delivery and contact your dispatched delivery rider/driver here: ${lastHandoverResult.recipientLink}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Recipient Link (WhatsApp)
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastHandoverResult.recipientLink);
                      toast.success("Recipient link copied to clipboard!");
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setLastHandoverResult(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditModal && shipment && (
        <EditPackageModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          shipmentId={id}
          initialValues={{
            packageName: (shipment.metadata?.name as string) || (shipment.metadata?.packageName as string) || null,
            receiverName: (shipment.metadata?.receiverName as string) || (shipment.metadata?.recipientName as string) || null,
            receiverPhone: (shipment.metadata?.receiverPhone as string) || (shipment.metadata?.recipientPhone as string) || "",
            destination: (shipment.metadata?.destination as string) || (shipment.metadata?.deliveryAddress as string) || null,
            weight: (shipment.metadata?.weight as string) || (shipment.metadata?.weightKg != null ? String(shipment.metadata.weightKg) : null),
          }}
          ownerAddress={account?.address}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["shipment-tracking", id] });
          }}
        />
      )}
    </div>
  );
}
