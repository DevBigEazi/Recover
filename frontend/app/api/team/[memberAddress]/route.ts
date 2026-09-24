import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { canRemoveMember } from "@/lib/permissions";
import { sendTeamInviteEmail, sendPinResetEmail } from "@/lib/zeptomail";

interface Params {
  params: Promise<{ memberAddress: string }>;
}

// PATCH /api/team/[memberAddress] — update memberName, memberEmail, role, branch, status, or reset PIN
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }

  const { memberAddress } = await params;
  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const param = (memberAddress || "").toLowerCase();
  const target = await db.teamMember.findOne({
    merchantAddress,
    $or: [
      { _id: memberAddress },
      { memberEmail: param },
      { memberAddress: param },
    ],
  });
  if (!target) return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  // Sales reps cannot update team members
  if (auth.actor.role === "sales_rep") {
    return NextResponse.json({ error: "Sales reps cannot edit team members." }, { status: 403 });
  }

  // Managers can only edit sales reps in their own branch, and cannot edit themselves
  if (auth.actor.role === "manager") {
    const isSelf =
      String(target._id) === String(auth.actor.address) ||
      (target.memberAddress && target.memberAddress.toLowerCase() === auth.actor.address.toLowerCase());

    if (isSelf) {
      return NextResponse.json(
        { error: "Managers cannot edit their own staff profile in team management." },
        { status: 403 }
      );
    }

    if (target.role !== "sales_rep" || target.branchId !== auth.actor.branchId) {
      return NextResponse.json(
        { error: "Managers can only update sales reps within their own branch." },
        { status: 403 }
      );
    }
  }

  const body = (await req.json()) as {
    memberName?: string;
    memberEmail?: string;
    branchId?: string | null;
    status?: "active" | "suspended";
    role?: "manager" | "sales_rep";
    resetPin?: boolean;
  };
  const updates: Record<string, unknown> = {};

  // Only owner can change roles
  if (body.role !== undefined) {
    if (auth.actor.role !== "owner") {
      return NextResponse.json({ error: "Only the account owner can change member roles." }, { status: 403 });
    }
    if (!["manager", "sales_rep"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    updates.role = body.role;
  }

  if (body.memberName !== undefined) {
    const name = body.memberName.trim();
    if (!name) return NextResponse.json({ error: "Member name cannot be empty." }, { status: 400 });
    updates.memberName = name;
  }

  let emailChanged = false;
  if (body.memberEmail !== undefined) {
    const newEmail = body.memberEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (newEmail !== target.memberEmail.toLowerCase()) {
      const existing = await db.teamMember.findOne({
        merchantAddress,
        memberEmail: newEmail,
        _id: { $ne: target._id },
      });
      if (existing) {
        return NextResponse.json({ error: "Another team member already has this email address." }, { status: 409 });
      }
      updates.memberEmail = newEmail;
      emailChanged = true;
    }
  }

  if (body.branchId !== undefined) {
    if (auth.actor.role === "manager" && body.branchId !== auth.actor.branchId) {
      return NextResponse.json({ error: "Managers cannot reassign members to another branch." }, { status: 403 });
    }
    if (body.branchId) {
      const branch = await db.branch.findOne({ _id: body.branchId, merchantAddress });
      if (!branch) {
        return NextResponse.json({ error: "Specified branch not found." }, { status: 404 });
      }
      updates.branchId = body.branchId;
      updates.branchName = branch.name;
    } else {
      updates.branchId = null;
      updates.branchName = null;
    }
  }

  if (body.status !== undefined) {
    if (!canRemoveMember(auth.actor, target.role, target.branchId)) {
      return NextResponse.json(
        { error: "You do not have permission to suspend/reinstate this member." },
        { status: 403 }
      );
    }
    if (!["active", "suspended"].includes(body.status)) {
      return NextResponse.json({ error: "Status must be 'active' or 'suspended'." }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "suspended") {
      updates.suspendedAt = new Date();
      updates.suspendedBy = auth.actor.address;
    } else {
      updates.suspendedAt = null;
      updates.suspendedBy = null;
    }
  }

  // If email changed or resetPin was explicitly requested, generate a fresh PIN
  let generatedPin: string | null = null;
  if (emailChanged || body.resetPin === true) {
    generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    updates.pinHash = await bcryptjs.hash(generatedPin, 10);
  }

  const updated = await db.teamMember.findByIdAndUpdate(
    target._id,
    { $set: updates },
    { new: true }
  );

  // Dispatch ZeptoMail if new PIN was generated
  if (generatedPin && updated) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://userecover.xyz";
    const merchantName = auth.shipper.companyName ?? auth.shipper.fullName ?? "the merchant";
    const recipientEmail = updated.memberEmail;
    const recipientName = updated.memberName;
    const isFirstInvite = target.acceptedAt === null;

    try {
      if (isFirstInvite) {
        await sendTeamInviteEmail({
          to: recipientEmail,
          toName: recipientName,
          merchantName,
          role: updated.role,
          branchName: updated.branchName,
          pin: generatedPin,
          loginUrl: `${appUrl}/workspace/login`,
        });
      } else {
        await sendPinResetEmail({
          to: recipientEmail,
          toName: recipientName,
          merchantName,
          newPin: generatedPin,
          loginUrl: `${appUrl}/workspace/login`,
        });
      }
    } catch (err: unknown) {
      console.error("[ZeptoMail] Failed to send PIN email on member update:", err);
    }
  }

  return NextResponse.json({ member: updated, pinReset: Boolean(generatedPin) });
}

// DELETE /api/team/[memberAddress] — remove a team member
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }

  const { memberAddress } = await params;
  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const param = (memberAddress || "").toLowerCase();
  const target = await db.teamMember.findOne({
    merchantAddress,
    $or: [
      { _id: memberAddress },
      { memberEmail: param },
      { memberAddress: param },
    ],
  });
  if (!target) return NextResponse.json({ error: "Team member not found." }, { status: 404 });

  if (!canRemoveMember(auth.actor, target.role, target.branchId)) {
    return NextResponse.json(
      { error: "You do not have permission to remove this team member." },
      { status: 403 }
    );
  }

  await db.teamMember.findByIdAndDelete(target._id);
  return NextResponse.json({ success: true });
}
