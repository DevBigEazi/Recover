"use client";

import { useState, useEffect, use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Globe,
  FileText,
  User,
  Calendar,
  Package,
  Phone,
  Truck,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { formatTrackingCode, formatOperatorName, formatWeight } from "@/lib/format";

interface ShipmentEvent {
  event: string;
  operator: string;
  locationContext?: string | null;
  timestamp: string;
  onChainTxHash?: string | null;
}

interface Shipment {
  packageId: string;
  shipperAddress: string;
  shipperCompanyName?: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  metadata?: Record<string, unknown> | null;
  events: ShipmentEvent[];
  isCourierAuthorized?: boolean;
  riderInfo?: {
    name: string | null;
    phone: string | null;
    plateNumber: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export default function PackageScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [innerSecret, setInnerSecret] = useState("");
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [courierPinInput, setCourierPinInput] = useState("");
  const [activePin, setActivePin] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetch("/api/verify/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: id }),
      }).catch((err) => console.error("Failed to log package scan:", err));
    }
  }, [id]);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlPin = searchParams?.get("pin") || "";
  const effectivePin = urlPin || activePin;

  // Public fetch — no auth required, accepts optional courier PIN in URL or manual input
  const { data: shipment, isLoading, error } = useQuery<Shipment>({
    queryKey: ["scan-tracking", id, effectivePin],
    queryFn: async () => {
      const url = `/api/v1/shipments/${id}/history${effectivePin ? `?pin=${encodeURIComponent(effectivePin)}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Package not found");
      return response.json();
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const getCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!innerSecret.trim()) {
      toast.error("Please provide the scratch-off secret code.");
      return;
    }

    setIsVerifying(true);
    try {
      const coords = await getCoordinates();
      const response = await fetch(`/api/v1/shipments/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim() || undefined,
          innerSecret: innerSecret.trim(),
          location: coords,
          locationContext: coords ? "Browser Geolocation" : "Unknown",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Verification failed.");
      }

      setVerifiedSuccess(true);
      toast.success("Package delivery verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["scan-tracking", id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error";
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCourierPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierPinInput.trim()) return;
    setActivePin(courierPinInput.trim());
    queryClient.invalidateQueries({ queryKey: ["scan-tracking", id] });
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      toast.error("Please describe the issue or reason for dispute.");
      return;
    }

    setIsDisputing(true);
    try {
      const coords = await getCoordinates();
      const response = await fetch(`/api/v1/shipments/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: recipientName.trim() || "Recipient",
          reason: disputeReason.trim(),
          location: coords,
          locationContext: coords ? "Browser Geolocation" : "Unknown",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Dispute registration failed.");
      }

      toast.success("Damage or tampering report submitted successfully.");
      setDisputeReason("");
      queryClient.invalidateQueries({ queryKey: ["scan-tracking", id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dispute error";
      toast.error(msg);
    } finally {
      setIsDisputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Minimal public header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="font-extrabold text-sm tracking-tight text-white">Recover</span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">· Shipment Verification</span>
          </Link>
          <span className="text-[10px] text-slate-500 font-mono">Public Scan</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-16 space-y-6">
        {/* Security Disclaimer */}
        <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-relaxed">
            <span className="font-bold">Physical Verification Disclaimer:</span> Any reward mentioned is display-only and subject to final agreement between the sender and recipient upon physical delivery. Recover does not escrow, guarantee, or facilitate reward payments.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error || !shipment ? (
          <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-2xl text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto" />
            <h1 className="text-lg font-bold">Package Not Found</h1>
            <p className="text-slate-400 text-xs">The tracking ID in this QR code could not be found. Please contact the sender.</p>
          </div>
        ) : (
          <>
            {/* Package Status Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Package</p>
                  <h1 className="text-lg font-extrabold tracking-tight">
                    {(shipment.metadata?.name as string) || "General Package"}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(shipment.createdAt).toLocaleDateString()}</span>
                    {!!shipment.metadata?.weight && (
                      <span>Weight: {formatWeight(shipment.metadata.weight as string)}</span>
                    )}
                  </div>
                </div>

                <span
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
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
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <p className="text-[10px] text-slate-400 font-mono font-bold">Tracking Code: {formatTrackingCode(shipment.packageId)}</p>
              </div>
            </div>

            {/* Verified Success State */}
            {(shipment.status === "Verified" || verifiedSuccess) && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-8 text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
                <h2 className="text-lg font-bold text-emerald-300">Delivery Verified ✓</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  This package has been successfully delivered and its integrity verified. The tamper-proof seal was intact at the time of delivery.
                </p>
              </div>
            )}

            {/* Disputed State */}
            {shipment.status === "Disputed" && (
              <div className="bg-rose-950/30 border border-rose-900/60 rounded-2xl p-6 space-y-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <h2 className="font-bold text-rose-300">Delivery Disputed &amp; Frozen On-Chain</h2>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  A tampering or damage dispute has been logged on the Electroneum mainnet blockchain for audit compliance.
                </p>
                <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider block">
                    Next Steps &amp; Resolution Guidance
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Once resolved between involved parties, a fresh replacement package can be registered and handed over to delivery rider/driver again, or settled according to the conclusions agreed upon by the parties.
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Rider / Driver Manifest Card — Shown only when unlocked via Rider/Driver PIN / WhatsApp Link */}
            {shipment.isCourierAuthorized && (
              <div className="bg-linear-to-r from-blue-950/80 via-indigo-950/70 to-slate-900 border border-blue-800/60 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-extrabold text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-400" /> Delivery Rider / Driver Manifest
                  </h3>
                  <span className="text-[10px] bg-blue-900/80 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-700/50">
                    PIN Verified ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {!!shipment.metadata?.receiverName && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">Intended Recipient</span>
                      <span className="text-sm font-bold text-white block">
                        {shipment.metadata.receiverName as string}
                      </span>
                    </div>
                  )}

                  {!!shipment.metadata?.receiverPhone && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Recipient Phone</span>
                        <span className="text-xs font-mono font-bold text-white block">
                          {shipment.metadata.receiverPhone as string}
                        </span>
                      </div>
                      <a
                        href={`tel:${shipment.metadata.receiverPhone as string}`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    </div>
                  )}
                </div>

                {!!shipment.metadata?.destination && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">Delivery Destination</span>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {shipment.metadata.destination as string}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Dispatched Delivery Rider / Driver Information Card — Unlocked via Rider/Driver PIN / Link */}
            {shipment.isCourierAuthorized && shipment.status === "InTransit" && (shipment.riderInfo?.phone || shipment.metadata?.riderPhone) && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-400" /> Dispatched Delivery Rider / Driver Info
                  </h3>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-800">
                    In Transit
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex-wrap">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white block">
                      {shipment.riderInfo?.name || (shipment.metadata?.riderName as string) || "Delivery Rider / Driver"}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      {!!(shipment.riderInfo?.plateNumber || shipment.metadata?.riderPlateNumber) && (
                        <span>Plate: <strong>{(shipment.riderInfo?.plateNumber || shipment.metadata?.riderPlateNumber) as string}</strong></span>
                      )}
                      <span>·</span>
                      <span className="font-mono text-slate-300">
                        {(shipment.riderInfo?.phone || shipment.metadata?.riderPhone) as string}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${(shipment.riderInfo?.phone || shipment.metadata?.riderPhone) as string}`}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shrink-0 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Rider / Driver
                  </a>
                </div>
              </div>
            )}

            {/* Recipient Verification & Dispute Forms — shown only when InTransit */}
            {shipment.status === "InTransit" && !verifiedSuccess && (
              <div className="space-y-4">
                {/* Security instructions */}
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 space-y-1.5">
                  <h3 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    🔒 Tamper-Proof Delivery Checkpoint
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    This package is sealed with a tamper-evident holographic label. The <span className="font-semibold text-white">outer QR code</span> (this scan) logs handover checkpoints. The <span className="font-semibold text-white">inner scratch-off code</span> is revealed only by the recipient to confirm delivery integrity.
                  </p>
                  <p className="text-[10px] text-rose-400 font-semibold">
                    Do not accept this package if the holographic label is broken or shows "VOID".
                  </p>
                </div>

                {/* Optional Rider / Driver PIN Entry for Riders/Drivers without WhatsApp Link */}
                {!shipment.isCourierAuthorized && (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
                      <p className="text-[11px] text-slate-400">Are you the delivery rider/driver or recipient?</p>
                    </div>
                    <form onSubmit={handleCourierPinSubmit} className="flex gap-1.5 shrink-0">
                      <input
                        type="text"
                        value={courierPinInput}
                        onChange={(e) => setCourierPinInput(e.target.value)}
                        placeholder="4-digit PIN"
                        maxLength={4}
                        className="w-20 bg-slate-950 border border-slate-800 text-center font-mono text-xs text-white rounded-lg py-1 px-2 focus:border-blue-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Unlock
                      </button>
                    </form>
                  </div>
                )}

                {/* Account-Free Recipient Verification Card */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  {/* Verify Delivery */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                      ✓ Verify Delivery (No Account Required)
                    </h4>
                    <form onSubmit={handleVerify} className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                          Your Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2.5 text-xs text-white outline-hidden placeholder-slate-600 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] uppercase font-bold text-slate-400">
                            Scratch-Off Secret Code *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowSecretCode(!showSecretCode)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {showSecretCode ? (
                              <><EyeOff className="w-3 h-3 text-slate-400" /> Hide Code</>
                            ) : (
                              <><Eye className="w-3 h-3 text-slate-400" /> Show Code</>
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showSecretCode ? "text" : "password"}
                            value={innerSecret}
                            onChange={(e) => setInnerSecret(e.target.value)}
                            placeholder="Enter code (e.g. RCVR-A1B2C3D4 or A1B2C3D4)"
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2.5 pr-10 text-xs text-white outline-hidden placeholder-slate-600 transition-colors font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretCode(!showSecretCode)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                            title={showSecretCode ? "Hide Secret Code" : "Show Secret Code"}
                          >
                            {showSecretCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isVerifying || isDisputing || !innerSecret.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isVerifying ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> Confirm Delivery &amp; Verify</>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Dispute */}
                  <div className="border-t border-slate-800/60 pt-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-rose-400 tracking-wider">
                      ⚠ Report Tampering or Damage
                    </h4>
                    <form onSubmit={handleDispute} className="flex gap-2">
                      <input
                        type="text"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the issue (e.g. seal broken, label shows VOID)"
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-xs text-white outline-hidden placeholder-slate-600 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={isDisputing || isVerifying || !disputeReason.trim()}
                        className="bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-800/50 transition-colors px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                      >
                        {isDisputing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispute"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Chain of Custody Timeline */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-5">
              <h2 className="text-sm font-bold tracking-tight">Delivery History</h2>

              {shipment.events.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-4">No events recorded yet.</p>
              ) : (
                <div className="relative border-l border-slate-800 pl-5 space-y-6 ml-2">
                  {shipment.events.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span className={`absolute -left-7 top-0.5 rounded-full p-1 border ${
                        evt.event === "Verified"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900/50"
                          : evt.event === "Disputed"
                          ? "bg-rose-950 text-rose-400 border-rose-900/50"
                          : evt.event === "InTransit"
                          ? "bg-blue-950 text-blue-400 border-blue-900/50"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}>
                        {evt.event === "Verified" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : evt.event === "Disputed" ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : evt.event === "InTransit" ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-bold text-xs text-white capitalize">
                            {evt.event === "InTransit" ? "In Transit (Handover)" : evt.event}
                          </h4>
                          <span className="text-[9px] text-slate-500 shrink-0">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatOperatorName(evt.operator, { shipperAddress: shipment?.shipperAddress, companyName: shipment?.shipperCompanyName })}</span>
                        </p>
                        {evt.locationContext && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            {evt.locationContext}
                          </p>
                        )}
                        {evt.onChainTxHash && (
                          <a
                            href={`https://blockexplorer.electroneum.com/tx/${evt.onChainTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <FileText className="w-2.5 h-2.5" /> View Record
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-slate-600 leading-relaxed px-4">
              Powered by <span className="text-slate-500 font-semibold">Recover</span> · Tamper-Proof Delivery Verification ·{" "}
              <Link href="/" className="text-slate-500 hover:text-slate-400 underline">recoverprotocol.xyz</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
