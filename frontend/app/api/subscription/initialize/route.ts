import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { initializeFlutterwavePayment } from "@/lib/flutterwave";
import { PLAN_TIERS } from "@/lib/currency";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      email,
      planTier = "growth_1000",
      billingCycle = "monthly",
      gateway,
      countryCode,
      currency,
    } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    await connectDB();

    const cleanAddress = walletAddress.toLowerCase();
    const user = await db.user.findById(cleanAddress);

    if (user && user.subscriptionActive && user.plan === planTier && user.billingCycle === billingCycle) {
      return NextResponse.json(
        { error: "You are already active on this plan tier." },
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

    const selectedPlan = PLAN_TIERS[planTier] || PLAN_TIERS.growth_1000;
    const isNigerian =
      gateway === "flutterwave" ||
      countryCode?.toUpperCase() === "NG" ||
      currency?.toUpperCase() === "NGN";

    // 1. FLUTTERWAVE GATEWAY (Nigeria Market)
    if (isNigerian) {
      const flwOrder = await initializeFlutterwavePayment({
        walletAddress: cleanAddress,
        email: usableEmail,
        name: user?.companyName || user?.fullName || undefined,
        planTier: selectedPlan.id,
        amountNgn: selectedPlan.ngnMonthly,
        billingCycle: "monthly",
      });

      return NextResponse.json({
        gateway: "flutterwave",
        reference: flwOrder.reference,
        customerId: flwOrder.customerId,
        amount: flwOrder.amount,
        currency: "NGN",
        planTier: selectedPlan.id,
        clientId: flwOrder.clientSecretConfig.clientId,
      });
    }

    // 2. STRIPE GATEWAY (US & International Market)
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

    // Triple price for international market (outside Nigeria), minimum 50 cents for Stripe
    const internationalNgn = selectedPlan.ngnMonthly * 3;
    const unitAmountCents = Math.max(50, Math.round((internationalNgn / 1480) * 100));
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recover Merchant ${selectedPlan.name} Subscription`,
              description: `${selectedPlan.description} (Monthly Plan)`,
            },
            unit_amount: unitAmountCents,
            recurring: {
              interval: "month",
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
        plan: selectedPlan.id,
        billingCycle: "monthly",
      },
    });

    return NextResponse.json({
      gateway: "stripe",
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize subscription checkout:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
