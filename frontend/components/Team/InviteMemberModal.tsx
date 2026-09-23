"use client";

import { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { Role } from "@/lib/permissions";
import { X, UserPlus, Loader2, Store, Shield } from "lucide-react";
import toast from "react-hot-toast";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const { branches, inviteMember, currentRole, actorBranchId } = useTeam();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(currentRole === "manager" ? "sales_rep" : "sales_rep");
  const [branchId, setBranchId] = useState<string>(
    currentRole === "manager" && actorBranchId ? actorBranchId : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isManager = currentRole === "manager";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!cleanName) {
      toast.error("Please provide the team member's full name");
      return;
    }

    // Role check
    const selectedRole: Role = isManager ? "sales_rep" : role;
    const selectedBranchId = isManager && actorBranchId ? actorBranchId : branchId || undefined;

    try {
      setIsSubmitting(true);
      await inviteMember({
        email: cleanEmail,
        name: cleanName,
        role: selectedRole,
        branchId: selectedBranchId,
      });
      onClose();
      setEmail("");
      setName("");
    } catch {
      // toast is already fired in mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 text-white shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Invite Team Member</h3>
            <p className="text-xs text-slate-400">
              {isManager
                ? "Add a Sales Representative to your branch"
                : "Grant staff or manager access to your merchant workspace"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Staff Member Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Samuel Okafor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Staff Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. samuel@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              A secure 6-digit access PIN will be generated and emailed directly to this address.
            </p>
          </div>

          {/* Role selection - Locked to Sales Rep if Manager */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Access Role <span className="text-rose-400">*</span>
            </label>
            {isManager ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Sales Representative (Branch Managers can only invite Sales Reps)</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("sales_rep")}
                  className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                    role === "sales_rep"
                      ? "bg-blue-600/10 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <p className="font-semibold text-white">Sales Rep</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Issues receipts & dispatches</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                    role === "manager"
                      ? "bg-blue-600/10 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <p className="font-semibold text-white">Manager</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Branch supervisor & credit control</p>
                </button>
              </div>
            )}
          </div>

          {/* Branch Assignment */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Assigned Branch
            </label>
            {isManager ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <Store className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Assigned to your branch automatically</span>
              </div>
            ) : (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 transition-colors"
              >
                <option value="">No specific branch (All / Headquarters)</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b.location ? `(${b.location})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default InviteMemberModal;
