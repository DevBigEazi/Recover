"use client";

import { useState } from "react";
import { useTeam, TeamMemberItem } from "@/context/TeamContext";
import { Trash2, UserCheck, Shield, Store, Loader2, KeyRound, Pencil } from "lucide-react";
import { canRemoveMember } from "@/lib/permissions";
import { useActiveAccount } from "thirdweb/react";
import EditMemberModal from "@/components/Team/EditMemberModal";
import ConfirmationModal from "@/components/Team/ConfirmationModal";

export function TeamMembersTable() {
  const { teamMembers, isLoadingTeam, removeMember, resetMemberPin, currentRole, actorBranchId, workspaceSession } = useTeam();
  const account = useActiveAccount();
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberItem | null>(null);
  const [memberToResetPin, setMemberToResetPin] = useState<TeamMemberItem | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const actor = {
    address: account?.address?.toLowerCase() || "",
    name: "User",
    role: currentRole,
    branchId: actorBranchId,
    branchName: null,
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;
    const targetKey = memberToRemove._id || memberToRemove.email || memberToRemove.address || "";
    try {
      setIsConfirmLoading(true);
      await removeMember(targetKey);
      setMemberToRemove(null);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const confirmResetPin = async () => {
    if (!memberToResetPin || !memberToResetPin._id) return;
    try {
      setIsConfirmLoading(true);
      await resetMemberPin(memberToResetPin._id);
      setMemberToResetPin(null);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  if (isLoadingTeam) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading team members...
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-8 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
        <Shield className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="font-medium text-slate-300">No team members added yet</p>
        <p className="mt-1 text-slate-500">
          Invite branch managers and sales representatives by email to collaborate on POS receipts and dispatches.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        {teamMembers.map((m) => {
          const memberKey = m._id || m.email || m.address || Math.random().toString();
          const isSelf = Boolean(
            (m.address &&
              account?.address &&
              m.address.toLowerCase() === account.address.toLowerCase()) ||
            (workspaceSession && (
              (m._id && m._id === workspaceSession.memberId) ||
              (m.email && workspaceSession.memberEmail && m.email.toLowerCase() === workspaceSession.memberEmail.toLowerCase()) ||
              (m.memberEmail && workspaceSession.memberEmail && m.memberEmail.toLowerCase() === workspaceSession.memberEmail.toLowerCase())
            ))
          );
          const allowedToRemove =
            !isSelf &&
            canRemoveMember(actor, {
              address: m.address || "",
              role: m.role,
              branchId: m.branchId,
            });

          const allowedToManage =
            !isSelf &&
            (currentRole === "owner" ||
              (currentRole === "manager" &&
                m.role === "sales_rep" &&
                m.branchId === actorBranchId));

          const displayEmail = m.email || m.memberEmail || "";

          return (
            <div
              key={`mobile-${memberKey}`}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-xs"
            >
              {/* Member Name, You Badge & Role */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    {isSelf && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        You
                      </span>
                    )}
                  </div>
                  {displayEmail && (
                    <div className="text-xs text-slate-400 mt-0.5">{displayEmail}</div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      m.role === "manager"
                        ? "bg-purple-950/60 text-purple-300 border-purple-800/50"
                        : "bg-blue-950/60 text-blue-300 border-blue-800/50"
                    }`}
                  >
                    {m.role === "manager" ? "Manager" : "Sales Rep"}
                  </span>

                  {m.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <UserCheck className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                      <Shield className="w-3 h-3" />
                      Suspended
                    </span>
                  )}
                </div>
              </div>

              {/* Branch info */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Branch: <strong className="text-slate-200 font-medium">{m.branchName || "All Branches"}</strong></span>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                {isSelf ? (
                  <span className="text-xs text-slate-500 italic">Your active session</span>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-end">
                    {allowedToManage && m._id && (
                      <button
                        type="button"
                        onClick={() => setMemberToResetPin(m)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-blue-300 border border-slate-700/60 transition-colors cursor-pointer min-h-10"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset PIN</span>
                      </button>
                    )}

                    {allowedToManage && (
                      <button
                        type="button"
                        onClick={() => setEditingMember(m)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-colors cursor-pointer min-h-10"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {allowedToRemove && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(m)}
                        className="p-2 rounded-lg text-rose-400 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/50 transition-colors cursor-pointer min-h-10 min-w-10 flex items-center justify-center"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {teamMembers.map((m) => {
              const memberKey = m._id || m.email || m.address || Math.random().toString();
              const isSelf = Boolean(
                (m.address &&
                  account?.address &&
                  m.address.toLowerCase() === account.address.toLowerCase()) ||
                (workspaceSession && (
                  (m._id && m._id === workspaceSession.memberId) ||
                  (m.email && workspaceSession.memberEmail && m.email.toLowerCase() === workspaceSession.memberEmail.toLowerCase()) ||
                  (m.memberEmail && workspaceSession.memberEmail && m.memberEmail.toLowerCase() === workspaceSession.memberEmail.toLowerCase())
                ))
              );
              const allowedToRemove =
                !isSelf &&
                canRemoveMember(actor, {
                  address: m.address || "",
                  role: m.role,
                  branchId: m.branchId,
                });

              // Managers can only edit Sales Reps in their own branch, and CANNOT edit themselves
              const allowedToManage =
                !isSelf &&
                (currentRole === "owner" ||
                  (currentRole === "manager" &&
                    m.role === "sales_rep" &&
                    m.branchId === actorBranchId));

              const displayEmail = m.email || m.memberEmail || "";

              return (
                <tr key={memberKey} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-white">{m.name}</span>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                          You
                        </span>
                      )}
                    </div>
                    {displayEmail && (
                      <div className="text-[11px] text-slate-400">{displayEmail}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        m.role === "manager"
                          ? "bg-purple-950/60 text-purple-300 border-purple-800/50"
                          : "bg-blue-950/60 text-blue-300 border-blue-800/50"
                      }`}
                    >
                      {m.role === "manager" ? "Manager" : "Sales Rep"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Store className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.branchName || "All Branches"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {m.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <UserCheck className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                        <Shield className="w-3.5 h-3.5" />
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {/* Reset PIN button */}
                      {allowedToManage && m._id && (
                        <button
                          onClick={() => setMemberToResetPin(m)}
                          title="Generate & email new PIN"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit member / email button */}
                      {allowedToManage && (
                        <button
                          onClick={() => setEditingMember(m)}
                          title="Edit member details / email"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove member button */}
                      {allowedToRemove && (
                        <button
                          onClick={() => setMemberToRemove(m)}
                          title="Remove team member"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {isSelf && (
                        <span className="text-[11px] text-slate-500 italic pr-2">Your profile</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        member={editingMember}
      />

      {/* Confirmation Modal: Remove Member */}
      <ConfirmationModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemove}
        variant="danger"
        title="Remove Team Member"
        confirmText="Remove Member"
        isLoading={isConfirmLoading}
        icon={<Trash2 className="w-5 h-5 text-rose-400" />}
        description={
          memberToRemove ? (
            <>
              Are you sure you want to remove{" "}
              <strong className="text-white">{memberToRemove.name}</strong> (
              {memberToRemove.email || memberToRemove.memberEmail || "staff member"}) from the workspace?
              <div className="mt-2 text-slate-400 text-[11px]">
                Historical transaction logs, issued receipts, and custody tracking records created by this member will remain safely preserved in the ledger.
              </div>
            </>
          ) : null
        }
      />

      {/* Confirmation Modal: Reset Staff PIN */}
      <ConfirmationModal
        isOpen={Boolean(memberToResetPin)}
        onClose={() => setMemberToResetPin(null)}
        onConfirm={confirmResetPin}
        variant="primary"
        title="Reset Staff Access PIN"
        confirmText="Generate & Send PIN"
        isLoading={isConfirmLoading}
        icon={<KeyRound className="w-5 h-5 text-blue-400" />}
        description={
          memberToResetPin ? (
            <>
              Generate a new 6-digit access PIN for{" "}
              <strong className="text-white">{memberToResetPin.name}</strong>?
              <div className="mt-2 text-slate-400 text-[11px]">
                A fresh 6-digit login PIN will be automatically generated and emailed to{" "}
                <span className="text-blue-400 font-medium">
                  {memberToResetPin.email || memberToResetPin.memberEmail}
                </span>. Their previous PIN will be invalidated immediately.
              </div>
            </>
          ) : null
        }
      />
    </>
  );
}

export default TeamMembersTable;
