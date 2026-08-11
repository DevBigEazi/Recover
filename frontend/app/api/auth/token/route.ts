import { NextResponse } from "next/server";
import { serverAuth } from "@/lib/server-auth";
import { db, connectDB } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();
    const cleanAddress = String(address || "").trim().toLowerCase();

    if (!cleanAddress || !cleanAddress.startsWith("0x")) {
      return NextResponse.json({ error: "Valid wallet address is required." }, { status: 400 });
    }

    await connectDB();

    // Check if user exists in database
    const user = await db.user.findOne({
      $or: [
        { _id: cleanAddress },
        { _id: { $regex: new RegExp(`^${cleanAddress}$`, "i") } },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // Generate signed JWT session token via Thirdweb serverAuth
    const payload = await serverAuth.generatePayload({
      address: user._id.toLowerCase(),
    });
    const jwt = await serverAuth.generateJWT({
      payload: payload as unknown as Parameters<typeof serverAuth.generateJWT>[0]["payload"],
    });

    const response = NextResponse.json({ token: jwt, address: user._id.toLowerCase() });

    // Store in httpOnly session cookie
    response.cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    console.error("Token generation error:", err);
    const msg = err instanceof Error ? err.message : "Failed to generate token";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
