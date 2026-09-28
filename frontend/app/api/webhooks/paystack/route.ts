import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (secretKey && signature) {
      const isValid = verifyPaystackWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("Paystack webhook signature verification failed.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    await connectDB();

    if (event === "charge.success") {
      const metadata = data?.metadata || {};

      if (metadata.type === "report_unlock" && metadata.reportId) {
        await db.finderReport.findOneAndUpdate(
          { _id: metadata.reportId },
          { $set: { unlocked: true } }
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Paystack webhook processing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
