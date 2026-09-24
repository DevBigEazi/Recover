"use client";

import { useState } from "react";
import { useTeam, Branch } from "@/context/TeamContext";
import { Store, Plus, Trash2, MapPin, Phone, User, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from "@/components/Team/ConfirmationModal";

export function BranchesPanel() {
  const { branches, isLoadingBranches, createBranch, deleteBranch, can } = useTeam();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const canManageBranches = can("manage_branches");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a branch name");
      return;
    }

    try {
      setIsSubmitting(true);
      await createBranch({
        name: name.trim(),
        location: location.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName("");
      setLocation("");
      setPhone("");
      setIsAdding(false);
    } catch {
      // handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (b: Branch) => {
    if (b.activeMemberCount && b.activeMemberCount > 0) {
      toast.error(`Cannot delete branch with ${b.activeMemberCount} assigned team members. Reassign members first.`);
      return;
    }
    setBranchToDelete(b);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setIsDeletingBranch(true);
      await deleteBranch(branchToDelete._id);
      setBranchToDelete(null);
    } finally {
      setIsDeletingBranch(false);
    }
  };

  if (isLoadingBranches) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-500 text-xs">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading branches...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h4 className="text-sm font-semibold text-white">Store Branches</h4>
          <p className="text-xs text-slate-400">
            Organize sales terminals, team members, and receipts by store location
          </p>
        </div>
        {canManageBranches && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Branch
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-150"
        >
          <div className="text-xs font-semibold text-white">New Store Branch</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              required
              placeholder="Branch Name (e.g. Lagos Island)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Location / Address (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Branch
            </button>
          </div>
        </form>
      )}

      {branches.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
          No branches created yet. All sales are tracked globally under Headquarters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map((b) => (
            <div
              key={b._id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-semibold text-white">{b.name}</span>
                  </div>
                  {canManageBranches && (
                    <button
                      onClick={() => handleDelete(b)}
                      title="Delete branch"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-slate-400 text-[11px]">
                  {b.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span className="truncate">{b.location}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.managerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>Manager: {b.managerName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                <span>Staff assigned</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono">
                  {b.activeMemberCount || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal: Delete Branch */}
      <ConfirmationModal
        isOpen={Boolean(branchToDelete)}
        onClose={() => setBranchToDelete(null)}
        onConfirm={confirmDeleteBranch}
        variant="danger"
        title="Delete Store Branch"
        confirmText="Delete Branch"
        isLoading={isDeletingBranch}
        icon={<Trash2 className="w-5 h-5 text-rose-400" />}
        description={
          branchToDelete ? (
            <>
              Are you sure you want to delete the{" "}
              <strong className="text-white">{branchToDelete.name}</strong> branch?
              <div className="mt-2 text-slate-400 text-[11px]">
                This action cannot be undone. Historical receipts and sales issued under this branch will remain preserved under your merchant account.
              </div>
            </>
          ) : null
        }
      />
    </div>
  );
}
export default BranchesPanel;
