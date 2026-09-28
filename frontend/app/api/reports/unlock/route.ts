import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { verifyPaystackTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId: bodyReportId, sessionId, reference, trxref } = body;

    const paystackRef = reference || trxref || (sessionId && (sessionId.startsWith("mock_paystack_") || !sessionId.startsWith("cs_")) ? sessionId : null);
    const stripeSessionId = sessionId && sessionId.startsWith("cs_") ? sessionId : null;

    if (!paystackRef && !stripeSessionId && !bodyReportId) {
      return NextResponse.json(
        { error: "sessionId, reference, or reportId is required." },
        { status: 400 }
      );
    }

    await connectDB();

    // -------------------------------------------------------------
    // CASE 1: PAYSTACK PAYMENT VERIFICATION
    // -------------------------------------------------------------
    if (paystackRef) {
      const paystackData = await verifyPaystackTransaction(paystackRef);

      if (!paystackData || paystackData.status !== "success") {
        return NextResponse.json(
          { error: "Paystack payment verification failed or payment is incomplete." },
          { status: 400 }
        );
      }

      const targetReportId = paystackData.metadata?.reportId || bodyReportId;
      if (!targetReportId) {
        return NextResponse.json(
          { error: "Could not identify reportId from Paystack transaction metadata." },
          { status: 400 }
        );
      }

      const updatedReport = await db.finderReport.findOneAndUpdate(
        { _id: targetReportId },
        { $set: { unlocked: true } },
        { returnDocument: "after" }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Finder report not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        gateway: "paystack",
        report: updatedReport,
        message: "Report unlocked successfully via Paystack!",
      });
    }

    // -------------------------------------------------------------
    // CASE 2: STRIPE PAYMENT VERIFICATION
    // -------------------------------------------------------------
    if (stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

      if (session.payment_status !== "paid" && session.status !== "complete") {
        return NextResponse.json(
          { error: "Payment verification failed. Stripe checkout session is incomplete." },
          { status: 400 }
        );
      }

      if (session.metadata?.type !== "report_unlock") {
        return NextResponse.json(
          { error: "Invalid session type for report unlock." },
          { status: 400 }
        );
      }

      const targetReportId = session.metadata?.reportId || bodyReportId;
      if (!targetReportId) {
        return NextResponse.json(
          { error: "Could not identify reportId from checkout session." },
          { status: 400 }
        );
      }

      const updatedReport = await db.finderReport.findOneAndUpdate(
        { _id: targetReportId },
        { $set: { unlocked: true } },
        { returnDocument: "after" }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Finder report not found." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        gateway: "stripe",
        report: updatedReport,
        message: "Report unlocked successfully via Stripe!",
      });
    }

    return NextResponse.json(
      { error: "No valid transaction reference or session ID provided." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Report unlock verification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
