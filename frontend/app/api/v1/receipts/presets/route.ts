import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { shipper: merchant, error, status } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const query: Record<string, unknown> = {
      merchantAddress: merchant._id.toLowerCase(),
    };

    if (q) {
      query.name = new RegExp(q, "i");
    }

    const presets = await db.productPreset
      .find(query)
      .sort({ salesCount: -1, lastSoldAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      presets,
    });
  } catch (err: unknown) {
    console.error("Product presets fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
