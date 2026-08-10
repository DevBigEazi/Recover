"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Download, Globe, ShieldAlert, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, ArrowRightLeft, X, Share2, CheckCircle, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "react-hot-toast";
import { formatTrackingCode } from "@/lib/format";
import { detectUserCurrency, convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

const TIER_RANKS: Record<string, number> = {
  free: 0,
  pro_starter: 1,
  pro_growth: 2,
  pro_scale: 3,
};

const TIER_NAMES: Record<string, string> = {
  free: "Free Bootstrap",
  pro_starter: "Pro Starter",
  pro_growth: "Pro Growth",
  pro_scale: "Pro Scale",
};

interface ShipmentEvent {
  event: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  operator: string;
  location?: string | null;
  locationContext?: string | null;
  timestamp: string;
  onChainTxHash?: string | null;
}

interface Shipment {
  innerSecret: string | null;
  _id: string;
  packageId: string;
  shipperAddress: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  innerSecretHash: string;
  metadata?: Record<string, unknown> | null;
  events: ShipmentEvent[];
  webhookUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}


export default function ShipmentsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const { openLogin } = useAuth();
  const { apiKey, subscriptionActive, role, companyName, plan, billingCycle, billingCycleStart, shipmentsThisMonth, rolloverQuota, isProfileLoaded, refetchProfile } = useProfile();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (account && role && role !== "merchant") {
      router.replace("/dashboard");
    }
  }, [account, role, router]);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"pro_starter" | "pro_growth" | "pro_scale">("pro_growth");
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("monthly");
  const [userCurrency, setUserCurrency] = useState<UserCurrencyInfo | null>(null);

  useEffect(() => {
    detectUserCurrency().then(setUserCurrency);
  }, []);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [packageName, setPackageName] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [stickerSize, setStickerSize] = useState<"mini" | "standard" | "large">("mini");
  const [showStickerDownload, setShowStickerDownload] = useState<Shipment | null>(null);
  const [createdInnerSecret, setCreatedInnerSecret] = useState<string | null>(null);

  const [selectedHandoverShipment, setSelectedHandoverShipment] = useState<Shipment | null>(null);
  const [handoverRiderName, setHandoverRiderName] = useState("");
  const [handoverRiderPhone, setHandoverRiderPhone] = useState("");
  const [handoverRiderPlateNumber, setHandoverRiderPlateNumber] = useState("");
  const [handoverLocation, setHandoverLocation] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "Created" | "InTransit" | "Verified" | "Disputed">("all");
  const [isMobileRegisterOpen, setIsMobileRegisterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [lastHandoverResult, setLastHandoverResult] = useState<{
    riderLink: string;
    recipientLink: string;
    courierPin: string;
    riderPhone: string | null;
    riderName: string | null;
  } | null>(null);

  const handleLogHandoverMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !selectedHandoverShipment) return;
    if (!handoverRiderPhone.trim()) {
      toast.error("Please provide the rider's contact phone number.");
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const response = await fetch(`/api/v1/shipments/${selectedHandoverShipment.packageId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorAddress: account.address,
          riderName: handoverRiderName.trim() || undefined,
          riderPhone: handoverRiderPhone.trim(),
          riderPlateNumber: handoverRiderPlateNumber.trim() || undefined,
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
        riderPhone: data.riderPhone || handoverRiderPhone.trim() || null,
        riderName: data.riderName || handoverRiderName.trim() || null,
      });

      setSelectedHandoverShipment(null);
      setHandoverRiderName("");
      setHandoverRiderPhone("");
      setHandoverRiderPlateNumber("");
      setHandoverLocation("");
      setHandoverNotes("");
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Handover error";
      toast.error(msg);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handlePrintSticker = (shipment: Shipment) => {
    const scanUrl = `${window.location.origin}/scan/${formatTrackingCode(shipment.packageId)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=4&data=${encodeURIComponent(scanUrl)}`;
    const activePin = shipment.innerSecret || createdInnerSecret || ("RCVR-" + (shipment.packageId.startsWith("0x") ? shipment.packageId.slice(2, 10) : shipment.packageId.slice(0, 8)).toUpperCase());

    const widthMap = {
      mini: "280px",
      standard: "360px",
      large: "460px",
    };
    const qrBoxMap = {
      mini: "140px",
      standard: "180px",
      large: "230px",
    };
    const headerFontMap = {
      mini: "9px",
      standard: "10px",
      large: "12px",
    };
    const pinFontMap = {
      mini: "15px",
      standard: "18px",
      large: "22px",
    };

    const targetWidth = widthMap[stickerSize] || "360px";
    const targetQrBox = qrBoxMap[stickerSize] || "180px";
    const targetHeaderFont = headerFontMap[stickerSize] || "10px";
    const targetPinFont = pinFontMap[stickerSize] || "18px";

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Shipment Label - ${formatTrackingCode(shipment.packageId)}</title>
            <style>
              @page { size: auto; margin: 0; }
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
              }
              body {
                margin: 0;
                padding: 24px;
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                background: white;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .sticker {
                width: ${targetWidth};
                border: 4px solid #0F172A;
                text-align: center;
                box-sizing: border-box;
                background: linear-gradient(180deg, #E8ECF0 0%, #D1D5DB 50%, #C4C9CF 100%) !important;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .holo-pattern {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: repeating-linear-gradient(45deg, rgba(180, 200, 220, 0.15), rgba(180, 200, 220, 0.15) 2px, transparent 2px, transparent 18px);
              }
              .header {
                background: #0F172A !important;
                color: white !important;
                font-size: ${targetHeaderFont};
                font-weight: bold;
                padding: 10px 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                letter-spacing: 0.3px;
                -webkit-print-color-adjust: exact !important;
              }
              .header img { width: 18px; height: 18px; object-fit: contain; }
              .body-content { padding: 14px 16px 10px; position: relative; z-index: 1; }
              .delivery-badge { font-size: 10px; font-weight: bold; color: #1E293B; text-align: center; margin-bottom: 4px; }
              .scan-label { font-size: 9px; font-weight: bold; color: #475569; margin-bottom: 10px; text-align: center; }
              .qr-box {
                width: ${targetQrBox};
                height: ${targetQrBox};
                background: white !important;
                border: 3px solid #1E293B;
                padding: 6px;
                box-sizing: border-box;
                margin: 0 auto 10px auto;
                -webkit-print-color-adjust: exact !important;
              }
              .qr-img { width: 100%; height: 100%; object-fit: contain; }
              .shield { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 4px auto 8px auto; }
              .shield-icon { font-size: 16px; }
              .shield-text { font-size: 10px; font-weight: bold; color: #0F172A; }
              .realtime { font-size: 9px; font-weight: bold; color: #475569; letter-spacing: 0.5px; margin: 6px 0 2px; }
              .tracking { font-size: 14px; font-weight: bold; font-family: monospace; color: #0F172A; margin: 4px 0 8px; }
              .divider { border-top: 1.5px dashed #94A3B8; margin: 0 20px; }
              .scratch-zone {
                background: #FFFFFF !important;
                margin: 10px 20px;
                padding: 16px 10px;
                border: 2px dashed #94A3B8;
                position: relative;
                border-radius: 4px;
                -webkit-print-color-adjust: exact !important;
              }
              .scratch-text { font-size: ${targetPinFont}; font-weight: bold; font-family: monospace; color: #0F172A; }
              .scratch-label { font-size: 9px; font-weight: bold; color: #0F172A; margin: 8px 0 6px; letter-spacing: 0.3px; }
              .side-warn { writing-mode: vertical-rl; text-orientation: mixed; position: absolute; font-size: 8px; font-weight: bold; color: #64748B; letter-spacing: 0.3px; z-index: 2; }
              .side-warn.left { left: 6px; top: 50%; transform: translateY(-50%) rotate(180deg); }
              .side-warn.right { right: 6px; top: 50%; transform: translateY(-50%); }
              .footer { background: #0F172A !important; color: white !important; font-size: 9px; font-weight: bold; padding: 7px 12px; letter-spacing: 0.4px; -webkit-print-color-adjust: exact !important; }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div class="holo-pattern"></div>
              <div class="header">
                <img src="${window.location.origin}/icon-192.png" alt="Recover Logo" />
                <span>PREMIUM TAMPER-PROOF SECURITY LABEL BY https://userecover.xyz</span>
              </div>
              <span class="side-warn left">DO NOT ACCEPT IF SEAL IS BROKEN</span>
              <span class="side-warn right">DO NOT ACCEPT IF SEAL IS BROKEN</span>
              <div class="body-content">
                <div class="delivery-badge">📍 DELIVERY TRACKING</div>
                <div class="scan-label">SCAN TO TRACK / HANDOVER</div>
                <div class="qr-box">
                  <img class="qr-img" src="${qrUrl}" />
                </div>
                <div class="shield">
                  <span class="shield-icon">🛡️</span>
                  <span class="shield-text">SECURE SHIP</span>
                </div>
                <div class="realtime">SCANNABLE FOR REAL-TIME TRACKING</div>
                <div class="tracking">${formatTrackingCode(shipment.packageId)}</div>
              </div>
              <div class="divider"></div>
              <div class="scratch-zone">
                <div class="scratch-text">${activePin}</div>
              </div>
              <div class="scratch-label">SCRATCH-OFF GENTLY</div>
              <div class="footer">RECOVER TRACK · OFFICIAL LOGISTICS SEAL</div>
            </div>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  // Fetch shipments — only for authenticated merchants
  const { data: shipments = [], isLoading, error } = useQuery<Shipment[]>({
    queryKey: ["shipments", account?.address],
    queryFn: async () => {
      const response = await fetch(`/api/v1/shipments?shipperAddress=${account!.address}`);
      if (!response.ok) throw new Error("Failed to load shipments");
      return response.json();
    },
    enabled: !!account && role === "merchant",
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const isSubscriptionActive = subscriptionActive === true || plan === "free";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    if (sessionId && account?.address) {
      const verifySub = async () => {
        try {
          toast.loading("Verifying subscription checkout...");
          const res = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, walletAddress: account.address }),
          });
          toast.dismiss();
          if (res.ok) {
            toast.success("Subscription activated successfully!");
            queryClient.invalidateQueries({ queryKey: ["profile", account.address] });
          }
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) {
          toast.dismiss();
          console.error("Subscription verification error:", e);
        }
      };
      verifySub();
    }
  }, [account?.address, queryClient]);

  if (isAuthLoading || !isProfileLoaded) {
    return (
      <main className="min-h-screen bg-slate-950 text-white pb-12">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      </main>
    );
  }

  if (account && role !== "merchant") {
    return (
      <main className="min-h-screen bg-slate-950 text-white pb-12">
        <Header />
        <div className="flex flex-col justify-center items-center py-32 gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <p className="text-xs font-medium text-slate-400">Redirecting to your personal dashboard...</p>
        </div>
      </main>
    );
  }

  const handleUpgrade = async () => {
    if (!account) return;
    setIsUpgrading(true);
    try {
      const initRes = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          planTier: selectedTier,
          billingCycle: selectedCycle,
        }),
      });
      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || "Initialization failed");
      }
      const initData = await initRes.json();
      if (initData.url) {
        window.location.href = initData.url;
      } else {
        throw new Error("Stripe checkout URL was not returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(msg);
      setIsUpgrading(false);
    }
  };

  const handleRegisterShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    if (packageWeight && (isNaN(Number(packageWeight)) || Number(packageWeight) <= 0)) {
      toast.error("Package weight must be a valid positive number in kg.");
      return;
    }

    if (webhookUrl && !webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
      toast.error("Webhook URL must start with http:// or https://");
      return;
    }

    setIsRegistering(true);
    try {
      let activeApiKey = apiKey;
      if (!activeApiKey && account?.address) {
        try {
          const keyRes = await fetch("/api/profile/api-key", {
            method: "POST",
            headers: { "x-owner-address": account.address },
          });
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            activeApiKey = keyData.apiKey;
          }
        } catch (err) {
          console.error("Failed to auto-provision API key:", err);
        }
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeApiKey) {
        headers["x-api-key"] = activeApiKey;
      }

      const response = await fetch("/api/v1/shipments/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          shipperAddress: account.address,
          webhookUrl: webhookUrl || null,
          packageName: packageName.trim() || "General Package",
          weight: packageWeight.trim() || "unknown",
          receiverName: receiverName.trim() || null,
          receiverPhone: receiverPhone.trim() || null,
          destination: destination.trim() || null,
          metadata: {
            name: packageName.trim() || "General Package",
            weight: packageWeight.trim() || "unknown",
            receiverName: receiverName.trim() || null,
            receiverPhone: receiverPhone.trim() || null,
            destination: destination.trim() || null,
          },
        }),
      });

      if (response.status === 402) {
        toast.error("Active subscription required. Please upgrade to create shipments.");
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to register shipment");
      }

      const data = await response.json();
      toast.success("Package registered and secured successfully!");
      setPackageName("");
      setPackageWeight("");
      setReceiverName("");
      setReceiverPhone("");
      setDestination("");
      setWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      refetchProfile();
      setCreatedInnerSecret(data.innerSecret || null);
      setShowStickerDownload(data.shipment);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error creating shipment";
      toast.error(errMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white pb-12">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {/* Banner with Premium Aesthetics */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-slate-800 p-8 mb-8 backdrop-blur-md shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent mb-2">
            {companyName ? `${companyName} · Shipments` : "Tamper-Proof Shipments"}
          </h1>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            {companyName
              ? `Welcome back, ${companyName}. Monitor your package chain-of-custody and verify delivery integrity in real-time.`
              : "Monitor chain of custody logs and verify package integrity in real-time. Secure deliveries using physical scratch-off QR verification codes."}
          </p>
        </div>

        {!account ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl backdrop-blur-sm">
            <ShieldAlert className="w-12 h-12 text-blue-400 mx-auto mb-4 opacity-80 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
            <button
              onClick={openLogin}
              className="bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-md"
            >
              Sign In
            </button>
          </div>
        ) : role !== "merchant" ? (
          // This branch is only hit during the brief window before the useEffect redirect fires
          <div className="flex flex-col justify-center items-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-slate-400 text-xs">Redirecting...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Middle Column: Shipment List (Appears 2nd on mobile, 1st on desktop) */}
            <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
              {(() => {
                const filteredShipments = shipments.filter((s) => {
                  if (statusFilter !== "all" && s.status !== statusFilter) return false;

                  if (searchQuery.trim()) {
                    const q = searchQuery.trim().toLowerCase();
                    const nameMatch = ((s.metadata?.name as string) || "").toLowerCase().includes(q);
                    const codeMatch = formatTrackingCode(s.packageId).toLowerCase().includes(q);
                    const idMatch = s.packageId.toLowerCase().includes(q);
                    return nameMatch || codeMatch || idMatch;
                  }

                  return true;
                });

                const totalPages = Math.max(1, Math.ceil(filteredShipments.length / ITEMS_PER_PAGE));
                const paginatedShipments = filteredShipments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                const createdCount = shipments.filter((s) => s.status === "Created").length;
                const inTransitCount = shipments.filter((s) => s.status === "InTransit").length;
                const verifiedCount = shipments.filter((s) => s.status === "Verified").length;
                const disputedCount = shipments.filter((s) => s.status === "Disputed").length;

                return (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold tracking-tight">
                          Shipments Log ({filteredShipments.length} / {shipments.length})
                        </h2>
                      </div>

                      {/* Instant Search Bar */}
                      {shipments.length > 0 && (
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Search packages by reference name or tracking code (e.g. RCV-AF791413)..."
                            className="w-full bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setCurrentPage(1);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Delivery Status Filter Tabs */}
                      {shipments.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-slate-800/80">
                          <button
                            onClick={() => {
                              setStatusFilter("all");
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                              statusFilter === "all"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
                            }`}
                          >
                            All Packages
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === "all" ? "bg-blue-800 text-blue-100" : "bg-slate-800 text-slate-400"}`}>
                              {shipments.length}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setStatusFilter("Created");
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                              statusFilter === "Created"
                                ? "bg-slate-700 text-white shadow-sm"
                                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
                            }`}
                          >
                            Registered
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === "Created" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                              {createdCount}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setStatusFilter("InTransit");
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                              statusFilter === "InTransit"
                                ? "bg-blue-950 text-blue-300 border border-blue-800 shadow-sm"
                                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
                            }`}
                          >
                            In Transit 🛵
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === "InTransit" ? "bg-blue-900 text-blue-200" : "bg-slate-800 text-slate-400"}`}>
                              {inTransitCount}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setStatusFilter("Verified");
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                              statusFilter === "Verified"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm"
                                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
                            }`}
                          >
                            Delivered (Verified) ✓
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === "Verified" ? "bg-emerald-800 text-emerald-100" : "bg-slate-800 text-slate-400"}`}>
                              {verifiedCount}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setStatusFilter("Disputed");
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                              statusFilter === "Disputed"
                                ? "bg-rose-950 text-rose-300 border border-rose-800 shadow-sm"
                                : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
                            }`}
                          >
                            Disputed ⚠
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${statusFilter === "Disputed" ? "bg-rose-800 text-rose-100" : "bg-slate-800 text-slate-400"}`}>
                              {disputedCount}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      </div>
                    ) : error ? (
                      <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-300 text-sm">Failed to load shipments. Please try reloading.</p>
                      </div>
                    ) : filteredShipments.length === 0 ? (
                      <div className="text-center py-16 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-3">
                        <Globe className="w-12 h-12 text-slate-600 mx-auto" />
                        <p className="text-slate-400 text-sm">
                          {statusFilter === "all" ? "No shipments registered yet." : `No packages found under '${statusFilter}' status.`}
                        </p>
                        {statusFilter !== "all" && (
                          <button
                            onClick={() => setStatusFilter("all")}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            View All Packages ({shipments.length})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          {paginatedShipments.map((shipment) => (
                            <div
                              key={shipment._id}
                              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-5 backdrop-blur-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="font-bold text-sm">
                                    {(shipment.metadata?.name as string) || "General Package"}
                                  </h3>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      shipment.status === "Verified"
                                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50"
                                        : shipment.status === "Disputed"
                                        ? "bg-rose-950/80 text-rose-400 border border-rose-900/50"
                                        : shipment.status === "InTransit"
                                        ? "bg-blue-950/80 text-blue-400 border border-blue-900/50"
                                        : "bg-slate-800 text-slate-300"
                                    }`}
                                  >
                                    {shipment.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded select-all">
                                    {formatTrackingCode(shipment.packageId)}
                                  </span>
                                  <span>·</span>
                                  <span>Registered: {new Date(shipment.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {shipment.status !== "Verified" && shipment.status !== "Delivered" && shipment.status !== "Disputed" && (
                                  <>
                                    <button
                                      onClick={() => setSelectedHandoverShipment(shipment)}
                                      className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-800/60 cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" /> Handover
                                    </button>
                                    <button
                                      onClick={() => {
                                        const trackingCode = formatTrackingCode(shipment.packageId);
                                        const pin = (shipment.metadata?.courierPin as string) || "";
                                        const origin = typeof window !== "undefined" ? window.location.origin : "";
                                        setLastHandoverResult({
                                          riderLink: `${origin}/scan/${trackingCode}${pin ? `?pin=${pin}` : ""}`,
                                          recipientLink: `${origin}/scan/${trackingCode}${pin ? `?pin=${pin}` : ""}`,
                                          courierPin: pin || "Not Generated",
                                          riderPhone: (shipment.metadata?.riderPhone as string) || null,
                                          riderName: (shipment.metadata?.riderName as string) || null,
                                        });
                                      }}
                                      className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-indigo-800/60 cursor-pointer"
                                    >
                                      <Share2 className="w-3.5 h-3.5" /> Links
                                    </button>
                                    <button
                                      onClick={() => setShowStickerDownload(shipment)}
                                      className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Label
                                    </button>
                                  </>
                                )}
                                <Link
                                  href={`/shipments/${formatTrackingCode(shipment.packageId)}`}
                                  className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                >
                                  Track <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800/80 flex-wrap">
                            <p className="text-xs text-slate-400 font-medium">
                              Showing <span className="font-bold text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="font-bold text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredShipments.length)}</span> of <span className="font-bold text-white">{filteredShipments.length}</span> packages
                            </p>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                              </button>

                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentPage === pageNum
                                      ? "bg-blue-600 text-white shadow-sm"
                                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              ))}

                              <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right Column: Register Form or Subscription Paywall */}
            <div className="space-y-6">
              {!isSubscriptionActive ? (() => {
                const currentRank = TIER_RANKS[plan || "free"] || 0;
                const targetRank = TIER_RANKS[selectedTier] || 0;
                const isDowngrade = targetRank < currentRank;
                const isSameTier = targetRank === currentRank;
                const isSameCycle = billingCycle === selectedCycle;
                const isCycleDowngrade = isSameTier && billingCycle === "yearly" && selectedCycle === "monthly";
                const currentName = TIER_NAMES[plan || "free"] || "Current Plan";
                const targetName = TIER_NAMES[selectedTier] || "Selected Plan";

                return (
                  <div className="bg-linear-to-b from-indigo-950/40 to-slate-950 border border-indigo-900/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl space-y-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <AlertTriangle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold">
                      {isDowngrade ? "Change Subscription Tier" : "Activate Your Subscription"}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Select a logistics plan tier and billing cycle to start creating tamper-proof shipments.
                    </p>

                    {/* Downgrade Notice */}
                    {isDowngrade && (
                      <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <strong className="font-semibold block text-amber-300">Plan Downgrade Notice</strong>
                          <p className="text-[11px] text-amber-300/80 leading-relaxed">
                            You are currently on <strong>{currentName}</strong>. Downgrading to <strong>{targetName}</strong> will switch your plan tier upon checkout. All unused shipment capacity will automatically roll over.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Monthly / Annual Cycle Toggle */}
                    <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedCycle("monthly")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedCycle === "monthly"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCycle("yearly")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          selectedCycle === "yearly"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>Annual</span>
                        <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1 rounded-full">
                          -10%
                        </span>
                      </button>
                    </div>

                    {/* Tier Selection Cards */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={TIER_RANKS["pro_starter"] < currentRank}
                        onClick={() => setSelectedTier("pro_starter")}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          TIER_RANKS["pro_starter"] < currentRank
                            ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
                            : selectedTier === "pro_starter"
                            ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="block text-xs font-bold text-white">Pro Starter</span>
                            {plan === "pro_starter" && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">Current Plan</span>
                            )}
                            {(TIER_RANKS["pro_starter"] < currentRank) && (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">Lower Tier (Disabled)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">0 – 9,999 shipments / mo</span>
                        </div>
                        <span className="text-xs font-bold text-blue-400">
                          {selectedCycle === "yearly"
                            ? `${convertUsdPrice(162, userCurrency).formattedLocal} / yr (Annual Billing)`
                            : `${convertUsdPrice(15, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={TIER_RANKS["pro_growth"] < currentRank}
                        onClick={() => setSelectedTier("pro_growth")}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          TIER_RANKS["pro_growth"] < currentRank
                            ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
                            : selectedTier === "pro_growth"
                            ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="block text-xs font-bold text-white">Pro Growth</span>
                            {plan === "pro_growth" && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">Current Plan</span>
                            )}
                            {(TIER_RANKS["pro_growth"] < currentRank) && (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full">Lower Tier (Disabled)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">10,000 – 99,999 shipments / mo</span>
                        </div>
                        <span className="text-xs font-bold text-blue-400">
                          {selectedCycle === "yearly"
                            ? `${convertUsdPrice(486, userCurrency).formattedLocal} / yr (Annual Billing)`
                            : `${convertUsdPrice(45, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={TIER_RANKS["pro_scale"] < currentRank}
                        onClick={() => setSelectedTier("pro_scale")}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          TIER_RANKS["pro_scale"] < currentRank
                            ? "border-slate-800/40 bg-slate-900/20 opacity-40 cursor-not-allowed"
                            : selectedTier === "pro_scale"
                            ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 cursor-pointer shadow-sm"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700 cursor-pointer"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="block text-xs font-bold text-white">Pro Scale</span>
                            {plan === "pro_scale" && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full">Current Plan</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">500,000+ shipments / mo</span>
                        </div>
                        <span className="text-xs font-bold text-blue-400">
                          {selectedCycle === "yearly"
                            ? `${convertUsdPrice(1080, userCurrency).formattedLocal} / yr (Annual Billing)`
                            : `${convertUsdPrice(100, userCurrency).formattedLocal} / mo (Monthly Billing)`}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={isUpgrading || (subscriptionActive && role === "merchant" && isSameTier && isSameCycle) || targetRank < currentRank || isCycleDowngrade}
                      className="w-full text-center font-bold text-xs py-3 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                    >
                      {isUpgrading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Loading Stripe Checkout...</>
                      ) : subscriptionActive && role === "merchant" && isSameTier && isCycleDowngrade ? (
                        "Annual Billing Active Until Renewal"
                      ) : subscriptionActive && role === "merchant" && isSameTier && isSameCycle ? (
                        "Current Active Plan"
                      ) : (
                        `${isSameTier ? "Switch to " : "Pay "} ${
                          selectedTier === "pro_starter"
                            ? (selectedCycle === "yearly" ? convertUsdPrice(162, userCurrency).formattedLocal : convertUsdPrice(15, userCurrency).formattedLocal)
                            : selectedTier === "pro_growth"
                            ? (selectedCycle === "yearly" ? convertUsdPrice(486, userCurrency).formattedLocal : convertUsdPrice(45, userCurrency).formattedLocal)
                            : (selectedCycle === "yearly" ? convertUsdPrice(1080, userCurrency).formattedLocal : convertUsdPrice(100, userCurrency).formattedLocal)
                        } / ${selectedCycle === "yearly" ? "year (Annual Billing)" : "month (Monthly Billing)"} with Stripe`
                      )}
                    </button>
                  </div>
                );
              })() : (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-lg">
                  {/* Card Header — Interactive toggle on mobile (< lg), static on desktop (≥ lg) */}
                  <button
                    type="button"
                    onClick={() => setIsMobileRegisterOpen(!isMobileRegisterOpen)}
                    className="w-full flex items-center justify-between text-left lg:pointer-events-none mb-1 lg:mb-4 group cursor-pointer lg:cursor-default select-none"
                  >
                    <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-400" /> Register Package
                    </h3>
                    <span className="lg:hidden p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 group-hover:text-white transition-colors flex items-center shrink-0">
                      {isMobileRegisterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {/* Form Body — Collapsible on mobile, always visible on desktop (lg:block) */}
                  <div className={`mt-3 lg:mt-0 space-y-4 ${isMobileRegisterOpen ? "block" : "hidden lg:block"}`}>
                    {(() => {
                      const baseLimit = plan === "pro_starter" ? 10000 : plan === "pro_growth" ? 100000 : plan === "pro_scale" ? 500000 : plan === "pro" ? 100000 : 100;
                      const totalCap = baseLimit + (rolloverQuota || 0);
                      return (
                        <div className="mb-4 p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-xs flex items-center justify-between text-blue-200">
                          <span>
                            🏷️ <strong>{plan === "free" ? "Free Tier" : plan === "pro_starter" ? "Pro Starter" : plan === "pro_growth" ? "Pro Growth" : plan === "pro_scale" ? "Pro Scale" : "Pro Tier"}:</strong> {shipmentsThisMonth.toLocaleString()} / {totalCap.toLocaleString()} shipments used {billingCycleStart ? `(Since ${new Date(billingCycleStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })})` : ""}
                          </span>
                          <Link href="/settings" className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline">
                            Manage →
                          </Link>
                        </div>
                      );
                    })()}
                    <form onSubmit={handleRegisterShipment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Package Reference Name *</label>
                      <input
                        type="text"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        placeholder="e.g. iPhone 15 Pro, Shipment A"
                        required
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Recipient Name (Optional)</label>
                        <input
                          type="text"
                          value={receiverName}
                          onChange={(e) => setReceiverName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Recipient Phone Number (Optional)</label>
                        <input
                          type="tel"
                          value={receiverPhone}
                          onChange={(e) => setReceiverPhone(e.target.value)}
                          placeholder="e.g. +234 801 234 5678"
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Weight in kg (Optional)</label>
                        <input
                          type="text"
                          value={packageWeight}
                          onChange={(e) => setPackageWeight(e.target.value)}
                          placeholder="e.g. 0.8"
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Destination City / Area (Optional)</label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="e.g. Lekki, Lagos"
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 transition-colors"
                        />
                      </div>
                    </div>


                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:bg-slate-800 disabled:text-slate-600"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Handing over...
                        </>
                      ) : (
                        "Register Package"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </main>

      {/* Label Sticker Print Modal */}
      {showStickerDownload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white">Print Security Label Sticker</h3>
                <p className="text-[11px] text-slate-400">Select dimension size and print official security sticker.</p>
              </div>
              <button
                onClick={() => setShowStickerDownload(null)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-400">Dimensions Selection</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setStickerSize("mini")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    stickerSize === "mini"
                      ? "bg-blue-600/10 border-blue-500 text-blue-400"
                      : "border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  Mini (~10mm) <span className="block text-[9px] text-slate-500 font-normal">(Recommended)</span>
                </button>
                <button
                  onClick={() => setStickerSize("standard")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    stickerSize === "standard"
                      ? "bg-blue-600/10 border-blue-500 text-blue-400"
                      : "border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  Standard (~25mm)
                </button>
                <button
                  onClick={() => setStickerSize("large")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    stickerSize === "large"
                      ? "bg-blue-600/10 border-blue-500 text-blue-400"
                      : "border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  Large (~50mm)
                </button>
              </div>
            </div>

            {/* Sticker Preview — Tamper-Proof Design */}
            {(() => {
              const previewWidthMap = { mini: "max-w-[240px]", standard: "max-w-[290px]", large: "max-w-[340px]" };
              const previewWidthClass = previewWidthMap[stickerSize] || "max-w-[290px]";
              return (
                <div className={`border border-slate-700 rounded-xl overflow-hidden mx-auto transition-all duration-300 ${previewWidthClass}`} style={{ background: "linear-gradient(180deg, #E8ECF0 0%, #D1D5DB 50%, #C4C9CF 100%)" }}>
                  {/* Header bar */}
                  <div className="bg-slate-900 text-white text-[7px] font-bold text-center py-1.5 px-2 flex items-center justify-center gap-1.5 tracking-wider">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon-192.png" alt="Recover Logo" className="w-3 h-3 object-contain shrink-0" />
                    <span>PREMIUM TAMPER-PROOF SECURITY LABEL BY https://userecover.xyz</span>
                  </div>

                  {/* Body */}
                  <div className="p-2.5 relative text-center">
                    {/* Side warnings */}
                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[5.5px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                      DO NOT ACCEPT IF SEAL IS BROKEN
                    </div>
                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 rotate-90 origin-center text-[5.5px] font-bold text-slate-500 tracking-wider whitespace-nowrap">
                      DO NOT ACCEPT IF SEAL IS BROKEN
                    </div>

                    {/* Delivery tracking badge */}
                    <div className="text-[7.5px] font-bold text-slate-800 text-center mb-0.5">📍 DELIVERY TRACKING</div>
                    <div className="text-[6.5px] font-bold text-slate-500 text-center mb-1.5">SCAN TO TRACK / HANDOVER</div>

                    {/* Centered QR Code Box */}
                    <div className="w-28 h-28 bg-white border-2 border-slate-800 p-1 mx-auto mb-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(
                          `${typeof window !== "undefined" ? window.location.origin : ""}/scan/${formatTrackingCode(showStickerDownload.packageId)}`
                        )}`}
                        alt="Package QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Side-by-side Shield Badge */}
                    <div className="flex items-center justify-center gap-1 mx-auto mb-1.5">
                      <span className="text-sm">🛡️</span>
                      <span className="text-[7.5px] font-extrabold text-slate-800 tracking-wide">SECURE SHIP</span>
                    </div>

                    {/* Scannable label */}
                    <div className="text-[6.5px] font-bold text-slate-500 tracking-wider text-center mb-0.5">SCANNABLE FOR REAL-TIME TRACKING</div>

                    {/* Tracking code */}
                    <div className="text-[10px] font-mono font-extrabold text-slate-900 text-center mb-1.5">
                      {formatTrackingCode(showStickerDownload.packageId)}
                    </div>

                    {/* Dashed divider */}
                    <div className="border-t border-dashed border-slate-400 mx-2 mb-1.5" />

                    {/* Secret PIN Zone */}
                    {(() => {
                      const activePinModal = showStickerDownload.innerSecret || createdInnerSecret || "RCVR-PROTECTED";
                      return (
                        <div className="bg-white border-2 border-dashed border-slate-400 mx-2 py-2 text-center rounded-sm select-none pointer-events-none">
                          <div className="text-[10px] font-mono font-extrabold text-slate-900 select-none">
                            {activePinModal}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-[6px] font-bold text-slate-800 text-center mt-1 tracking-wider select-none">SCRATCH-OFF GENTLY</div>
                  </div>

                  {/* Footer bar */}
                  <div className="bg-slate-900 text-white text-[6.5px] font-bold text-center py-1 tracking-wider">
                    RECOVER TRACK · OFFICIAL LOGISTICS SEAL
                  </div>
                </div>
              );
            })()}

            {/* Merchant Action Required Banner — Security Protected */}
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 text-center space-y-1.5 select-none">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Merchant Notice</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-normal font-medium">
                Print this label onto package, then <strong className="text-amber-300 underline">manually apply a physical scratch-off overlay sticker</strong> over the Secret Verification PIN area before dispatch.
              </p>
              <div className="text-[10px] font-semibold text-amber-300/80">
                🔒 PIN copying &amp; text selection are disabled for security.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowStickerDownload(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintSticker(showStickerDownload)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-xs font-bold py-2.5 rounded-xl text-white transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Custody Handover Modal */}
      {selectedHandoverShipment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-400" /> Log Custody Handover
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Package: <span className="font-mono text-slate-300 font-bold">{formatTrackingCode(selectedHandoverShipment.packageId)}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedHandoverShipment(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Record custody transfer to a delivery rider or driver. The event will be logged onto the tamper-proof ledger.
            </p>

            <form onSubmit={handleLogHandoverMain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Rider Contact Phone Number *
                </label>
                <input
                  type="tel"
                  value={handoverRiderPhone}
                  onChange={(e) => setHandoverRiderPhone(e.target.value)}
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
                    value={handoverRiderName}
                    onChange={(e) => setHandoverRiderName(e.target.value)}
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
                    value={handoverRiderPlateNumber}
                    onChange={(e) => setHandoverRiderPlateNumber(e.target.value)}
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
                  onClick={() => setSelectedHandoverShipment(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHandover || !handoverRiderPhone.trim()}
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
    </div>
  );
}

