import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

interface Params { params: Promise<{ branchId: string }> }

// PATCH /api/branches/[branchId] — rename or reassign manager (owner only)
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }
  if (auth.actor.role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can modify branches." }, { status: 403 });
  }

  const { branchId } = await params;
  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const branch = await db.branch.findOne({ _id: branchId, merchantAddress });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  }

  const body = (await req.json()) as { name?: string; managedBy?: string | null };
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Branch name cannot be empty." }, { status: 400 });
    // Ensure no duplicate name
    const conflict = await db.branch.findOne({
      merchantAddress,
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: branchId },
    });
    if (conflict) {
      return NextResponse.json({ error: `A branch named "${name}" already exists.` }, { status: 409 });
    }
    updates.name = name;

    // Sync branchName on all team members in this branch
    await db.teamMember.updateMany({ merchantAddress, branchId }, { $set: { branchName: name } });
  }

  if (body.managedBy !== undefined) {
    const managedBy = body.managedBy ? String(body.managedBy).toLowerCase() : null;
    if (managedBy) {
      // Validate the assigned manager is an active manager in this branch
      const managerMember = await db.teamMember.findOne({
        merchantAddress,
        branchId,
        memberAddress: managedBy,
        role: "manager",
        status: "active",
      });
      if (!managerMember) {
        return NextResponse.json(
          { error: "The specified manager is not an active Manager in this branch." },
          { status: 400 }
        );
      }
    }
    updates.managedBy = managedBy;
  }

  const updated = await db.branch.findByIdAndUpdate(branchId, { $set: updates }, { new: true });
  return NextResponse.json({ branch: updated });
}

// DELETE /api/branches/[branchId] — delete branch if it has no active members (owner only)
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }
  if (auth.actor.role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can delete branches." }, { status: 403 });
  }

  const { branchId } = await params;
  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const branch = await db.branch.findOne({ _id: branchId, merchantAddress });
  if (!branch) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  if (branch.isDefault) {
    return NextResponse.json({ error: "The default branch cannot be deleted." }, { status: 400 });
  }

  const activeMembers = await db.teamMember.countDocuments({
    merchantAddress,
    branchId,
    status: "active",
  });
  if (activeMembers > 0) {
    return NextResponse.json(
      { error: "Remove or reassign all members before deleting this branch." },
      { status: 409 }
    );
  }

  await db.branch.findByIdAndDelete(branchId);
  return NextResponse.json({ success: true });
}
