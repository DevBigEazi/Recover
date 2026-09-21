"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import ReceiptsNav, { WorkspaceTab } from "@/components/Receipts/ReceiptsNav";
import SalesAnalyticsCards from "@/components/Receipts/SalesAnalyticsCards";
import ReceiptsTable from "@/components/Receipts/ReceiptsTable";
import POSScreen from "@/components/Receipts/POSScreen";
import ShipmentsPanel from "@/components/Shipments/ShipmentsPanel";
import { PlusCircle, Receipt } from "lucide-react";
import { useAuthReady } from "@/hooks/useAuthReady";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { account } = useAuthReady();

  const tabParam = searchParams.get("tab") as WorkspaceTab | null;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    tabParam === "pos" || tabParam === "shipments" ? tabParam : "receipts"
  );

  useEffect(() => {
    if (tabParam && (tabParam === "receipts" || tabParam === "pos" || tabParam === "shipments")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    router.replace(`/workspace?tab=${tab}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Workspace Tab Switcher */}
      <ReceiptsNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Panel 1: Digital Receipts & Sales */}
      {activeTab === "receipts" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Digital Receipts & Sales
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Issue instant digital receipts, monitor daily close-of-day sales, and download reports for your business.
              </p>
            </div>

            <button
              onClick={() => handleTabChange("pos")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Sale</span>
            </button>
          </div>

          {!account ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Connect Merchant Account
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Please connect your account to view your store&apos;s digital receipts, close-of-day analytics, and report downloads.
              </p>
            </div>
          ) : (
            <>
              {/* Sales Analytics Overview & Report Downloads */}
              <SalesAnalyticsCards onNewSaleClick={() => handleTabChange("pos")} />

              {/* Receipts Audit Ledger */}
              <div className="space-y-3">
                <h2 className="text-base font-bold text-white">
                  Receipts Audit Ledger
                </h2>
                <ReceiptsTable onNewSaleClick={() => handleTabChange("pos")} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Panel 2: Point of Sale Terminal */}
      {activeTab === "pos" && (
        <div className="animate-fadeIn">
          <POSScreen />
        </div>
      )}

      {/* Tab Panel 3: Package Shipments & Custody */}
      {activeTab === "shipments" && (
        <div className="animate-fadeIn">
          <ShipmentsPanel />
        </div>
      )}
    </main>
  );
}

export default function MerchantWorkspacePage() {
  return (
    <div className="min-h-screen bg-[#0b111e]">
      {/* Top Application Header Navigation */}
      <Header />

      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-slate-400">
          Loading workspace...
        </div>
      }>
        <WorkspaceContent />
      </Suspense>
    </div>
  );
}
