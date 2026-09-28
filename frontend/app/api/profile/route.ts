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
      return NextResponse.json(userObj, { status: 200 });
    }

    // Return sanitized public profile for non-owners (excluding phone, email, whatsapp)
    const publicProfile = {
      _id: user._id,
      walletAddress: user._id,
      fullName: user.fullName,
      username: user.username,
      role: "user",
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
    const { walletAddress, fullName, username, phone, whatsapp, email } = body;

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
        : (existingUser?.fullName || "");
    const targetUsername = username !== undefined ? username.trim().toLowerCase() : (existingUser?.username || "");

    const targetPhone = phone !== undefined ? phone.trim() : (existingUser?.phone || "");
    const targetWhatsapp = whatsapp !== undefined ? whatsapp.trim() : (existingUser?.whatsapp || "");
    const targetEmail = email !== undefined ? email.trim() : (existingUser?.email || "");

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

      // Individual users: at least one contact method required
      if (!targetPhone && !targetWhatsapp && !targetEmail) {
        return NextResponse.json(
          { error: "At least one contact method (Phone, WhatsApp, or Email) is required on your profile." },
          { status: 400 }
        );
      }
    }

    try {
      const targetId = existingUser ? existingUser._id : walletAddress.toLowerCase();
      const user = await db.user.findOneAndUpdate(
        { _id: targetId },
        {
          $set: {
            fullName: targetFullName,
            username: targetUsername,
            phone: targetPhone || null,
            whatsapp: targetWhatsapp || null,
            email: targetEmail || null,
            role: "user",
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
