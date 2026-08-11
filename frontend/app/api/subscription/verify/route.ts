import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, sessionId, walletAddress: bodyWalletAddress } = body;
    const sessionIdentifier = sessionId || reference;

    if (!sessionIdentifier) {
      return NextResponse.json({ error: "sessionId or reference is required" }, { status: 400 });
    }

    await connectDB();

    const session = await stripe.checkout.sessions.retrieve(sessionIdentifier);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment verification failed. Subscription checkout is incomplete." }, { status: 400 });
    }

    const metadata = session.metadata || {};
    const targetWalletAddress = (bodyWalletAddress || metadata.walletAddress || "").toLowerCase();

    if (!targetWalletAddress) {
      return NextResponse.json({ error: "Could not resolve target user wallet address from checkout session." }, { status: 400 });
    }

    const planTier = metadata.plan || "pro_growth";
    const billingCycle = metadata.billingCycle || "monthly";
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

    const TIER_QUOTAS: Record<string, number> = {
      free: 100,
      pro_lite: 2500,
      pro_starter: 10000,
      pro_growth: 100000,
      pro_scale: 500000,
      pro: 100000,
    };

    const existingUser = await db.user.findById(targetWalletAddress);
    let carriedRollover = 0;
    if (existingUser) {
      const prevPlanQuota = TIER_QUOTAS[existingUser.plan] || 100;
      const prevUsed = existingUser.shipmentsThisMonth || 0;
      const prevRollover = existingUser.rolloverQuota || 0;
      const totalPrevCapacity = prevPlanQuota + prevRollover;
      const unusedRemaining = Math.max(0, totalPrevCapacity - prevUsed);
      carriedRollover = unusedRemaining;
    }

    const updatedUser = await db.user.findByIdAndUpdate(
      targetWalletAddress,
      {
        $set: {
          subscriptionActive: true,
          role: "merchant",
          plan: planTier,
          billingCycle: billingCycle,
          billingCycleStart: new Date(),
          shipmentsThisMonth: 0,
          rolloverQuota: carriedRollover,
          overageCharges: 0,
          stripeCustomerId: stripeCustomerId || existingUser?.stripeCustomerId,
          stripeSubscriptionId: stripeSubscriptionId || existingUser?.stripeSubscriptionId,
        },
        $setOnInsert: {
          fullName: `Logistics Partner (${targetWalletAddress.substring(0, 6)})`,
          username: `merchant_${targetWalletAddress.substring(2, 8)}`,
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User profile not found after transaction verification." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: updatedUser._id,
        subscriptionActive: updatedUser.subscriptionActive,
        role: updatedUser.role,
        plan: updatedUser.plan,
        billingCycle: updatedUser.billingCycle,
        rolloverQuota: updatedUser.rolloverQuota,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to verify Stripe subscription:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
