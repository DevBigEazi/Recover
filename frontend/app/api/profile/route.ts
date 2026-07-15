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
    const { walletAddress, fullName, username } = body;

    if (!walletAddress || !fullName || !username) {
      return NextResponse.json(
        { error: "Missing required profile parameters." },
        { status: 400 }
      );
    }

    const cleanedFullName = fullName.trim();
    const cleanedUsername = username.trim().toLowerCase();

    if (cleanedFullName.length === 0 || cleanedFullName.length > 50) {
      return NextResponse.json(
        { error: "Full name must be between 1 and 50 characters." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanedUsername)) {
      return NextResponse.json(
        {
          error:
            "Username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }

    try {
      const user = await db.user.upsert({
        where: { walletAddress: walletAddress.toLowerCase() },
        update: {
          fullName: cleanedFullName,
          username: cleanedUsername,
        },
        create: {
          walletAddress: walletAddress.toLowerCase(),
          fullName: cleanedFullName,
          username: cleanedUsername,
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
