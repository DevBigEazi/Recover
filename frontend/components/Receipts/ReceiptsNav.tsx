"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, Truck, BarChart3, Users, ShieldCheck } from "lucide-react";
import { useTeam } from "@/context/TeamContext";
import { useProfile } from "@/context/ProfileContext";

export type WorkspaceTab = "receipts" | "pos" | "shipments" | "team";

interface ReceiptsNavProps {
  activeTab?: WorkspaceTab;
  onTabChange?: (tab: WorkspaceTab) => void;
}

export default function ReceiptsNav({ activeTab = "receipts", onTabChange }: ReceiptsNavProps) {
  const { currentRole, isStaffMode } = useTeam();
  const { role } = useProfile();
  const canManageTeam = isStaffMode ? currentRole === "manager" : role === "merchant";

  const tabs: Array<{ id: WorkspaceTab; label: string; shortLabel: string; icon: React.ElementType }> = [
    { id: "receipts", label: "Digital Receipts & Sales", shortLabel: "Receipts", icon: BarChart3 },
    { id: "pos", label: "POS Terminal", shortLabel: "POS", icon: PlusCircle },
    { id: "shipments", label: "Package Shipments", shortLabel: "Shipments", icon: Truck },
  ];

  if (canManageTeam) {
    tabs.push({ id: "team", label: "Team & Staff", shortLabel: "Team", icon: Users });
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/80 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none touch-pan-x w-full sm:w-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (onTabChange) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 min-h-10 sm:min-h-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="inline sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={`/workspace?tab=${tab.id}`}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 min-h-10 sm:min-h-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.shortLabel}</span>
            </Link>
          );
        })}
      </div>

      {/* Network Status Badge */}
      <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-900/50 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tamperproof Register Active</span>
        </span>
      </div>
    </div>
  );
}
