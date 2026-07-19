import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    const user = await db.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to fetch user profile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, fullName, username, emailNotifications } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required." },
        { status: 400 }
      );
    }

    // Load existing user profile to merge details if fields are partially provided
    const existingUser = await db.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    const targetFullName = fullName !== undefined ? fullName.trim() : (existingUser?.fullName || "");
    const targetUsername = username !== undefined ? username.trim().toLowerCase() : (existingUser?.username || "");
    const targetEmailNotifications = emailNotifications !== undefined ? !!emailNotifications : (existingUser?.emailNotifications ?? true);

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
    }

    try {
      const user = await db.user.upsert({
        where: { walletAddress: walletAddress.toLowerCase() },
        update: {
          fullName: targetFullName,
          username: targetUsername,
          emailNotifications: targetEmailNotifications,
        },
        create: {
          walletAddress: walletAddress.toLowerCase(),
          fullName: targetFullName,
          username: targetUsername,
          emailNotifications: targetEmailNotifications,
        },
      });

      return NextResponse.json(user, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
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
