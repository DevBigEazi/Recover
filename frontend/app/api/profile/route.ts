import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawWalletAddress = searchParams.get("walletAddress")?.trim();

    if (!rawWalletAddress) {
      return NextResponse.json(
        { error: "walletAddress query parameter is required." },
        { status: 400 }
      );
    }

    const walletAddress = rawWalletAddress.toLowerCase();
    const requestOwner = request.headers.get("x-owner-address")?.trim()?.toLowerCase();

    await connectDB();

    const user = await db.user.findOne({
      $or: [
        { _id: walletAddress },
        { _id: walletAddress.toLowerCase() },
        { _id: { $regex: new RegExp(`^${walletAddress}$`, "i") } },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check request header for authentication (case & whitespace insensitive)
    const isOwner = Boolean(
      requestOwner &&
      (requestOwner === walletAddress ||
       requestOwner === user._id.toLowerCase() ||
       requestOwner === user._id)
    );

    if (isOwner) {
      const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
      userObj.billingCycle = userObj.billingCycle || "monthly";
      userObj.plan = userObj.plan || "free";
      userObj.subscriptionActive = userObj.subscriptionActive !== undefined ? userObj.subscriptionActive : (userObj.plan !== "free");
      userObj.rolloverQuota = userObj.rolloverQuota || 0;
      userObj.overageCharges = userObj.overageCharges || 0;
      userObj.apiKey = user.apiKey || userObj.apiKey || null;

      const billingStart = userObj.billingCycleStart ? new Date(userObj.billingCycleStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const actualCount = await db.shipment.countDocuments({
        shipperAddress: { $regex: new RegExp(`^${user._id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        createdAt: { $gte: billingStart },
      });
      userObj.shipmentsThisMonth = actualCount;
      if (user.shipmentsThisMonth !== actualCount) {
        db.user.findByIdAndUpdate(user._id, { shipmentsThisMonth: actualCount }).catch((e) => console.error("Sync shipments error:", e));
      }

      return NextResponse.json(userObj, { status: 200 });
    }


    // Return sanitized public profile for non-owners (excluding phone, email, whatsapp)
    const publicProfile = {
      _id: user._id,
      walletAddress: user._id,
      fullName: user.fullName,
      companyName: user.companyName || null,
      username: user.username,
      subscriptionActive: user.subscriptionActive !== undefined ? Boolean(user.subscriptionActive) : (user.plan !== "free"),
      role: user.role,
      plan: user.plan || "free",
    };

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to fetch user profile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, fullName, companyName, username, phone, whatsapp, email, role, plan, billingCycle } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required." },
        { status: 400 }
      );
    }

    await connectDB();

    // Load existing user profile to merge details if fields are partially provided
    const existingUser = await db.user.findOne({
      $or: [
        { _id: walletAddress },
        { _id: walletAddress.toLowerCase() },
        { _id: { $regex: new RegExp(`^${walletAddress}$`, "i") } },
      ],
    });

    const targetFullName =
      fullName !== undefined && fullName.trim().length > 0
        ? fullName.trim()
        : (companyName !== undefined && companyName.trim().length > 0)
        ? companyName.trim()
        : (existingUser?.fullName || "");
    const targetUsername = username !== undefined ? username.trim().toLowerCase() : (existingUser?.username || "");

    const targetPhone = phone !== undefined ? phone.trim() : (existingUser?.phone || "");
    const targetWhatsapp = whatsapp !== undefined ? whatsapp.trim() : (existingUser?.whatsapp || "");
    const targetEmail = email !== undefined ? email.trim() : (existingUser?.email || "");
    
    // Immutability: standard users/merchants cannot change their role or plan via profile saves after registration
    const targetRole = (existingUser && existingUser.role) ? existingUser.role : (role || "user");
    // Validate role value on first-time write
    if (!existingUser && !("user" === targetRole || "merchant" === targetRole)) {
      return NextResponse.json(
        { error: "Invalid account type. Must be 'user' or 'merchant'." },
        { status: 400 }
      );
    }
    const targetPlan = plan || existingUser?.plan || "free";
    const targetBillingCycle = billingCycle || existingUser?.billingCycle || "monthly";

    // companyName: only meaningful for merchants; always null for individuals
    const targetCompanyName =
      targetRole === "merchant"
        ? (companyName !== undefined ? companyName.trim() : (existingUser?.companyName || ""))
        : null;

    if (fullName !== undefined || username !== undefined || !existingUser) {
      if (targetFullName.length === 0 || targetFullName.length > 50) {
        return NextResponse.json(
          { error: "Full name must be between 1 and 50 characters." },
          { status: 400 }
        );
      }

      if (!/^[a-z0-9_-]{3,30}$/.test(targetUsername)) {
        return NextResponse.json(
          {
            error:
              "Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens.",
          },
          { status: 400 }
        );
      }

      if (targetRole === "merchant") {
        // Merchants must have a company name, phone, and email — no exceptions
        if (!targetCompanyName || targetCompanyName.length === 0) {
          return NextResponse.json(
            { error: "Company name is required for logistics/merchant accounts." },
            { status: 400 }
          );
        }
        if (!targetPhone || !targetEmail) {
          return NextResponse.json(
            { error: "Customer support phone and business email are required for merchant accounts." },
            { status: 400 }
          );
        }
      } else {
        // Individual users: at least one contact method
        if (!targetPhone && !targetWhatsapp && !targetEmail) {
          return NextResponse.json(
            { error: "At least one contact method (Phone, WhatsApp, or Email) is required on your profile." },
            { status: 400 }
          );
        }
      }
    }

    try {
      const targetId = existingUser ? existingUser._id : walletAddress.toLowerCase();
      const user = await db.user.findOneAndUpdate(
        { _id: targetId },
        {
          $set: {
            fullName: targetFullName,
            companyName: targetCompanyName,
            username: targetUsername,
            phone: targetPhone || null,
            whatsapp: targetRole === "merchant" ? null : (targetWhatsapp || null),
            email: targetEmail || null,
            role: targetRole,
            plan: targetPlan,
            billingCycle: targetBillingCycle,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      return NextResponse.json(user, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err.code === 11000 || err.code === "P2002")) {
        return NextResponse.json(
          { error: "Username is already taken." },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to upsert user profile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
