import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query parameter is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await db.user.findOne({
      _id: walletAddress.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check request header for authentication
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    const isOwner = requestOwner === walletAddress.toLowerCase();

    if (isOwner) {
      return NextResponse.json(user, { status: 200 });
    }

    // Return sanitized public profile for non-owners (excluding phone, email, whatsapp)
    const publicProfile = {
      _id: user._id,
      walletAddress: user._id,
      fullName: user.fullName,
      username: user.username,
      subscriptionActive: Boolean(user.subscriptionActive),
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
      _id: walletAddress.toLowerCase(),
    });

    const targetFullName = fullName !== undefined ? fullName.trim() : (existingUser?.fullName || "");
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

      // Enforce at least one contact method
      if (!targetPhone && !targetWhatsapp && !targetEmail) {
        return NextResponse.json(
          { error: "At least one contact method (Phone, WhatsApp, or Email) is required on your profile." },
          { status: 400 }
        );
      }
    }

    try {
      const user = await db.user.findOneAndUpdate(
        { _id: walletAddress.toLowerCase() },
        {
          $set: {
            fullName: targetFullName,
            username: targetUsername,
            phone: targetPhone || null,
            whatsapp: targetWhatsapp || null,
            email: targetEmail || null,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
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
