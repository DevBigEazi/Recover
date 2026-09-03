import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is a required parameter." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Fetch the report
    const report = await db.finderReport.findOne({ _id: reportId });
    if (!report) {
      return NextResponse.json({ error: "Finder report not found." }, { status: 404 });
    }

    // 2. Fetch the corresponding item
    const item = await db.item.findOne({ _id: report.registrationId });
    if (!item) {
      return NextResponse.json({ error: "Associated item not found." }, { status: 404 });
    }

    const ownerUser = await db.user.findOne({ _id: item.ownerAddress });
    const userEmail = ownerUser?.email || undefined;

    const customer = await getOrCreateStripeCustomer({
      walletAddress: item.ownerAddress,
      email: userEmail,
      name: ownerUser?.fullName || undefined,
      existingStripeCustomerId: ownerUser?.stripeCustomerId || undefined,
    });

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";

    const isPhoneCategory = (item.category || "").toLowerCase() === "phone";
    const unlockAmountCents = isPhoneCategory
      ? STRIPE_PRICES.REPORT_UNLOCK_PHONE_USD_CENTS // $3.50 USD
      : STRIPE_PRICES.REPORT_UNLOCK_OTHER_USD_CENTS; // $1.50 USD

    // 3. Create Stripe Checkout session with USD base pricing & adaptive location currency
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recover Finder Report Unlock (${isPhoneCategory ? "Phone Category" : "Standard Category"}) — ${item.name}`,
              description: `Unlock contact details and return message for registered item (${item.registrationId})`,
            },
            unit_amount: unlockAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/items/${item.registrationId}?session_id={CHECKOUT_SESSION_ID}&unlocked=true`,
      cancel_url: `${origin}/items/${item.registrationId}`,
      metadata: {
        type: "report_unlock",
        reportId,
        registrationId: item._id,
        ownerAddress: item.ownerAddress,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize Stripe report payment:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
