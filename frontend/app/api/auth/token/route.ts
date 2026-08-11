import { NextResponse } from "next/server";
import { verifySignature } from "thirdweb/auth";
import type { LoginPayload } from "thirdweb/auth";
import { serverAuth } from "@/lib/server-auth";
import { db, connectDB } from "@/lib/db";

type VerifiedPayload = Extract<
  Awaited<ReturnType<typeof serverAuth.verifyPayload>>,
  { valid: true }
>["payload"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, signature, payload, challenge, nonce } = body || {};

    const cleanAddress = String(address || payload?.address || "").trim().toLowerCase();
    if (!cleanAddress || !cleanAddress.startsWith("0x")) {
      return NextResponse.json({ error: "Valid wallet address is required." }, { status: 400 });
    }

    const cleanSignature = String(signature || "").trim();
    if (!cleanSignature) {
      return NextResponse.json({ error: "Signed wallet challenge signature is required." }, { status: 400 });
    }

    let verifiedPayload: VerifiedPayload | null = null;
    let isValidProof = false;

    if (payload && typeof payload === "object") {
      const verification = await serverAuth.verifyPayload({
        payload: payload as LoginPayload,
        signature: cleanSignature,
      });
      if (verification.valid && verification.payload.address.toLowerCase() === cleanAddress) {
        isValidProof = true;
        verifiedPayload = verification.payload;
      }
    } else {
      const challengeMsg = String(challenge || nonce || "").trim();
      if (challengeMsg) {
        try {
          const isValid = await verifySignature({
            message: challengeMsg,
            signature: cleanSignature,
            address: cleanAddress,
          });
          if (isValid) {
            isValidProof = true;
          }
        } catch {
          isValidProof = false;
        }
      }
    }

    if (!isValidProof) {
      return NextResponse.json(
        { error: "Invalid wallet challenge proof or signature mismatch." },
        { status: 401 }
      );
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
    let jwt: string;
    if (verifiedPayload) {
      jwt = await serverAuth.generateJWT({
        payload: verifiedPayload,
      });
    } else {
      const generatedPayload = await serverAuth.generatePayload({
        address: user._id.toLowerCase(),
      });
      jwt = await serverAuth.generateJWT({
        payload: generatedPayload as unknown as Parameters<typeof serverAuth.generateJWT>[0]["payload"],
      });
    }

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
