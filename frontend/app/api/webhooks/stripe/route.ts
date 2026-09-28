import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      // Fallback parse if signature secret not configured yet in local test
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook Error";
    console.error("Stripe Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  await connectDB();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        if (metadata.type === "report_unlock" && metadata.reportId) {
          await db.finderReport.findOneAndUpdate(
            { _id: metadata.reportId },
            { $set: { unlocked: true } }
          );
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Stripe Webhook processing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
