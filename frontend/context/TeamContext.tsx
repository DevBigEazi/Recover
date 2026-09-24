"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";
import { Role, Permission, hasPermission } from "@/lib/permissions";
import { useProfile } from "@/context/ProfileContext";
import toast from "react-hot-toast";

export interface Branch {
  _id: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  managerAddress?: string | null;
  managerName?: string | null;
  activeMemberCount?: number;
  createdAt: string;
}

export interface TeamMemberItem {
  _id: string;
  memberEmail?: string;
  memberAddress?: string | null;
  email?: string;
  address?: string | null;
  name: string;
  memberName?: string;
  role: Role;
  branchId?: string | null;
  branchName?: string | null;
  status: "active" | "pending" | "suspended";
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface WorkspaceSessionInfo {
  memberId: string;
  merchantAddress: string;
  merchantName?: string;
  businessLogo?: string | null;
  role: "manager" | "sales_rep";
  branchId: string;
  branchName: string;
  memberName: string;
  memberEmail: string;
}

interface TeamContextType {
  branches: Branch[];
  teamMembers: TeamMemberItem[];
  isLoadingBranches: boolean;
  isLoadingTeam: boolean;
  currentRole: Role;
  actorBranchId: string | null;
  actorBranchName: string | null;
  isStaffMode: boolean;
  workspaceSession?: WorkspaceSessionInfo;
  can: (permission: Permission) => boolean;
  // Branch actions
  createBranch: (data: { name: string; location?: string; phone?: string }) => Promise<void>;
  updateBranch: (branchId: string, data: { name?: string; location?: string; phone?: string; managerAddress?: string; managerName?: string }) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  // Member actions
  inviteMember: (data: { email: string; name: string; role: Role; branchId?: string }) => Promise<void>;
  updateMember: (
    memberAddress: string,
    data: {
      name?: string;
      email?: string;
      role?: Role;
      branchId?: string;
      status?: "active" | "suspended";
      resetPin?: boolean;
    }
  ) => Promise<void>;
  removeMember: (memberAddress: string) => Promise<void>;
  resetMemberPin: (memberId: string, newEmail?: string) => Promise<void>;
  refetchTeam: () => void;
  refetchBranches: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const account = useActiveAccount();
  const queryClient = useQueryClient();

  const walletAddress = account?.address?.toLowerCase() || null;

  // Query workspace session for staff (cookie-based HTTP-only session + fallback token)
  const { data: workspaceData } = useQuery<{ session?: WorkspaceSessionInfo }>({
    queryKey: ["workspace-session"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("workspace_token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/workspace/me", { credentials: "include", headers });
      if (!res.ok) {
        if (res.status === 401 && typeof window !== "undefined") {
          localStorage.removeItem("workspace_token");
        }
        return { session: undefined };
      }
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const { role: profileRole } = useProfile();
  const workspaceSession = workspaceData?.session;
  const isStaffMode = Boolean(workspaceSession);
  const isMerchantOwner = !isStaffMode && Boolean(walletAddress) && profileRole === "merchant";
  const currentRole: Role = workspaceSession?.role
    ? workspaceSession.role
    : isMerchantOwner
    ? "owner"
    : "sales_rep";
  const actorBranchId = workspaceSession?.branchId || null;
  const actorBranchName = workspaceSession?.branchName || null;

  // Effective merchant address for API calls: either staff member's merchant or verified merchant owner wallet
  const effectiveMerchantAddress = workspaceSession?.merchantAddress || (isMerchantOwner ? walletAddress : null);

  const getAuthHeaders = useCallback((extra: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extra };
    if (effectiveMerchantAddress) {
      headers["x-owner-address"] = effectiveMerchantAddress;
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("workspace_token");
      if (token) {
        headers["x-workspace-token"] = token;
      }
    }
    return headers;
  }, [effectiveMerchantAddress]);

  // Helper permission checker for the current user
  const can = useCallback((permission: Permission) => {
    return hasPermission(currentRole, permission);
  }, [currentRole]);

  // Query branches
  const {
    data: branchesData,
    isLoading: isLoadingBranches,
    refetch: refetchBranches,
  } = useQuery<{ success: boolean; branches: Branch[] }>({
    queryKey: ["branches", effectiveMerchantAddress],
    queryFn: async () => {
      if (!effectiveMerchantAddress) return { success: true, branches: [] };
      const headers = getAuthHeaders();
      const res = await fetch("/api/branches", { headers, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load branches");
      return res.json();
    },
    enabled: !!effectiveMerchantAddress,
    staleTime: 30000,
  });

  // Query team members
  const {
    data: teamData,
    isLoading: isLoadingTeam,
    refetch: refetchTeam,
  } = useQuery<{ success: boolean; members: TeamMemberItem[] }>({
    queryKey: ["team-members", effectiveMerchantAddress],
    queryFn: async () => {
      if (!effectiveMerchantAddress) return { success: true, members: [] };
      const headers = getAuthHeaders();
      const res = await fetch("/api/team", { headers, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load team members");
      return res.json();
    },
    enabled: !!effectiveMerchantAddress,
    staleTime: 30000,
  });

  const branches = branchesData?.branches || [];
  const teamMembers: TeamMemberItem[] = (teamData?.members || []).map((m) => ({
    ...m,
    address: m.memberAddress ?? m.address ?? null,
    email: m.memberEmail ?? m.email ?? "",
    name: m.memberName ?? m.name ?? "",
  }));

  // Branch mutations
  const createBranchMutation = useMutation({
    mutationFn: async (data: { name: string; location?: string; phone?: string }) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": effectiveMerchantAddress,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create branch");
      return result;
    },
    onSuccess: () => {
      toast.success("Branch created successfully");
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: Record<string, unknown> }) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": effectiveMerchantAddress,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update branch");
      return result;
    },
    onSuccess: () => {
      toast.success("Branch updated");
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
      queryClient.invalidateQueries({ queryKey: ["team-members", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
        headers: { "x-owner-address": effectiveMerchantAddress },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete branch");
      return result;
    },
    onSuccess: () => {
      toast.success("Branch deleted");
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Member mutations
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; role: Role; branchId?: string }) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch("/api/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": effectiveMerchantAddress,
        },
        body: JSON.stringify({
          memberEmail: data.email,
          memberName: data.name,
          role: data.role,
          branchId: data.branchId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to invite member");
      return result;
    },
    onSuccess: () => {
      toast.success("Team member invite and login PIN sent via email.");
      queryClient.invalidateQueries({ queryKey: ["team-members", effectiveMerchantAddress] });
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      memberAddress,
      data,
    }: {
      memberAddress: string;
      data: {
        name?: string;
        email?: string;
        role?: Role;
        branchId?: string;
        status?: "active" | "suspended";
        resetPin?: boolean;
      };
    }) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch(`/api/team/${encodeURIComponent(memberAddress)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": effectiveMerchantAddress,
        },
        body: JSON.stringify({
          memberName: data.name,
          memberEmail: data.email,
          role: data.role,
          branchId: data.branchId,
          status: data.status,
          resetPin: data.resetPin,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update member");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", effectiveMerchantAddress] });
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberAddress: string) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch(`/api/team/${encodeURIComponent(memberAddress)}`, {
        method: "DELETE",
        headers: { "x-owner-address": effectiveMerchantAddress },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to remove member");
      return result;
    },
    onSuccess: () => {
      toast.success("Member removed from team");
      queryClient.invalidateQueries({ queryKey: ["team-members", effectiveMerchantAddress] });
      queryClient.invalidateQueries({ queryKey: ["branches", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const resetMemberPinMutation = useMutation({
    mutationFn: async ({ memberId, newEmail }: { memberId: string; newEmail?: string }) => {
      if (!effectiveMerchantAddress) throw new Error("Merchant authentication required");
      const res = await fetch("/api/team/invite/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-address": effectiveMerchantAddress,
        },
        body: JSON.stringify({ memberId, newEmail }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reset member PIN");
      return result;
    },
    onSuccess: (data) => {
      toast.success(
        data.email
          ? `A new 6-digit PIN has been emailed to ${data.email}.`
          : "A new 6-digit PIN was generated and sent to staff email."
      );
      queryClient.invalidateQueries({ queryKey: ["team-members", effectiveMerchantAddress] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <TeamContext.Provider
      value={{
        branches,
        teamMembers,
        isLoadingBranches,
        isLoadingTeam,
        currentRole,
        actorBranchId,
        actorBranchName,
        isStaffMode,
        workspaceSession,
        can,
        createBranch: async (data) => {
          await createBranchMutation.mutateAsync(data);
        },
        updateBranch: async (branchId, data) => {
          await updateBranchMutation.mutateAsync({ branchId, data });
        },
        deleteBranch: async (branchId) => {
          await deleteBranchMutation.mutateAsync(branchId);
        },
        inviteMember: async (data) => {
          await inviteMemberMutation.mutateAsync(data);
        },
        updateMember: async (memberAddress, data) => {
          await updateMemberMutation.mutateAsync({ memberAddress, data });
        },
        removeMember: async (memberAddress) => {
          await removeMemberMutation.mutateAsync(memberAddress);
        },
        resetMemberPin: async (memberId: string, newEmail?: string) => {
          await resetMemberPinMutation.mutateAsync({ memberId, newEmail });
        },
        refetchTeam: () => {
          refetchTeam();
        },
        refetchBranches: () => {
          refetchBranches();
        },
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
