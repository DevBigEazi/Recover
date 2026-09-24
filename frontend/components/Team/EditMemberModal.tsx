"use client";

import { useState, useEffect } from "react";
import { useTeam, TeamMemberItem } from "@/context/TeamContext";
import { Role } from "@/lib/permissions";
import { X, Edit2, Loader2, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberItem | null;
}

export function EditMemberModal({ isOpen, onClose, member }: EditMemberModalProps) {
  const { branches, updateMember, currentRole } = useTeam();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("sales_rep");
  const [branchId, setBranchId] = useState<string>("");
  const [resetPin, setResetPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name || member.memberName || "");
      setEmail(member.email || member.memberEmail || "");
      setRole(member.role || "sales_rep");
      setBranchId(member.branchId || "");
      setResetPin(false);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const isOwner = currentRole === "owner";
  const initialEmail = (member.email || member.memberEmail || "").toLowerCase();

  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    // If the email was modified from the initial email, automatically check reset PIN
    if (newVal.trim().toLowerCase() !== initialEmail) {
      setResetPin(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!cleanName) {
      toast.error("Please provide the team member's full name.");
      return;
    }

    const emailChanged = cleanEmail !== initialEmail;
    const shouldResetPin = resetPin || emailChanged;

    const targetKey = member._id || member.email || member.address || "";

    try {
      setIsSubmitting(true);
      await updateMember(targetKey, {
        name: cleanName,
        email: cleanEmail,
        role: isOwner ? role : member.role,
        branchId: isOwner ? (branchId || undefined) : (member.branchId || undefined),
        resetPin: shouldResetPin,
      });

      if (shouldResetPin) {
        toast.success(`Member updated. A new 6-digit PIN has been emailed to ${cleanEmail}.`);
      } else {
        toast.success("Member profile updated.");
      }
      onClose();
    } catch {
      // Error handling is handled in mutation
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
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Edit Team Member</h3>
            <p className="text-xs text-slate-400">
              Update staff details, assign retail branch, or update email address
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Staff Email Address <span className="text-rose-400">*</span>
              </label>
              {email.trim().toLowerCase() !== initialEmail && (
                <span className="text-[11px] text-blue-400 font-medium">Email updated</span>
              )}
            </div>
            <input
              type="email"
              required
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If staff lost access to their old email, enter their new email here. A fresh login PIN will be sent to this inbox.
            </p>
          </div>

          {/* Role selection — Owner only */}
          {isOwner && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("sales_rep")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "sales_rep"
                      ? "bg-blue-950/60 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold">Sales Rep</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">POS & Receipts</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "manager"
                      ? "bg-blue-950/60 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold">Manager</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Branch management</div>
                </button>
              </div>
            </div>
          )}

          {/* Branch assignment — Owner only (Managers belong to their assigned branch) */}
          {isOwner && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Assigned Retail Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-hidden focus:border-blue-500 transition-colors"
              >
                <option value="">All Branches (Unrestricted)</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b.location ? `— ${b.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset PIN checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={resetPin || email.trim().toLowerCase() !== initialEmail}
                onChange={(e) => setResetPin(e.target.checked)}
                disabled={email.trim().toLowerCase() !== initialEmail}
                className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-xs font-medium text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  Generate and email new 6-digit PIN
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {email.trim().toLowerCase() !== initialEmail
                    ? "Required because the staff email address was changed."
                    : "Check this if the staff member forgot or lost their current PIN."}
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMemberModal;
