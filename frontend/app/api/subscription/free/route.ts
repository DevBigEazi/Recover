import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    await connectDB();

    const updatedUser = await db.user.findByIdAndUpdate(
      walletAddress.toLowerCase(),
      {
        $set: {
          subscriptionActive: false,
          role: "merchant",
          plan: "free",
          billingCycleStart: new Date(),
          shipmentsThisMonth: 0,
          overageCharges: 0,
        },
        $setOnInsert: {
          fullName: `Logistics Partner (${walletAddress.substring(0, 6)})`,
          username: `merchant_${walletAddress.substring(2, 8).toLowerCase()}`,
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: updatedUser._id,
        role: updatedUser.role,
        plan: updatedUser.plan,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to activate free tier:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
