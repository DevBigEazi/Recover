"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header/Header";
import SalesAnalyticsCards from "@/components/Receipts/SalesAnalyticsCards";
import ReceiptsTable from "@/components/Receipts/ReceiptsTable";
import POSScreen from "@/components/Receipts/POSScreen";
import ShipmentsPanel from "@/components/Shipments/ShipmentsPanel";
import Link from "next/link";
import { PlusCircle, Receipt, Users, UserPlus, Store, Loader2, User, Building2 } from "lucide-react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { useProfile } from "@/context/ProfileContext";
import TeamMembersTable from "@/components/Team/TeamMembersTable";
import BranchesPanel from "@/components/Team/BranchesPanel";
import InviteMemberModal from "@/components/Team/InviteMemberModal";
import toast from "react-hot-toast";

export type WorkspaceTab = "receipts" | "pos" | "shipments" | "team";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { account } = useAuthReady();
  const { openLogin } = useAuth();
  const { isStaffMode, can, actorBranchId, actorBranchName, workspaceSession } = useTeam();
  const { activeMode, switchMode, hasPersonalProfile, hasMerchantProfile, isProfileLoaded, refetchProfile } = useProfile();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamSubTab, setTeamSubTab] = useState<"members" | "branches">("members");
  const hasVerifiedSubRef = React.useRef(false);

  // Handle Stripe checkout return verification when onboarding redirects to /workspace
  useEffect(() => {
    if (typeof window === "undefined" || hasVerifiedSubRef.current) return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id") || urlParams.get("reference");
    if (sessionId) {
      hasVerifiedSubRef.current = true;
      const verifySub = async () => {
        try {
          toast.loading("Activating merchant workspace...");
          const res = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, walletAddress: account?.address }),
          });
          toast.dismiss();
          if (res.ok) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("recover_onboarding_draft");
              localStorage.setItem("recover_subscription_confirmed", Date.now().toString());
            }
            toast.success("Merchant workspace activated!");
            refetchProfile();
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
  }, [refetchProfile, account?.address]);

  // If wallet owner enters workspace with a configured merchant profile, ensure activeMode is merchant
  useEffect(() => {
    if (account && !isStaffMode && hasMerchantProfile && activeMode !== "merchant") {
      switchMode("merchant");
    }
  }, [account, isStaffMode, hasMerchantProfile, activeMode, switchMode]);

  const isMerchantOwner = Boolean(account && !isStaffMode);
  const hasWorkspaceAccess = Boolean(isStaffMode || account);

  const branchId = workspaceSession?.branchId || actorBranchId || null;
  const branchName = workspaceSession?.branchName || actorBranchName || "Branch";
  const hasBranchAssigned = Boolean(branchId);

  const tabParam = searchParams.get("tab") as WorkspaceTab | null;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    tabParam === "pos" || tabParam === "shipments" || tabParam === "team" ? tabParam : "receipts"
  );
  const [salesScope, setSalesScope] = useState<"all" | "branch" | "my">(
    isMerchantOwner ? "all" : hasBranchAssigned ? "branch" : "my"
  );

  useEffect(() => {
    if (isMerchantOwner) {
      setSalesScope("all");
    } else {
      setSalesScope(hasBranchAssigned ? "branch" : "my");
    }
  }, [isMerchantOwner, hasBranchAssigned]);

  useEffect(() => {
    if (tabParam && (tabParam === "receipts" || tabParam === "pos" || tabParam === "shipments" || tabParam === "team")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const handleCustomTab = (e: Event) => {
      const customEvent = e as CustomEvent<WorkspaceTab>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener("workspace-tab-change", handleCustomTab);
    return () => {
      window.removeEventListener("workspace-tab-change", handleCustomTab);
    };
  }, []);

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    router.replace(`/workspace?tab=${tab}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workspace-tab-change", { detail: tab }));
    }
  };

  const canInvite = can("invite_manager") || can("invite_sales_rep");
  const canManageBranches = can("manage_branches");

  // Show loading indicator if connected account profile is still resolving
  if (account && !isStaffMode && !isProfileLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs text-slate-400">Verifying credentials...</p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Access Gate: Unauthenticated vs Authorized */}
      {!hasWorkspaceAccess ? (
        <div className="p-10 sm:p-14 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-sm space-y-5 max-w-2xl mx-auto my-6 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Connect to Access Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Connect your account or sign in with your staff PIN to access your point-of-sale terminal, digital receipts ledger, shipments, and close-of-day analytics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={openLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Sign In / Connect
            </button>
            <Link
              href="/workspace/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 text-center"
            >
              Staff Member PIN Login
            </Link>
          </div>
        </div>
      ) : !isStaffMode && account && hasPersonalProfile && !hasMerchantProfile ? (
        /* Personal-Only User Activation Gate */
        <div className="p-8 sm:p-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-sm space-y-5 max-w-lg mx-auto my-6 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center mx-auto">
            <Store className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Activate Your Business Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Your account is currently active in Personal Mode. Set up your store name and select a merchant tier to unlock POS digital receipts, dispatches, and multi-branch team management.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/settings"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm text-center"
            >
              Set Up Business Profile
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700 text-center"
            >
              Return to Personal Vault
            </Link>
          </div>
        </div>
      ) : (
        <>
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

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Sales Scope Toggle: My Sales vs Branch Sales vs All Store Sales */}
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 shadow-xs gap-0.5">
                    <button
                      type="button"
                      onClick={() => setSalesScope("my")}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        salesScope === "my"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <User className="w-3 h-3 shrink-0" />
                      <span>My Sales</span>
                    </button>
                    {hasBranchAssigned && (
                      <button
                        type="button"
                        onClick={() => setSalesScope("branch")}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          salesScope === "branch"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span>{branchName} Sales</span>
                      </button>
                    )}
                    {isMerchantOwner && (
                      <button
                        type="button"
                        onClick={() => setSalesScope("all")}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          salesScope === "all"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Store className="w-3 h-3 shrink-0" />
                        <span>All Store Sales</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleTabChange("pos")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>New Sale</span>
                  </button>
                </div>
              </div>

              {/* Sales Analytics Overview & Report Downloads */}
              <SalesAnalyticsCards
                onNewSaleClick={() => handleTabChange("pos")}
                salesScope={salesScope}
                branchId={branchId}
                branchName={branchName}
              />

              {/* Receipts Audit Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">
                    Receipts Audit Ledger
                  </h2>
                  <span className="text-xs text-slate-400">
                    {salesScope === "my"
                      ? "Scoped to your personal sales"
                      : salesScope === "branch"
                      ? `Scoped to ${branchName} sales`
                      : "Showing all staff sales"}
                  </span>
                </div>
                <ReceiptsTable
                  onNewSaleClick={() => handleTabChange("pos")}
                  salesScope={salesScope}
                  branchId={branchId}
                />
              </div>
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

          {/* Tab Panel 4: Team & Branch Management */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-6 space-y-5">
                {/* Header with Title and Invite Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-950/80 text-blue-400 rounded-xl border border-blue-800/60">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        Team & Branch Management
                      </h2>
                      <p className="text-xs text-slate-400">
                        Manage staff permissions, cashier roles, and retail branch locations
                      </p>
                    </div>
                  </div>

                  {canInvite && (
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invite Team Member</span>
                    </button>
                  )}
                </div>

                {/* Sub-tabs: Staff Members & Branches */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTeamSubTab("members")}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      teamSubTab === "members"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Members</span>
                  </button>
                  {canManageBranches && (
                    <button
                      type="button"
                      onClick={() => setTeamSubTab("branches")}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        teamSubTab === "branches"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Branches</span>
                    </button>
                  )}
                </div>

                {/* Sub-tab Content */}
                <div className="pt-1">
                  {teamSubTab === "members" ? (
                    <TeamMembersTable />
                  ) : (
                    <BranchesPanel />
                  )}
                </div>
              </div>

              {/* Invite Member Modal */}
              {isInviteModalOpen && (
                <InviteMemberModal
                  isOpen={isInviteModalOpen}
                  onClose={() => setIsInviteModalOpen(false)}
                />
              )}
            </div>
          )}
        </>
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
