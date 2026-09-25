import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { initializePaystackTransaction } from "@/lib/paystack";
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

    const usableEmail = (
      email ||
      body.billingEmail ||
      body.businessEmail ||
      user?.businessEmail ||
      user?.email ||
      ""
    ).trim();
    if (!usableEmail) {
      return NextResponse.json(
        { error: "Email is required to initialize subscription." },
        { status: 400 }
      );
    }

    const selectedPlan = PLAN_TIERS[planTier] || PLAN_TIERS.growth_1000;
    const isNigerian =
      gateway === "paystack" ||
      countryCode?.toUpperCase() === "NG" ||
      currency?.toUpperCase() === "NGN";

    const isFromOnboarding = Boolean(body.isOnboarding);
    const usableName = (
      body.companyName ||
      body.fullName ||
      user?.companyName ||
      user?.fullName ||
      undefined
    );

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";

    // 1. PAYSTACK GATEWAY (Nigeria Market - Cards, Bank Transfer, USSD, OPay)
    if (isNigerian) {
      const callbackUrl = isFromOnboarding
        ? `${origin}/workspace?subscribed=true&onboarding=true`
        : `${origin}/settings?subscribed=true`;

      const cancelUrl = isFromOnboarding
        ? `${origin}/workspace?onboarding_cancelled=true`
        : `${origin}/settings?cancelled=true`;

      const paystackOrder = await initializePaystackTransaction({
        email: usableEmail,
        amountNgn: selectedPlan.ngnMonthly,
        callbackUrl,
        metadata: {
          cancel_action: cancelUrl,
          walletAddress: cleanAddress,
          plan: selectedPlan.id,
          billingCycle: "monthly",
          isOnboarding: isFromOnboarding ? "true" : "false",
          companyName: (body.companyName || user?.companyName || "").trim(),
          username: (body.username || user?.username || "").trim(),
          phone: (body.phone || user?.phone || "").trim(),
          fullName: (body.fullName || body.companyName || user?.fullName || "").trim(),
          role: "merchant",
        },
      });

      return NextResponse.json({
        gateway: "paystack",
        url: paystackOrder.authorizationUrl,
        checkoutUrl: paystackOrder.authorizationUrl,
        reference: paystackOrder.reference,
        accessCode: paystackOrder.accessCode,
        amount: selectedPlan.ngnMonthly,
        currency: "NGN",
        planTier: selectedPlan.id,
      });
    }

    // 2. STRIPE GATEWAY (US & International Market)
    const customer = await getOrCreateStripeCustomer({
      walletAddress: cleanAddress,
      email: usableEmail,
      name: usableName,
      existingStripeCustomerId: user?.stripeCustomerId || undefined,
    });

    // Ensure existing Stripe customer record reflects the selected billing email and name before checkout
    if (usableEmail && customer.email !== usableEmail) {
      await stripe.customers.update(customer.id, {
        email: usableEmail,
        ...(usableName && customer.name !== usableName ? { name: usableName } : {}),
      });
    } else if (usableName && customer.name !== usableName) {
      await stripe.customers.update(customer.id, {
        name: usableName,
      });
    }

    // Update customer ID only if the user document already exists (do NOT upsert an incomplete user during onboarding)
    await db.user.updateOne(
      { _id: cleanAddress },
      { $set: { stripeCustomerId: customer.id } }
    );

    // Triple price for international market (outside Nigeria), minimum 50 cents for Stripe
    const internationalNgn = selectedPlan.ngnMonthly * 3;
    const unitAmountCents = Math.max(50, Math.round((internationalNgn / 1480) * 100));

    const success_url = isFromOnboarding
      ? `${origin}/workspace?session_id={CHECKOUT_SESSION_ID}&subscribed=true&onboarding=true`
      : `${origin}/settings?session_id={CHECKOUT_SESSION_ID}&subscribed=true`;

    const cancel_url = isFromOnboarding
      ? `${origin}/workspace?onboarding_cancelled=true`
      : `${origin}/settings?cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      customer_update: {
        address: "auto",
        name: "auto",
      },
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
      success_url,
      cancel_url,
      metadata: {
        type: "subscription",
        walletAddress: cleanAddress,
        plan: selectedPlan.id,
        billingCycle: "monthly",
        isOnboarding: isFromOnboarding ? "true" : "false",
        companyName: (body.companyName || user?.companyName || "").trim(),
        username: (body.username || user?.username || "").trim(),
        phone: (body.phone || user?.phone || "").trim(),
        email: usableEmail,
        fullName: (body.fullName || body.companyName || user?.fullName || "").trim(),
        role: "merchant",
      },
    });

    return NextResponse.json({
      gateway: "stripe",
      url: session.url,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize subscription checkout:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
