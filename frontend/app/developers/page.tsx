"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { Code, Copy, Check, ArrowRight, Server, Globe, KeyRound, UserPlus, Package, ShieldCheck, Play, Loader2, QrCode } from "lucide-react";


export default function DevelopersPage() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<"curl" | "javascript" | "python">("curl");

  // Interactive REST API Console State
  const [apiTestKey, setApiTestKey] = useState<string>("");
  const [selectedConsoleEndpoint, setSelectedConsoleEndpoint] = useState<"create" | "edit_patch" | "list" | "verify_get" | "handover_post" | "verify_post" | "history_get" | "dispute_post" | "health_get" | "shipment_qr">("create");
  const [reqParamId, setReqParamId] = useState<string>("RCV-DEMOPKG123");
  const [reqBodyText, setReqBodyText] = useState<string>(
    JSON.stringify({
      packageName: "Test Parcel Simulation",
      receiverName: "Alex Morgan",
      receiverPhone: "+2348099887766",
      destination: "Victoria Island, Lagos",
      weight: "0.85"
    }, null, 2)
  );
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testRespStatus, setTestRespStatus] = useState<number | null>(null);
  const [testRespTime, setTestRespTime] = useState<number | null>(null);
  const [testRespData, setTestRespData] = useState<unknown | null>(null);

  // Auto-populate API key if available in sessionStorage
  useEffect(() => {
    if (!apiTestKey && typeof window !== "undefined") {
      try {
        const storedKey = sessionStorage.getItem("last_generated_test_api_key");
        if (storedKey) {
          setApiTestKey(storedKey);
          sessionStorage.removeItem("last_generated_test_api_key");
        }
      } catch {
        // ignore session storage errors
      }
    }
  }, [apiTestKey]);

  const [lastCreatedTrackingCode, setLastCreatedTrackingCode] = useState<string>("RCV-DEMOPKG123");
  const [lastCreatedInnerSecret, setLastCreatedInnerSecret] = useState<string>("RCVR-59DBE11D");

  const defaultConsoleBodies: Record<string, string> = {
    create: JSON.stringify({
      packageName: "Test Parcel Simulation",
      receiverName: "Alex Morgan",
      receiverPhone: "+2348099887766",
      destination: "Victoria Island, Lagos",
      weight: "0.85"
    }, null, 2),
    edit_patch: JSON.stringify({
      packageName: "Updated Express Parcel",
      receiverName: "Alex Morgan",
      receiverPhone: "+2348099887766",
      destination: "Lekki Phase 1, Lagos",
      weight: "1.20"
    }, null, 2),
    list: "",
    verify_get: "",
    handover_post: JSON.stringify({
      nextHandler: "0x3f12a8b901e23f45678901234567890123456789",
      riderName: "John Rider",
      riderPhone: "+2348011223344",
      location: "Ikeja Dispatch Hub"
    }, null, 2),
    verify_post: JSON.stringify({
      innerSecret: "RCVR-59DBE11D",
      location: "Lekki Phase 1"
    }, null, 2),
    history_get: "",
    dispute_post: JSON.stringify({
      innerSecret: "RCVR-59DBE11D",
      reason: "Package contents damaged on arrival",
      location: "Lekki Phase 1"
    }, null, 2),
    health_get: "",
    shipment_qr: ""
  };

  const handleEndpointSelect = (ep: "create" | "edit_patch" | "list" | "verify_get" | "handover_post" | "verify_post" | "history_get" | "dispute_post" | "health_get" | "shipment_qr") => {
    setSelectedConsoleEndpoint(ep);
    setReqBodyText(defaultConsoleBodies[ep] || "");
    setTestRespStatus(null);
    setTestRespData(null);
    setTestRespTime(null);

    if (ep === "verify_post") {
      const secret = lastCreatedInnerSecret || "RCVR-59DBE11D";
      setReqParamId(secret);
      setReqBodyText(JSON.stringify({ innerSecret: secret, location: "Lekki Phase 1" }, null, 2));
    } else if (ep === "dispute_post") {
      const secret = lastCreatedInnerSecret || "RCVR-59DBE11D";
      setReqParamId(lastCreatedTrackingCode || "RCV-DEMOPKG123");
      setReqBodyText(JSON.stringify({ innerSecret: secret, reason: "Package contents damaged on arrival", location: "Lekki Phase 1" }, null, 2));
    } else if (ep === "edit_patch" || ep === "verify_get" || ep === "handover_post" || ep === "history_get" || ep === "shipment_qr") {
      setReqParamId(lastCreatedTrackingCode || "RCV-DEMOPKG123");
    }
  };

  const handleReqParamIdInputChange = (val: string) => {
    setReqParamId(val);
    if (selectedConsoleEndpoint === "verify_post") {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(reqBodyText) as Record<string, unknown>;
      } catch {
        parsed = { location: "Lekki Phase 1" };
      }
      parsed.innerSecret = val.trim();
      setReqBodyText(JSON.stringify(parsed, null, 2));
    }
  };

  const executeApiTestRequest = async () => {
    if (apiTestKey.trim().startsWith("rec_live_")) {
      setTestRespStatus(400);
      setTestRespData({ error: "Live API keys (rec_live_...) are rejected in the test console. Please use a test key (rec_test_...)." });
      return;
    }

    setIsExecutingTest(true);
    setTestRespStatus(null);
    setTestRespData(null);
    const start = performance.now();

    try {
      let url = "";
      let method = "POST";
      let bodyData: string | undefined = undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiTestKey.trim()) {
        headers["Authorization"] = `Bearer ${apiTestKey.trim()}`;
      }

      if (selectedConsoleEndpoint === "create") {
        url = "/api/v1/shipments/create";
        method = "POST";
        bodyData = reqBodyText;
      } else if (selectedConsoleEndpoint === "edit_patch") {
        url = `/api/v1/shipments/${reqParamId.trim()}`;
        method = "PATCH";
        bodyData = reqBodyText;
      } else if (selectedConsoleEndpoint === "list") {
        url = "/api/v1/shipments";
        method = "GET";
      } else if (selectedConsoleEndpoint === "verify_get") {
        url = `/api/v1/shipments/${reqParamId.trim()}/verify`;
        method = "GET";
      } else if (selectedConsoleEndpoint === "handover_post") {
        url = `/api/v1/shipments/${reqParamId.trim()}/handover`;
        method = "POST";
        bodyData = reqBodyText;
      } else if (selectedConsoleEndpoint === "verify_post") {
        url = `/api/v1/shipments/${reqParamId.trim()}/verify`;
        method = "POST";
        let parsedBody: Record<string, unknown> = {};
        try {
          parsedBody = JSON.parse(reqBodyText) as Record<string, unknown>;
        } catch {
          parsedBody = { location: "Lekki Phase 1" };
        }
        parsedBody.innerSecret = reqParamId.trim();
        bodyData = JSON.stringify(parsedBody, null, 2);
        setReqBodyText(bodyData);
      } else if (selectedConsoleEndpoint === "history_get") {
        url = `/api/v1/shipments/${reqParamId.trim()}/history`;
        method = "GET";
      } else if (selectedConsoleEndpoint === "dispute_post") {
        url = `/api/v1/shipments/${reqParamId.trim()}/dispute`;
        method = "POST";
        bodyData = reqBodyText;
     
      } else if (selectedConsoleEndpoint === "shipment_qr") {
        url = `/api/v1/shipments/${reqParamId.trim()}/qr`;
        method = "GET";
      } else if (selectedConsoleEndpoint === "health_get") {
        url = "/api/v1/health";
        method = "GET";
      }

      const res = await fetch(url, {
        method,
        headers,
        body: method === "GET" ? undefined : bodyData,
      });

      const end = performance.now();
      setTestRespTime(Math.round(end - start));
      setTestRespStatus(res.status);

      const data = await res.json().catch(() => ({ rawText: "Failed to parse JSON response" }));
      setTestRespData(data);

      if (res.ok && data?.trackingCode) {
        setLastCreatedTrackingCode(data.trackingCode);
        if (selectedConsoleEndpoint !== "verify_post") {
          setReqParamId(data.trackingCode);
        }
      }

      if (res.ok && data?.innerSecret) {
        setLastCreatedInnerSecret(data.innerSecret);
        const updatedBody = JSON.stringify({
          innerSecret: data.innerSecret,
          location: "Lekki Phase 1"
        }, null, 2);
        if (selectedConsoleEndpoint === "verify_post") {
          setReqParamId(data.innerSecret);
          setReqBodyText(updatedBody);
        }
      }
    } catch (err: unknown) {
      const end = performance.now();
      setTestRespTime(Math.round(end - start));
      setTestRespStatus(500);
      setTestRespData({ error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setIsExecutingTest(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const codeExamples = {
    createShipment: {
      curl: `curl -X POST https://userecover.xyz/api/v1/shipments/create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -d '{
    "packageName": "iPhone 15 Pro Dispatch",
    "weight": "0.45",
    "receiverPhone": "+2348012345678"
  }'`,
      javascript: `const response = await fetch('https://userecover.xyz/api/v1/shipments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...'
  },
  body: JSON.stringify({
    packageName: 'iPhone 15 Pro Dispatch',
    receiverName: 'John Doe',
    receiverPhone: '+2348012345678',
    destination: 'Lekki, Lagos',
    weight: '0.45'
  })
});

const data = await response.json();
console.log('Dispatch Created:', data.packageId, data.innerSecret);`,
      python: `import requests

url = "https://userecover.xyz/api/v1/shipments/create"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer rec_live_8f921a4b901e23f..."
}
payload = {
    "packageName": "iPhone 15 Pro Dispatch",
    "receiverName": "John Doe",
    "receiverPhone": "+2348012345678",
    "destination": "Lekki, Lagos",
    "weight": "0.45"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
    },
    getQrCode: {
      curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json"`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json');
const qrData = await res.json();
console.log('QR Code Image Link:', qrData.qrImageUrl); // PNG format for labels
console.log('Public Verification Scan Link:', qrData.scanUrl);`,
      python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json")
print(res.json())`,
    },
    verifyShipment: {
      curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify"`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify');
const packageData = await res.json();
console.log('Package Status:', packageData.status); // InTransit | Delivered | Disputed`,
      python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify")
print(res.json())`,
    },
    handoverShipment: {
      curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "riderName": "John Rider", "riderPhone": "+2348011223344", "location": "Ikeja Hub, Lagos" }'`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ riderName: 'John Rider', riderPhone: '+2348011223344', location: 'Ikeja Hub, Lagos' })
});
const result = await res.json();
console.log('Handover Status:', result.shipment.status);`,
      python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"riderName": "John Rider", "riderPhone": "+2348011223344", "location": "Ikeja Hub, Lagos"}
)
print(res.json())`,
    },
    confirmDelivery: {
      curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos" }'`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ innerSecret: 'RCVR-A8F2B1C0', location: 'Lekki, Lagos' })
});
const result = await res.json();
console.log('Delivery Verified:', result.shipment.status);`,
      python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos"}
)
print(res.json())`,
    },
    historyShipment: {
      curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history"`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history');
const history = await res.json();
console.log('Custody Timeline Events:', history.events);`,
      python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history")
print(res.json())`,
    },
    disputeShipment: {
      curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "innerSecret": "RCVR-A8F2B1C0", "reason": "Damaged contents on arrival", "location": "Lagos" }'`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ innerSecret: 'RCVR-A8F2B1C0', reason: 'Damaged contents on arrival', location: 'Lagos' })
});
const result = await res.json();
console.log('Dispute Logged:', result.success);`,
      python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"innerSecret": "RCVR-A8F2B1C0", "reason": "Damaged contents on arrival", "location": "Lagos"}
)
print(res.json())`,
    },
    healthCheck: {
      curl: `curl -X GET "https://userecover.xyz/api/v1/health"`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/health');
const health = await res.json();
console.log('API Health Status:', health.status); // "healthy"`,
      python: `import requests

res = requests.get("https://userecover.xyz/api/v1/health")
print(res.json())`,
    },

    listShipments: {
      curl: `curl -X GET "https://userecover.xyz/api/v1/shipments" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..."`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments', {
  headers: { 'Authorization': 'Bearer rec_live_8f921a4b901e23f...' }
});
const shipments = await res.json();
console.log('My Shipments:', shipments.length);`,
      python: `import requests

res = requests.get(
    "https://userecover.xyz/api/v1/shipments",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."}
)
print(res.json())`,
    },

    editShipment: {
      curl: `curl -X PATCH "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "packageName": "Updated Parcel Name", "receiverPhone": "+2348099887766", "destination": "Lekki Phase 1" }'`,
      javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ packageName: 'Updated Parcel Name', receiverPhone: '+2348099887766', destination: 'Lekki Phase 1' })
});
const result = await res.json();
console.log('Updated:', result.success);`,
      python: `import requests

res = requests.patch(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"packageName": "Updated Parcel Name", "receiverPhone": "+2348099887766", "destination": "Lekki Phase 1"}
)
print(res.json())`,
    },
  };

  const webhookPayloadExample = `{
  "event": "package.delivered",
  "timestamp": "2026-08-03T14:30:00Z",
  "data": {
    "packageId": "RCV-8F912A3B4C5D",
    "companyName": "Big Eazi Logistics",
    "shipperAddress": "0x6e799abd05b044acb6d9a59605de21ec845c2180",
    "packageName": "iPhone 15 Pro Dispatch",
    "status": "Verified",
    "recipient": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    "location": "Lagos, NG",
    "onChainTxHash": "0x8f912a3b4c5d..."
  }
}`;

  const gettingStartedSteps = [
    {
      step: 1,
      icon: <UserPlus className="w-5 h-5 text-indigo-600" />,
      title: "Create a Merchant Account",
      description: 'Sign up on Recover using Google, Email, Apple or Facebook. During profile setup, select "Logistics & Delivery Merchant" as your account type. This unlocks the shipment tracking workspace and API access.',
      action: "Sign Up as Merchant →",
      actionHref: "/",
    },
    {
      step: 2,
      icon: <KeyRound className="w-5 h-5 text-amber-600" />,
      title: "Generate Your Secret API Key",
      description: "Open your Settings page and scroll to the Developer REST API section. Click \"Generate API Key\" to create a secret key in the format rec_live_.... Copy this key securely — it authenticates all your server-to-server API calls.",
      action: "Go to Settings →",
      actionHref: "/settings",
    },
    {
      step: 3,
      icon: <Package className="w-5 h-5 text-emerald-600" />,
      title: "Register Your First Dispatch",
      description: "Call POST /api/v1/shipments/create with your API key in the Authorization header. The response returns a unique packageId, consumer trackingCode, RCVR-prefixed handover secret (innerSecret), and shipment record.",
      action: "See Code Example ↓",
      actionHref: "#endpoints",
    },
    {
      step: 4,
      icon: <QrCode className="w-5 h-5 text-indigo-600" />,
      title: "Print & Affix API-Generated QR Sticker",
      description: "Every shipment creation call automatically returns ready-to-print `qrImageUrl` and `scanUrl` links, plus a dedicated `GET /api/v1/shipments/[id]/qr` endpoint for SVG/PNG label printing onto boxes or poly-mailers.",
    },
    {
      step: 5,
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: "Complete Delivery with PIN Handover",
      description: "At delivery, the recipient provides their secret scratch-off PIN. The recipient or rider enters it on the scan page (or your backend calls POST /api/v1/shipments/[id]/verify). On match, the package status updates to Verified and your webhook fires.",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-mist flex flex-col justify-between">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8 space-y-12">
          
          {/* Hero Banner Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] sm:text-xs text-primary shadow-2xs hover:border-indigo-500/40 transition-all select-none backdrop-blur-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="font-bold tracking-tight text-primary">Developer API</span>
              <span className="text-neutral-slate/40 font-light">·</span>
              <span className="font-medium text-neutral-slate">REST API &amp; Webhooks</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-primary font-display sm:text-5xl">
              Integrate Recover Package Tracking
            </h1>

            <p className="text-sm sm:text-base text-neutral-slate leading-relaxed">
              Programmatically create tamper-proof dispatches, generate dual-layer QR stickers, verify PIN handovers, and stream real-time logistics webhooks directly into your ERP or e-commerce store.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <a
                href="#getting-started"
                className="bg-primary hover:bg-primary-light text-white text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                Getting Started Guide <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#endpoints"
                className="bg-neutral-white border border-neutral-mist text-primary text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                API Reference
              </a>
              <Link
                href="/pricing"
                className="bg-neutral-white border border-neutral-mist text-primary text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-xs"
              >
                View Quota Tiers
              </Link>
            </div>
          </div>

          {/* Getting Started: Step-by-Step Guide */}
          <div id="getting-started" className="space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display">
                Getting Started: From Sign-Up to First Dispatch
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Follow these 5 steps to go from zero to a fully automated package tracking integration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gettingStartedSteps.map((s) => (
                <div
                  key={s.step}
                  className={`bg-neutral-white border border-neutral-mist rounded-2xl p-5 shadow-xs space-y-3 relative ${
                    s.step <= 3 ? "" : "md:col-span-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-white font-extrabold text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-xs">
                      {s.step}
                    </span>
                    {s.icon}
                    <h3 className="text-sm font-bold text-primary">{s.title}</h3>
                  </div>

                  <p className="text-xs text-neutral-slate leading-relaxed">
                    {s.description}
                  </p>

                  {s.action && s.actionHref && (
                    <Link
                      href={s.actionHref}
                      className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {s.action}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Authentication Guide */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" /> Authentication
            </h2>

            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
              All authenticated endpoints require your secret API key. You can pass it in one of two ways:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-2">
                <span className="font-bold text-primary block">Option 1: Authorization Header (Recommended)</span>
                <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-1 rounded block text-[11px]">
                  Authorization: Bearer rec_live_8f921a4b901e23f...
                </code>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-2">
                <span className="font-bold text-primary block">Option 2: Custom Header</span>
                <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-1 rounded block text-[11px]">
                  x-api-key: rec_live_8f921a4b901e23f...
                </code>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
              <strong>🔒 Security:</strong> Never expose your API key in client-side browser code. Only use it in server-to-server calls from your backend (Node.js, Python, PHP, etc.). If your key is compromised, roll it immediately from <Link href="/settings" className="font-bold underline">Settings</Link>.
            </div>
          </div>

          {/* Interactive REST API Console / Playground */}
          <div id="sandbox-playground" className="bg-neutral-white border-2 border-indigo-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-mist pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
                  🧪 Sandbox Testing Console
                </div>
                <h2 className="text-xl font-bold text-primary font-display flex items-center gap-2">
                  Interactive REST API Playground
                </h2>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Test making live requests with your API key (`rec_test_...` or `rec_live_...`) directly in your browser.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/settings"
                  className="bg-neutral-mist hover:bg-neutral-mist/80 border border-gray-300 text-primary text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Manage API Keys in Settings →
                </Link>
              </div>
            </div>

            {/* API Key Input Field */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
              <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span>Enter Your API Key (Authorization Bearer Header):</span>
                {apiTestKey ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Auto-filled from active session
                  </span>
                ) : (
                  <Link href="/settings" className="text-[10px] font-bold text-indigo-600 underline">
                    Generate Key in Settings →
                  </Link>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiTestKey}
                  onChange={(e) => setApiTestKey(e.target.value)}
                  placeholder="Paste your secret API key (rec_test_...)"
                  className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono text-primary focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              {apiTestKey.trim().startsWith("rec_live_") ? (
                <p className="text-[11px] text-rose-800 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                  ⚠️ <strong>Live Key Rejected:</strong> Live API keys (`rec_live_...`) are rejected in the test console. Only test sandbox keys (`rec_test_...`) may be used.
                </p>
              ) : apiTestKey.includes("•") ? (
                <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ <strong>Notice:</strong> Masked strings (containing ••••) cannot authenticate API calls. Please paste the full secret key you saved from <Link href="/settings" className="underline font-bold">Settings</Link> or generate a new key.
                </p>
              ) : (
                <p className="text-[11px] text-indigo-700">
                  💡 Tip: Use a Test Sandbox Key (`rec_test_...`) to simulate requests safely without consuming live shipment quota or broadcasting to mainnet.
                </p>
              )}
            </div>

            {/* Endpoint Selector Tabs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-primary block">Select Endpoint to Test:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEndpointSelect("create")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "create"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">POST</span>
                  <span>/shipments/create</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("list")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "list"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">GET</span>
                  <span>/shipments</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("edit_patch")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "edit_patch"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">PATCH</span>
                  <span>/shipments/[id]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("verify_get")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "verify_get"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">GET</span>
                  <span>/shipments/[id]/verify</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("handover_post")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "handover_post"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">POST</span>
                  <span>/shipments/[id]/handover</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("shipment_qr")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "shipment_qr"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">GET</span>
                  <span>/shipments/[id]/qr</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("verify_post")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "verify_post"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">POST</span>
                  <span>/shipments/[id]/verify</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("history_get")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "history_get"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">GET</span>
                  <span>/shipments/[id]/history</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEndpointSelect("dispute_post")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "dispute_post"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">POST</span>
                  <span>/shipments/[id]/dispute</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEndpointSelect("health_get")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedConsoleEndpoint === "health_get"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-neutral-mist/60 border border-neutral-mist text-neutral-slate hover:text-primary"
                  }`}
                >
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">GET</span>
                  <span>/health</span>
                </button>
              </div>
            </div>

            {/* Request Configuration Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                {/* ID param input if endpoint has [id] */}
                {(selectedConsoleEndpoint === "edit_patch" || selectedConsoleEndpoint === "verify_get" || selectedConsoleEndpoint === "handover_post" || selectedConsoleEndpoint === "verify_post" || selectedConsoleEndpoint === "history_get" || selectedConsoleEndpoint === "dispute_post" || selectedConsoleEndpoint === "shipment_qr") && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary block">
                      {selectedConsoleEndpoint === "verify_post"
                        ? "Scratch-Off Code / Inner Secret:"
                        : "Package Tracking Code:"}
                    </label>
                    <input
                      type="text"
                      value={reqParamId}
                      onChange={(e) => handleReqParamIdInputChange(e.target.value)}
                      placeholder={
                        selectedConsoleEndpoint === "verify_post"
                          ? "RCVR-59DBE11D"
                          : "RCV-4A91B2C3E8F0"
                      }
                      className="w-full bg-neutral-white border border-neutral-mist rounded-lg px-3 py-1.5 text-xs font-mono text-primary"
                    />
                  </div>
                )}

                {/* Request Body JSON textarea */}
                {selectedConsoleEndpoint !== "list" && selectedConsoleEndpoint !== "verify_get" && selectedConsoleEndpoint !== "history_get" && selectedConsoleEndpoint !== "health_get" && selectedConsoleEndpoint !== "shipment_qr" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary block">Request JSON Body:</label>
                    <textarea
                      rows={7}
                      value={reqBodyText}
                      onChange={(e) => setReqBodyText(e.target.value)}
                      className="w-full bg-slate-950 text-emerald-400 font-mono p-3 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={executeApiTestRequest}
                  disabled={isExecutingTest}
                  className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExecutingTest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      <span>Execute API Request</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Response Panel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary block">API Response Output:</span>
                  {testRespStatus !== null && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        testRespStatus >= 200 && testRespStatus < 300
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                      }`}>
                        HTTP {testRespStatus}
                      </span>
                      {testRespTime !== null && (
                        <span className="text-[10px] font-mono text-neutral-slate">
                          ⏱️ {testRespTime} ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto min-h-55 max-h-90">
                  {isExecutingTest ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                      <span>Executing request...</span>
                    </div>
                  ) : testRespData !== null ? (
                    <div className="space-y-4">
                      {testRespStatus !== null && testRespStatus >= 200 && testRespStatus < 300 && !((testRespData as Record<string, unknown>)?.error) && ((testRespData as Record<string, unknown>)?.qrImageUrl || selectedConsoleEndpoint === "shipment_qr") && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={
                              ((testRespData as Record<string, unknown>)?.qrImageUrl as string) ||
                              `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=10&data=${encodeURIComponent(`https://userecover.xyz/shipments/${reqParamId}/verify`)}`
                            }
                            alt="Generated Package QR Code"
                            className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-700 shadow-sm"
                          />
                          <div className="space-y-1 text-center sm:text-left">
                            <span className="text-xs font-bold text-white block items-center justify-center sm:justify-start gap-1">
                              <QrCode className="w-3.5 h-3.5 text-indigo-400" /> API-Generated Package QR Sticker
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Scan URL: <code className="text-emerald-400 font-mono font-normal">{((testRespData as Record<string, unknown>)?.scanUrl as string) || `https://userecover.xyz/shipments/${reqParamId}/verify`}</code>
                            </p>
                            <a
                              href={((testRespData as Record<string, unknown>)?.qrImageUrl as string) || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(`https://userecover.xyz/shipments/${reqParamId}/verify`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-[11px] text-indigo-400 font-bold hover:underline pt-0.5"
                            >
                              Download PNG Label Image →
                            </a>
                          </div>
                        </div>
                      )}
                      <pre className="text-emerald-300 whitespace-pre-wrap">
                        {JSON.stringify(testRespData, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-16 text-xs">
                      Click &quot;Execute API Request&quot; above to test this endpoint live and inspect response output.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Language Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-white border border-neutral-mist rounded-2xl p-4 shadow-xs gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Code className="w-4 h-4 text-accent" /> API Request Code Examples:
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-neutral-mist/60 border border-neutral-mist rounded-xl">
              <button
                type="button"
                onClick={() => setActiveLang("curl")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "curl" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("javascript")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "javascript" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                JavaScript (Node)
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("python")}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLang === "python" ? "bg-primary text-white shadow-xs" : "text-neutral-slate hover:text-primary"
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {/* Endpoints Reference Section */}
          <div id="endpoints" className="space-y-8">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display flex items-center gap-2">
                <Server className="w-6 h-6 text-indigo-600" /> REST API Endpoint Reference
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Base URL: <code className="bg-slate-900 text-emerald-400 font-mono px-2 py-0.5 rounded text-xs">https://userecover.xyz/api/v1</code>
              </p>
            </div>

            {/* Endpoint 1: Create Shipment */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/create</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Registers a new commercial shipment, reserves your monthly quota, writes a tamper-proof record to the Electroneum blockchain, and returns a unique packageId, trackingCode, RCVR-prefixed handover secret (innerSecret), and shipment object.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.createShipment[activeLang], "create")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "create" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.createShipment[activeLang]}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-neutral-mist/30 p-3.5 rounded-xl border border-neutral-mist space-y-1">
                  <span className="font-bold text-primary block">Request Body Parameters:</span>
                  <ul className="space-y-1 text-neutral-slate font-mono">
                    <li>• <strong className="text-primary">packageName</strong> (string, required): Reference title</li>
                    <li>• <strong className="text-primary">receiverName</strong> (string, optional): Recipient full name</li>
                    <li>• <strong className="text-primary">receiverPhone</strong> (string, optional): Recipient phone number</li>
                    <li>• <strong className="text-primary">destination</strong> (string, optional): Destination city / area</li>
                    <li>• <strong className="text-primary">weight</strong> (string, optional): Weight in kg</li>
                    <li>• <strong className="text-primary">metadata</strong> (object, optional): Custom key-value data</li>
                    <li>• <strong className="text-primary">webhookUrl</strong> (string, optional): Per-shipment callback URL</li>
                  </ul>
                </div>
                <div className="bg-neutral-mist/30 p-3.5 rounded-xl border border-neutral-mist space-y-1">
                  <span className="font-bold text-primary block">200 OK Response:</span>
                  <ul className="space-y-1 text-neutral-slate font-mono">
                    <li>• <strong className="text-emerald-600">success</strong>: true</li>
                    <li>• <strong className="text-emerald-600">packageId</strong>: &quot;0x4a91b2...&quot; (internal package ID)</li>
                    <li>• <strong className="text-emerald-600">trackingCode</strong>: &quot;RCV-4A91B2C3E8F0&quot; (consumer-facing tracking code)</li>
                    <li>• <strong className="text-emerald-600">scanUrl</strong>: &quot;https://userecover.xyz/shipments/RCV-4A91B2C3E8F0/verify&quot;</li>
                    <li>• <strong className="text-emerald-600">qrImageUrl</strong>: &quot;https://api.qrserver.com/v1/create-qr-code/...&quot; (ready-to-print PNG link)</li>
                    <li>• <strong className="text-emerald-600">qrApiUrl</strong>: &quot;https://userecover.xyz/api/v1/shipments/RCV-4A91B2C3E8F0/qr&quot; (dedicated SVG/PNG QR endpoint)</li>
                    <li>• <strong className="text-emerald-600">innerSecret</strong>: &quot;RCVR-A8F2B1C0&quot; (8-character RCVR-prefixed hex handover secret)</li>
                    <li>• <strong className="text-emerald-600">shipment</strong>: Full Shipment Object (status: &quot;Created&quot;, metadata, events)</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Endpoint 2: List Shipments */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Returns all shipments belonging to your merchant account, sorted by most recent first. Useful for syncing your order management system or building custom dashboards.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.listShipments[activeLang], "list")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "list" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.listShipments[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 3: Verify Shipment Scan */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/verify</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Public · No Auth Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Public endpoint for QR scan verification. Returns package weight, carrier info, current status (InTransit, Delivered, Disputed), and chain-of-custody timeline. This is the same endpoint called when anyone scans a physical QR sticker.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.verifyShipment[activeLang], "verify")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "verify" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.verifyShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 4: Log Custody Handover */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/handover</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Transfers package custody to a courier, rider, or warehouse handler. Updates status to &quot;InTransit&quot;, logs an on-chain event, and fires a <code className="bg-neutral-mist px-1 rounded">package.handover</code> webhook callback.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.handoverShipment[activeLang], "handover")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "handover" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.handoverShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 5: Verify PIN & Confirm Delivery */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/verify</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  PIN Verification
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Verifies the 8-character Secret Handover PIN at physical delivery. On a match, status updates to &quot;Verified&quot; and a <code className="bg-neutral-mist px-1 rounded">package.delivered</code> webhook callback fires with company details.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.confirmDelivery[activeLang], "confirmDelivery")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "confirmDelivery" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.confirmDelivery[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 6: Fetch Custody History Timeline */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/history</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Public Timeline
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Fetches the complete custody event timeline (Created, InTransit, Handover, Verified, Disputed) for a package. Passing an authorized courier PIN unlocks rider contact details.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.historyShipment[activeLang], "history")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "history" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.historyShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 7: Log Delivery Dispute */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    POST
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/dispute</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Files a formal delivery dispute for damaged, stolen, or missing contents. <strong>Requires the package to be in &quot;InTransit&quot; status</strong> (i.e. handed over to a courier). Updates package status to &quot;Disputed&quot;, records an on-chain event, and triggers a <code className="bg-neutral-mist px-1 rounded">shipment.disputed</code> webhook.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.disputeShipment[activeLang], "dispute")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "dispute" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.disputeShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 8: Edit Package Details */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-amber-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    PATCH
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]</code>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  🔑 API Key Required
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Updates package metadata (name, receiver name, receiver phone, destination, weight) and webhook URL. Only the package creator can edit details. Cannot modify packages in &quot;Verified&quot; or &quot;Disputed&quot; status. <code className="bg-neutral-mist px-1 rounded">receiverPhone</code> cannot be set to empty.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.editShipment[activeLang], "edit")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "edit" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.editShipment[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 8: API Health Status Check */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/shipments/[id]/qr</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Public QR Generator
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Generates a QR code image or returns JSON metadata containing direct scan links, ready-to-print PNG/SVG URLs, and caption text for any registered package or item. Supports query parameters <code className="bg-neutral-mist px-1 rounded">?format=json|png|svg</code> and <code className="bg-neutral-mist px-1 rounded">?size=300</code>.
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.getQrCode[activeLang], "getQrCode")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "getQrCode" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.getQrCode[activeLang]}</pre>
              </div>
            </div>

            {/* Endpoint 9: API Health Status Check */}
            <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-mist pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase">
                    GET
                  </span>
                  <code className="text-sm font-mono font-bold text-primary">/health</code>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Public Health Check
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                Returns the real-time operational status of the REST API, MongoDB connection, Electroneum mainnet chain configuration, backend relayer configuration status, and system response latency (in ms).
              </p>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                <button
                  type="button"
                  onClick={() => copyToClipboard(codeExamples.healthCheck[activeLang], "health")}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedSnippet === "health" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <pre>{codeExamples.healthCheck[activeLang]}</pre>
              </div>
            </div>

          </div>

          {/* HTTP Status Codes Reference */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display">HTTP Status Codes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-emerald-600 block">200</span>
                <span className="text-neutral-slate font-semibold">Success</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-emerald-600 block">201</span>
                <span className="text-neutral-slate font-semibold">Created</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">401</span>
                <span className="text-neutral-slate font-semibold">Invalid API Key</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-amber-600 block">402</span>
                <span className="text-neutral-slate font-semibold">Quota Exhausted</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">403</span>
                <span className="text-neutral-slate font-semibold">Not a Merchant</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-neutral-slate block">404</span>
                <span className="text-neutral-slate font-semibold">Package Not Found</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">400</span>
                <span className="text-neutral-slate font-semibold">Bad Request</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-amber-600 block">409</span>
                <span className="text-neutral-slate font-semibold">State Conflict</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-amber-600 block">429</span>
                <span className="text-neutral-slate font-semibold">Rate Limited</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-red-600 block">500</span>
                <span className="text-neutral-slate font-semibold">Server Error</span>
              </div>
            </div>
          </div>

          {/* Webhooks Integration Section */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
            <div className="border-b border-neutral-mist pb-4">
              <h2 className="text-2xl font-bold text-primary font-display flex items-center gap-2">
                <Globe className="w-6 h-6 text-accent" /> Real-Time Webhook Subscriptions
              </h2>
              <p className="text-xs text-neutral-slate mt-1">
                Receive instant HTTP POST callbacks when dispatches are created, scanned, delivered, or disputed.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3 text-xs sm:text-sm text-neutral-slate">
                <h4 className="font-bold text-primary text-base">Supported Event Types:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 bg-neutral-mist/30 p-2.5 rounded-lg border border-neutral-mist">
                    <span className="font-mono font-bold text-emerald-600">package.delivered</span>
                    <span className="text-xs text-neutral-slate">— Triggered on successful PIN verification & delivery</span>
                  </li>
                  <li className="flex items-center gap-2 bg-neutral-mist/30 p-2.5 rounded-lg border border-neutral-mist">
                    <span className="font-mono font-bold text-red-600">shipment.disputed</span>
                    <span className="text-xs text-neutral-slate">— Triggered when a delivery dispute is logged</span>
                  </li>
                </ul>
                <p className="pt-2 text-xs leading-relaxed">
                  Configure your target webhook URL in your <Link href="/settings" className="font-bold text-accent underline">Settings Page</Link> or pass a per-shipment <code className="bg-neutral-mist px-1 rounded">webhookUrl</code> in the create request body.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-primary block">Example Webhook JSON Body:</span>
                <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookPayloadExample, "webhook")}
                    className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSnippet === "webhook" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre>{webhookPayloadExample}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limits & Quota */}
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-primary font-display">Rate Limits &amp; Quota</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Free Bootstrap</span>
                <span className="text-2xl font-extrabold text-primary block">100</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Starter</span>
                <span className="text-2xl font-extrabold text-primary block">10,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Growth</span>
                <span className="text-2xl font-extrabold text-primary block">100,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
              <div className="bg-neutral-mist/30 border border-neutral-mist rounded-xl p-4 space-y-1">
                <span className="font-bold text-primary block">Pro Scale</span>
                <span className="text-2xl font-extrabold text-primary block">500,000</span>
                <span className="text-neutral-slate">dispatches / month</span>
              </div>
            </div>

            <p className="text-xs text-neutral-slate">
              When your monthly quota is exhausted on the Free tier, the API returns <code className="bg-neutral-mist px-1 rounded">402 Payment Required</code>. Pro tiers automatically apply metered overage auto-billing ($0.02–$0.01/package). <Link href="/pricing" className="font-bold text-accent underline">View all tier details →</Link>
            </p>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
