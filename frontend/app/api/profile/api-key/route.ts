import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const ownerAddress = request.headers.get("x-owner-address")?.toLowerCase();

    if (!ownerAddress) {
      return NextResponse.json({ error: "x-owner-address header is required" }, { status: 401 });
    }

    await connectDB();

    const user = await db.user.findOne({
      $or: [
        { _id: ownerAddress.toLowerCase() },
        { _id: ownerAddress },
        { _id: { $regex: new RegExp(`^${ownerAddress}$`, "i") } },
      ],
    });

    if (!user || user.role !== "merchant") {
      return NextResponse.json(
        { error: "Developer API keys are only available for merchant accounts." },
        { status: 403 }
      );
    }

    let keyType: "live" | "test" = "live";
    try {
      const body = await request.json();
      if (body?.keyType === "test") {
        keyType = "test";
      }
    } catch {
      // Body may be empty or unparseable, default to live key
    }

    // Generate secret API key
    const randomHex = crypto.randomBytes(24).toString("hex");
    const newKey = keyType === "test" ? `rec_test_${randomHex}` : `rec_live_${randomHex}`;
    const keyHash = crypto.createHash("sha256").update(newKey).digest("hex");
    const prefixLength = keyType === "test" ? 9 : 9;
    const keyMasked = `${newKey.substring(0, prefixLength + 4)}••••${newKey.slice(-4)}`;

    const updateQuery = keyType === "test"
      ? { $set: { testApiKeyHash: keyHash, testApiKeyMasked: keyMasked, testApiKey: null } }
      : { $set: { apiKeyHash: keyHash, apiKeyMasked: keyMasked, apiKey: null } };

    const updatedUser = await db.user.findByIdAndUpdate(
      user._id,
      updateQuery,
      { new: true }
    );

    return NextResponse.json(
      {
        success: true,
        keyType,
        apiKeyMasked: updatedUser?.apiKeyMasked || keyMasked,
        testApiKeyMasked: updatedUser?.testApiKeyMasked || keyMasked,
        generatedKey: newKey,
      },
      { status: 200 }
    );


  } catch (error: unknown) {
    console.error("API Key generation error:", error);
    return NextResponse.json({ error: "Failed to generate API Key." }, { status: 500 });
  }
}
