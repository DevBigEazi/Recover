import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { sendTeamInviteEmail, sendPinResetEmail } from "@/lib/zeptomail";

/**
 * POST /api/team/invite/resend
 * Owner or Manager resets a staff member's PIN and resends the invite/reset email.
 * Optionally updates email if staff lost access to their old email inbox.
 * Body: { memberId: string; newEmail?: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }
  if (auth.actor.role === "sales_rep") {
    return NextResponse.json({ error: "Only Owners and Managers can reset staff PINs." }, { status: 403 });
  }

  const body = (await req.json()) as { memberId?: string; newEmail?: string };
  const memberId = (body.memberId ?? "").trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }

  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const member = await db.teamMember.findOne({ _id: memberId, merchantAddress });
  if (!member) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  // Managers can only reset PINs for members in their own branch
  if (auth.actor.role === "manager" && member.branchId !== auth.actor.branchId) {
    return NextResponse.json(
      { error: "Managers can only reset PINs for members in their own branch." },
      { status: 403 }
    );
  }

  // If a new email was provided, validate and update
  if (body.newEmail) {
    const cleanEmail = body.newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (cleanEmail !== member.memberEmail.toLowerCase()) {
      const existing = await db.teamMember.findOne({
        merchantAddress,
        memberEmail: cleanEmail,
        _id: { $ne: member._id },
      });
      if (existing) {
        return NextResponse.json({ error: "Another team member is already registered with this email." }, { status: 409 });
      }
      member.memberEmail = cleanEmail;
    }
  }

  // Generate new PIN and hash it
  const newPin = Math.floor(100000 + Math.random() * 900000).toString();
  const pinHash = await bcryptjs.hash(newPin, 10);

  member.pinHash = pinHash;
  await member.save();

  // Send PIN reset email — fire-and-forget
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://userecover.xyz";
  const merchantName = auth.shipper.companyName ?? auth.shipper.fullName ?? "the merchant";
  const isFirstInvite = member.acceptedAt === null;

    try {
      if (isFirstInvite) {
        await sendTeamInviteEmail({
          to: member.memberEmail,
          toName: member.memberName,
          merchantName,
          role: member.role,
          branchName: member.branchName,
          pin: newPin,
          loginUrl: `${appUrl}/workspace/login`,
        });
      } else {
        await sendPinResetEmail({
          to: member.memberEmail,
          toName: member.memberName,
          merchantName,
          newPin,
          loginUrl: `${appUrl}/workspace/login`,
        });
      }
    } catch (err: unknown) {
      console.error("[ZeptoMail] Failed to send PIN reset email:", err);
    }

  return NextResponse.json({ ok: true, email: member.memberEmail });
}
