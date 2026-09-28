import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer, STRIPE_PRICES } from "@/lib/stripe";
import { initializePaystackTransaction } from "@/lib/paystack";
import { convertUsdPrice, UserCurrencyInfo } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId, userCurrency } = body as {
      reportId: string;
      userCurrency?: UserCurrencyInfo;
    };

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
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";

    const itemRegId = item.registrationId || item._id;
    const isPhoneCategory = (item.category || "").toLowerCase() === "phone";
    const baseUsdPrice = isPhoneCategory ? 3.50 : 1.50;

    // Detect if user is from Nigeria (NGN) or Others (USD)
    const isNigeria = userCurrency?.currency === "NGN" || userCurrency?.countryCode === "NG";

    // -------------------------------------------------------------
    // GATEWAY 1: PAYSTACK (For Nigeria Users - NGN)
    // -------------------------------------------------------------
    if (isNigeria) {
      const priceConversion = convertUsdPrice(baseUsdPrice, userCurrency);
      const amountInKobo = priceConversion.localAmount * 100; // kobo is 1/100 of Naira

      const paystackRes = await initializePaystackTransaction({
        email: userEmail || "owner@userecover.xyz",
        amountInKobo,
        callbackUrl: `${origin}/items/${itemRegId}?unlocked=true`,
        metadata: {
          type: "report_unlock",
          reportId,
          registrationId: itemRegId,
          ownerAddress: item.ownerAddress,
          custom_fields: [
            {
              display_name: "Item Name",
              variable_name: "item_name",
              value: item.name,
            },
          ],
        },
      });

      return NextResponse.json({
        success: true,
        gateway: "paystack",
        currency: "NGN",
        url: paystackRes.authorization_url,
        reference: paystackRes.reference,
      });
    }

    // -------------------------------------------------------------
    // GATEWAY 2: STRIPE (For All Other Countries - USD)
    // -------------------------------------------------------------
    const customer = await getOrCreateStripeCustomer({
      walletAddress: item.ownerAddress,
      email: userEmail,
      name: ownerUser?.fullName || undefined,
      existingStripeCustomerId: ownerUser?.stripeCustomerId || undefined,
    });

    const unlockAmountCents = isPhoneCategory
      ? STRIPE_PRICES.REPORT_UNLOCK_PHONE_USD_CENTS // 350 ($3.50 USD)
      : STRIPE_PRICES.REPORT_UNLOCK_OTHER_USD_CENTS; // 150 ($1.50 USD)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recover Finder Report Unlock (${isPhoneCategory ? "Phone Category" : "Standard Category"}) — ${item.name}`,
              description: `Unlock contact details and return message for registered item (${itemRegId})`,
            },
            unit_amount: unlockAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/items/${itemRegId}?session_id={CHECKOUT_SESSION_ID}&unlocked=true`,
      cancel_url: `${origin}/items/${itemRegId}`,
      metadata: {
        type: "report_unlock",
        reportId,
        registrationId: itemRegId,
        ownerAddress: item.ownerAddress,
      },
    });

    return NextResponse.json({
      success: true,
      gateway: "stripe",
      currency: "USD",
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize report payment:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
