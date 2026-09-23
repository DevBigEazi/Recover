import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

// GET /api/branches — list all branches for the authenticated merchant
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }

  const merchantAddress = String(auth.shipper._id).toLowerCase();
  const branches = await db.branch.find({ merchantAddress }).sort({ createdAt: 1 }).lean();

  // Enrich each branch with member count
  const enriched = await Promise.all(
    branches.map(async (branch) => {
      const memberCount = await db.teamMember.countDocuments({
        merchantAddress,
        branchId: String(branch._id),
        status: { $ne: "suspended" },
      });
      return { ...branch, memberCount };
    })
  );

  return NextResponse.json({ branches: enriched });
}

// POST /api/branches — create a new branch (owner only)
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  const auth = await getMerchantFromAuth(req);
  if (!auth.shipper || auth.error) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: auth.status ?? 401 });
  }
  if (auth.actor.role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can create branches." }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Branch name is required." }, { status: 400 });
  }

  const merchantAddress = String(auth.shipper._id).toLowerCase();

  // Prevent duplicate branch names under the same merchant
  const existing = await db.branch.findOne({ merchantAddress, name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) {
    return NextResponse.json({ error: `A branch named "${name}" already exists.` }, { status: 409 });
  }

  const branch = await db.branch.create({
    _id: crypto.randomUUID(),
    merchantAddress,
    name,
    managedBy: null,
    isDefault: false,
  });

  return NextResponse.json({ branch }, { status: 201 });
}
