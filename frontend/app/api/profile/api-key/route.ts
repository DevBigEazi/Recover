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

    // Generate secret API key: rec_live_<48-hex-chars>
    const newApiKey = `rec_live_${crypto.randomBytes(24).toString("hex")}`;

    const updatedUser = await db.user.findByIdAndUpdate(
      user._id,
      { $set: { apiKey: newApiKey } },
      { new: true }
    );

    return NextResponse.json(
      { success: true, apiKey: updatedUser?.apiKey || newApiKey },
      { status: 200 }
    );


  } catch (error: unknown) {
    console.error("API Key generation error:", error);
    return NextResponse.json({ error: "Failed to generate API Key." }, { status: 500 });
  }
}
