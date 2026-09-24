import { IReceipt, IShipment } from "@/lib/db";

// ─── Permission types ──────────────────────────────────────────────────────────

export type ActorRole = "owner" | "manager" | "sales_rep";
export type Role = ActorRole;

export interface Actor {
  address: string;
  name: string;
  role: ActorRole;
  branchId: string | null;
  branchName: string | null;
}

export type Permission =
  | "issue_receipt"
  | "issue_credit_receipt"
  | "void_own_receipt"        // own receipts only — reason mandatory for ALL roles
  | "edit_own_receipt"
  | "edit_branch_receipt"
  | "edit_any_receipt"
  | "sell_credit"
  | "settle_credit"
  | "view_analytics_branch"
  | "export_daily_report"
  | "export_any_report"
  | "create_shipment"
  | "update_own_shipment"     // only the shipment creator may update — regardless of role
  | "invite_sales_rep"
  | "remove_own_branch_sales_rep"
  | "invite_manager"
  | "remove_manager"
  | "manage_branches"
  | "manage_billing"
  | "manage_api_keys"
  | "export_private_key";

// ─── Role → Permission map ─────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<ActorRole, Permission[]> = {
  owner: [
    "issue_receipt",
    "issue_credit_receipt",
    "void_own_receipt",
    "edit_own_receipt",
    "edit_branch_receipt",
    "edit_any_receipt",
    "sell_credit",
    "settle_credit",
    "view_analytics_branch",
    "export_daily_report",
    "export_any_report",
    "create_shipment",
    "update_own_shipment",
    "invite_sales_rep",
    "remove_own_branch_sales_rep",
    "invite_manager",
    "remove_manager",
    "manage_branches",
    "manage_billing",
    "manage_api_keys",
    "export_private_key",
  ],
  manager: [
    "issue_receipt",
    "issue_credit_receipt",
    "void_own_receipt",
    "edit_own_receipt",
    "edit_branch_receipt",
    "sell_credit",
    "settle_credit",
    "view_analytics_branch",
    "export_daily_report",
    "export_any_report",
    "create_shipment",
    "update_own_shipment",
    "invite_sales_rep",
    "remove_own_branch_sales_rep",
  ],
  sales_rep: [
    "issue_receipt",
    "void_own_receipt",
    "edit_own_receipt",
    "view_analytics_branch",
    "export_daily_report",
    "create_shipment",
    "update_own_shipment",
  ],
};

// ─── Simple permission check ───────────────────────────────────────────────────

export function hasPermission(role: ActorRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ─── Context-aware checks ──────────────────────────────────────────────────────

/**
 * VOID RULE: Every role — including Owner — can only void receipts they issued.
 * voidReason is mandatory at the API layer; this function only checks ownership.
 */
export function canVoidReceipt(actor: Actor, receipt: IReceipt): boolean {
  return receipt.issuedBy?.address === actor.address;
}

/**
 * EDIT/RE-ISSUE RULE:
 * - Owner  → any receipt
 * - Manager → receipts issued within their own branch
 * - Sales Rep → only receipts they personally issued
 */
export function canEditReceipt(actor: Actor, receipt: IReceipt): boolean {
  if (actor.role === "owner") return true;
  if (actor.role === "manager" && receipt.issuedBy?.branchName === actor.branchName) return true;
  if (actor.role === "sales_rep" && receipt.issuedBy?.address === actor.address) return true;
  return false;
}

/**
 * SHIPMENT UPDATE RULE: Only the person who created the shipment may update it —
 * regardless of role, including Owner.
 */
export function canUpdateShipment(actor: Actor, shipment: IShipment): boolean {
  return shipment.createdBy?.address === actor.address;
}

/**
 * TEAM MANAGEMENT RULE:
 * - Owner can invite/remove both Managers and Sales Reps (any branch)
 * - Manager can invite/remove Sales Reps in their own branch only
 */
export function canInviteMember(
  actor: Actor,
  targetRole: "manager" | "sales_rep"
): boolean {
  if (actor.role === "owner") return true;
  if (actor.role === "manager" && targetRole === "sales_rep") return true;
  return false;
}

export function canRemoveMember(
  actor: Actor,
  targetRoleOrObj: ActorRole | { role: ActorRole; branchId?: string | null; address?: string },
  targetBranchId?: string | null
): boolean {
  const role = typeof targetRoleOrObj === "string" ? targetRoleOrObj : targetRoleOrObj.role;
  if (role === "owner") return false;
  if (actor.role === "owner") return true;
  const branchId = typeof targetRoleOrObj === "string" ? (targetBranchId ?? null) : (targetRoleOrObj.branchId ?? null);
  if (
    actor.role === "manager" &&
    role === "sales_rep" &&
    branchId === actor.branchId
  ) {
    return true;
  }
  return false;
}

/**
 * EXPORT REPORT RULE:
 * - Sales Rep → daily reports only (date range must be today)
 * - Manager + Owner → any period
 */
export function canExportPeriod(
  actor: Actor,
  periodType: "daily" | "weekly" | "monthly" | "yearly"
): boolean {
  if (actor.role === "sales_rep") return periodType === "daily";
  return true;
}

/**
 * ANALYTICS SCOPE: Returns a MongoDB filter fragment to scope analytics queries.
 * - Owner → no extra filter (sees all branches)
 * - Manager + Sales Rep → filtered to their branch
 */
export function analyticsFilter(actor: Actor): Record<string, string> {
  if (actor.role === "owner") return {};
  return { "issuedBy.branchName": actor.branchName ?? "" };
}
