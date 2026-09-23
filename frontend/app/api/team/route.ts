import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { canInviteMember } from "@/lib/permissions";
import { sendTeamInviteEmail } from "@/lib/zeptomail";

// GET /api/team — list team members
// Owner: all branches. Manager: own branch only.
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }
  if (auth.actor.role === "sales_rep") {
    return NextResponse.json({ error: "Sales Reps cannot manage team members." }, { status: 403 });
  }

  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const filter: Record<string, unknown> = { merchantAddress };
  if (auth.actor.role === "manager") {
    filter.branchId = auth.actor.branchId;
  }

  const members = await db.teamMember.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ members });
}

// POST /api/team — invite a new team member
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }

  const body = (await req.json()) as {
    memberEmail?: string;
    memberName?: string;
    role?: string;
    branchId?: string;
  };

  const memberEmail = (body.memberEmail ?? "").trim().toLowerCase();
  const memberName = (body.memberName ?? "").trim();
  const role = body.role as "manager" | "sales_rep" | undefined;
  const branchId = (body.branchId ?? "").trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!memberEmail || !emailRegex.test(memberEmail) || !memberName || !role || !branchId) {
    return NextResponse.json(
      { error: "A valid email address, member name, role, and branch are required." },
      { status: 400 }
    );
  }
  if (!["manager", "sales_rep"].includes(role)) {
    return NextResponse.json({ error: "Role must be 'manager' or 'sales_rep'." }, { status: 400 });
  }

  if (!canInviteMember(auth.actor, role)) {
    return NextResponse.json(
      { error: "You do not have permission to invite a member with this role." },
      { status: 403 }
    );
  }

  const merchantAddress = String(auth.shipper._id).toLowerCase();

  if (auth.actor.role === "manager" && branchId !== auth.actor.branchId) {
    return NextResponse.json(
      { error: "Managers can only invite members to their own branch." },
      { status: 403 }
    );
  }

  const branch = await db.branch.findOne({ _id: branchId, merchantAddress });
  if (!branch) return NextResponse.json({ error: "Branch not found." }, { status: 404 });

  if (auth.shipper.email && auth.shipper.email.trim().toLowerCase() === memberEmail) {
    return NextResponse.json({ error: "The account owner cannot be added as a team member." }, { status: 400 });
  }

  const existing = await db.teamMember.findOne({ merchantAddress, memberEmail });
  if (existing) {
    return NextResponse.json(
      { error: "A team member with this email address has already been invited or is active." },
      { status: 409 }
    );
  }

  const existingUser = await db.user.findOne({ email: memberEmail }).lean();
  const memberAddress = existingUser ? String(existingUser._id).toLowerCase() : null;

  // Generate a 6-digit numeric PIN and hash it — plaintext never stored
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const pinHash = await bcryptjs.hash(pin, 10);

  const member = await db.teamMember.create({
    _id: crypto.randomUUID(),
    merchantAddress,
    branchId,
    branchName: branch.name,
    memberEmail,
    memberAddress,
    memberName,
    role,
    status: "active", // active immediately — PIN delivered via email
    pinHash,
    invitedBy: auth.actor.address,
    invitedAt: new Date(),
    acceptedAt: null,
    suspendedAt: null,
    suspendedBy: null,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://userecover.xyz";
  const merchantName = auth.shipper.companyName ?? auth.shipper.fullName ?? "the merchant";
  try {
    await sendTeamInviteEmail({
      to: memberEmail,
      toName: memberName,
      merchantName,
      role,
      branchName: branch.name,
      pin,
      loginUrl: `${appUrl}/workspace/login`,
    });
  } catch (err: unknown) {
    console.error("[ZeptoMail] Failed to send team invite email:", err);
  }

  return NextResponse.json({ member }, { status: 201 });
}
