import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { SignJWT } from "jose";
import { connectDB, db } from "@/lib/db";

const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.WORKSPACE_JWT_SECRET;
  if (!secret) throw new Error("WORKSPACE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * POST /api/workspace/login
 * Staff authenticate with their email + 6-digit PIN.
 * On success a workspace_session JWT cookie is set (12 h, HttpOnly, SameSite=Strict).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();

  const body = (await req.json()) as { email?: string; pin?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const pin = (body.pin ?? "").trim();

  if (!email || !pin) {
    return NextResponse.json({ error: "Email and PIN are required." }, { status: 400 });
  }

  // Generic error — never reveal which field was wrong
  const authError = NextResponse.json({ error: "Invalid email or PIN." }, { status: 401 });

  const member = await db.teamMember
    .findOne({ memberEmail: email, status: "active" })
    .lean();

  if (!member || !member.pinHash) return authError;

  const pinValid = await bcryptjs.compare(pin, member.pinHash);
  if (!pinValid) return authError;

  const merchant = await db.user
    .findOne({
      $or: [
        { _id: member.merchantAddress.toLowerCase() },
        { address: member.merchantAddress.toLowerCase() },
      ],
    })
    .lean();

  const merchantName =
    merchant?.companyName || merchant?.fullName || "Business";

  // Sign workspace session JWT (keep payload lean to prevent HTTP 431 header overflow)
  const token = await new SignJWT({
    memberId: String(member._id),
    merchantAddress: String(member.merchantAddress),
    merchantName,
    role: member.role,
    branchId: member.branchId ? String(member.branchId) : "",
    branchName: member.branchName ? String(member.branchName) : "",
    memberName: member.memberName,
    memberEmail: member.memberEmail,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());

  // Mark accepted on first login
  if (!member.acceptedAt) {
    await db.teamMember.updateOne({ _id: member._id }, { $set: { acceptedAt: new Date() } });
  }

  const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  try {
    const cookieStore = await cookies();
    cookieStore.set("workspace_session", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  } catch (cookieErr) {
    console.warn("Could not set cookie via next/headers:", cookieErr);
  }

  const res = NextResponse.json({
    ok: true,
    token,
    role: member.role,
    branchId: member.branchId,
    memberName: member.memberName,
    merchantName,
  });

  res.cookies.set("workspace_session", token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return res;
}
