import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB, db, isNigerianUser } from "@/lib/db";
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

  const user = await db.user.findById(merchantAddress);
  const plan = user?.plan || "free";

  if (plan === "free" && !user?.subscriptionActive) {
    return NextResponse.json(
      { error: "The Free plan is CEO-only and does not support branches. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const BRANCH_LIMITS: Record<string, number> = {
    free: 0,
    starter_500: 1,
    growth_1000: 2,
    business_2500: 3,
    scale_5000: 5,
    pro_lite: 1,
    pro_starter: 2,
    pro_growth: 3,
    pro_scale: 5,
    pro: 3,
  };

  const branchLimit = BRANCH_LIMITS[plan] ?? 1;
  const currentBranchCount = await db.branch.countDocuments({ merchantAddress });

  const isNigeria = isNigerianUser(user);
  const universalOverageRate = isNigeria ? 1 : 0.003;

  // If merchant has reached or exceeded tier branch quota, bill universal overage
  let isOverage = false;
  if (currentBranchCount >= branchLimit) {
    await db.user.findByIdAndUpdate(merchantAddress, {
      $inc: { overageCharges: universalOverageRate },
    });
    isOverage = true;
  }

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

  return NextResponse.json(
    { branch, isOverage, overageFee: isOverage ? universalOverageRate : 0 },
    { status: 201 }
  );
}
