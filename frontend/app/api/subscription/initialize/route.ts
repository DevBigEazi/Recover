import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, STRIPE_PRICES } from "@/lib/stripe";

const TIER_PRICES: Record<string, { monthly: number; yearly: number }> = {
  pro_lite: { monthly: STRIPE_PRICES.PRO_LITE_MONTHLY_CENTS, yearly: STRIPE_PRICES.PRO_LITE_YEARLY_CENTS },
  pro_starter: { monthly: STRIPE_PRICES.PRO_STARTER_MONTHLY_CENTS, yearly: STRIPE_PRICES.PRO_STARTER_YEARLY_CENTS },
  pro_growth: { monthly: STRIPE_PRICES.PRO_GROWTH_MONTHLY_CENTS, yearly: STRIPE_PRICES.PRO_GROWTH_YEARLY_CENTS },
  pro_scale: { monthly: STRIPE_PRICES.PRO_SCALE_MONTHLY_CENTS, yearly: STRIPE_PRICES.PRO_SCALE_YEARLY_CENTS },
  pro: { monthly: STRIPE_PRICES.PRO_GROWTH_MONTHLY_CENTS, yearly: STRIPE_PRICES.PRO_GROWTH_YEARLY_CENTS },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, email, planTier = "pro_growth", billingCycle = "monthly" } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    await connectDB();

    const cleanAddress = walletAddress.toLowerCase();
    const user = await db.user.findById(cleanAddress);

    if (user && user.subscriptionActive && user.plan === planTier && user.billingCycle === billingCycle) {
      return NextResponse.json(
        { error: "You are already active on this plan tier and billing cycle." },
        { status: 400 }
      );
    }

    const usableEmail = (email || user?.email || "").trim();
    if (!usableEmail) {
      return NextResponse.json(
        { error: "Email is required to initialize subscription." },
        { status: 400 }
      );
    }

    const customer = await getOrCreateStripeCustomer({
      walletAddress: cleanAddress,
      email: usableEmail,
      name: user?.companyName || user?.fullName || undefined,
      existingStripeCustomerId: user?.stripeCustomerId || undefined,
    });

    await db.user.findOneAndUpdate(
      { _id: cleanAddress },
      { $set: { stripeCustomerId: customer.id } },
      { upsert: true }
    );

    const priceConfig = TIER_PRICES[planTier] || TIER_PRICES.pro_growth;
    const unitAmount = billingCycle === "yearly" ? priceConfig.yearly : priceConfig.monthly;
    const interval = billingCycle === "yearly" ? "year" : "month";

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recover Merchant ${planTier.toUpperCase().replace("_", " ")} Subscription`,
              description: `Automated logistics tracking API dispatches (${billingCycle} plan)`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/settings?session_id={CHECKOUT_SESSION_ID}&subscribed=true`,
      cancel_url: `${origin}/settings`,
      metadata: {
        type: "subscription",
        walletAddress: cleanAddress,
        plan: planTier,
        billingCycle,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize Stripe subscription:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
