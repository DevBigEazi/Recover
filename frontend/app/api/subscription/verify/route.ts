import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, sessionId, walletAddress: bodyWalletAddress } = body;
    const sessionIdentifier = sessionId || reference;

    if (!sessionIdentifier) {
      return NextResponse.json({ error: "sessionId or reference is required" }, { status: 400 });
    }

    await connectDB();

    // 1. PAYSTACK VERIFICATION
    const isPaystack = Boolean(
      (reference && reference.startsWith("pstk_")) ||
      (!sessionIdentifier.startsWith("cs_") && !sessionIdentifier.startsWith("sub_"))
    );

    if (isPaystack) {
      const paystackRes = await verifyPaystackTransaction(sessionIdentifier);
      if (!paystackRes.verified) {
        return NextResponse.json(
          { error: `Paystack payment verification failed with status: ${paystackRes.status}` },
          { status: 400 }
        );
      }

      const metadata = (paystackRes.metadata || {}) as Record<string, string>;
      const targetWalletAddress = (bodyWalletAddress || metadata.walletAddress || "").toLowerCase();

      if (!targetWalletAddress) {
        return NextResponse.json({ error: "Could not resolve target user wallet address from Paystack reference." }, { status: 400 });
      }

      const planTier = metadata.plan || body.planTier || "growth_1000";
      const billingCycle = metadata.billingCycle || "monthly";

      const existingUser = await db.user.findById(targetWalletAddress);
      const companyName = metadata.companyName || existingUser?.companyName;
      const username = metadata.username || existingUser?.username || `merchant_${targetWalletAddress.substring(2, 8)}`;
      const fullName = metadata.fullName || metadata.companyName || existingUser?.fullName || `Merchant (${targetWalletAddress.substring(0, 6)})`;
      const phone = metadata.phone || existingUser?.phone;
      const email = metadata.email || paystackRes.customerEmail || existingUser?.email;

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
            rolloverQuota: 0,
            overageCharges: 0,
            paystackReference: sessionIdentifier,
            ...(companyName ? { companyName } : {}),
            ...(username ? { username } : {}),
            ...(fullName ? { fullName } : {}),
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        success: true,
        gateway: "paystack",
        user: {
          walletAddress: updatedUser?._id,
          subscriptionActive: updatedUser?.subscriptionActive,
          role: updatedUser?.role,
          plan: updatedUser?.plan,
          billingCycle: updatedUser?.billingCycle,
          rolloverQuota: 0,
        },
      });
    }

    // 2. STRIPE VERIFICATION
    const session = await stripe.checkout.sessions.retrieve(sessionIdentifier);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment verification failed. Subscription checkout is incomplete." }, { status: 400 });
    }

    const metadata = session.metadata || {};
    const targetWalletAddress = (bodyWalletAddress || metadata.walletAddress || "").toLowerCase();

    if (!targetWalletAddress) {
      return NextResponse.json({ error: "Could not resolve target user wallet address from checkout session." }, { status: 400 });
    }

    const planTier = metadata.plan || "growth_1000";
    const billingCycle = metadata.billingCycle || "monthly";
    const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

    const existingUser = await db.user.findById(targetWalletAddress);
    const companyName = metadata.companyName || existingUser?.companyName;
    const username = metadata.username || existingUser?.username || `merchant_${targetWalletAddress.substring(2, 8)}`;
    const fullName = metadata.fullName || metadata.companyName || existingUser?.fullName || `Merchant (${targetWalletAddress.substring(0, 6)})`;
    const phone = metadata.phone || existingUser?.phone;
    const email = metadata.email || existingUser?.email;

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
          rolloverQuota: 0, // Strict rule: No rollover in any tier
          overageCharges: 0,
          stripeCustomerId: stripeCustomerId || existingUser?.stripeCustomerId,
          stripeSubscriptionId: stripeSubscriptionId || existingUser?.stripeSubscriptionId,
          ...(companyName ? { companyName } : {}),
          ...(username ? { username } : {}),
          ...(fullName ? { fullName } : {}),
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
        },
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
