import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";

// GET /api/team/me
// Called on every wallet connect to detect if the connected address is a team member.
// Returns membership details so the frontend can enter Staff Mode.
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const address = (req.headers.get("x-owner-address") ?? "").trim().toLowerCase();
  if (!address) {
    return NextResponse.json({ isMember: false });
  }

  const user = await db.user.findById(address).lean();
  const userEmail = user?.email?.trim().toLowerCase();

  // Find either by bound memberAddress, or by matching registered email
  const member = await db.teamMember
    .findOne({
      $or: [
        { memberAddress: address },
        ...(userEmail ? [{ memberEmail: userEmail }] : []),
      ],
    })
    .sort({ status: 1, createdAt: -1 })
    .lean();

  if (!member || member.status !== "active") {
    return NextResponse.json({ isMember: false });
  }

  const merchant = await db.user.findById(member.merchantAddress).lean();

  return NextResponse.json({
    isMember: true,
    isPending: false,
    inviteId: member._id,
    merchantAddress: member.merchantAddress,
    merchantName: merchant?.companyName || merchant?.fullName || null,
    businessLogo: merchant?.businessLogo || null,
    role: member.role,
    memberName: member.memberName,
    memberEmail: member.memberEmail,
    branchId: member.branchId,
    branchName: member.branchName,
    status: member.status,
  });
}
