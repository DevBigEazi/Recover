"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, Truck, BarChart3, ShieldCheck } from "lucide-react";

export type WorkspaceTab = "receipts" | "pos" | "shipments";

interface ReceiptsNavProps {
  activeTab?: WorkspaceTab;
  onTabChange?: (tab: WorkspaceTab) => void;
}

export default function ReceiptsNav({ activeTab = "receipts", onTabChange }: ReceiptsNavProps) {
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ElementType }> = [
    { id: "receipts", label: "Digital Receipts & Sales", icon: BarChart3 },
    { id: "pos", label: "POS Terminal", icon: PlusCircle },
    { id: "shipments", label: "Package Shipments", icon: Truck },
  ];

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/80 rounded-xl border border-slate-800/80 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (onTabChange) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={`/workspace?tab=${tab.id}`}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Network Status Badge */}
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-900/50 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tamperproof Register Active</span>
        </span>
      </div>
    </div>
  );
}
