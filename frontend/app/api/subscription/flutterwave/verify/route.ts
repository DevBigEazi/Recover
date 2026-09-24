import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { verifyFlutterwavePayment } from "@/lib/flutterwave";
import { PLAN_TIERS } from "@/lib/currency";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, walletAddress, planTier = "growth_1000" } = body;

    if (!reference || !walletAddress) {
      return NextResponse.json(
        { error: "reference and walletAddress are required." },
        { status: 400 }
      );
    }

    await connectDB();

    const verification = await verifyFlutterwavePayment(reference);
    if (!verification.verified) {
      return NextResponse.json(
        { error: `Flutterwave payment verification failed with status: ${verification.status}` },
        { status: 400 }
      );
    }

    const cleanAddress = walletAddress.toLowerCase();
    const validatedPlan = PLAN_TIERS[planTier] ? planTier : "growth_1000";

    const updatedUser = await db.user.findByIdAndUpdate(
      cleanAddress,
      {
        $set: {
          subscriptionActive: true,
          role: "merchant",
          plan: validatedPlan,
          billingCycle: "monthly",
          billingCycleStart: new Date(),
          shipmentsThisMonth: 0,
          rolloverQuota: 0, // Strict rule: No rollover in any tier
          overageCharges: 0,
        },
        $setOnInsert: {
          fullName: `Recover Merchant (${cleanAddress.substring(0, 6)})`,
          username: `merchant_${cleanAddress.substring(2, 8)}`,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User profile not found after verification." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: updatedUser._id,
        subscriptionActive: updatedUser.subscriptionActive,
        role: updatedUser.role,
        plan: updatedUser.plan,
        billingCycle: updatedUser.billingCycle,
        rolloverQuota: 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to verify Flutterwave subscription:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
