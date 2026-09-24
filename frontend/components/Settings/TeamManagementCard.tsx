"use client";

import { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { Users, UserPlus, Store } from "lucide-react";
import TeamMembersTable from "@/components/Team/TeamMembersTable";
import BranchesPanel from "@/components/Team/BranchesPanel";
import InviteMemberModal from "@/components/Team/InviteMemberModal";

export default function TeamManagementCard() {
  const { currentRole, can } = useTeam();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "branches">("members");

  const canInvite = can("invite_manager") || can("invite_sales_rep");
  const canManageBranches = can("manage_branches");

  // Don't render for basic Sales Reps with zero management rights
  if (currentRole === "sales_rep") {
    return null;
  }

  return (
    <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-mist">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary font-display">
              Team & Branch Management
            </h2>
            <p className="text-xs text-neutral-slate">
              Manage staff permissions, cashier roles, and retail branch locations
            </p>
          </div>
        </div>

        {canInvite && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-neutral-white transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 pt-6 pb-4">
        <button
          onClick={() => setActiveTab("members")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "members"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Members</span>
        </button>
        {canManageBranches && (
          <button
            onClick={() => setActiveTab("branches")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "branches"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Branches</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "members" ? (
          <TeamMembersTable />
        ) : (
          <BranchesPanel />
        )}
      </div>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
