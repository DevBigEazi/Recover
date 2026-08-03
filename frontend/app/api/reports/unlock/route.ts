import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId: bodyReportId, sessionId, reference } = body;

    const sessionIdentifier = sessionId || reference;
    if (!sessionIdentifier && !bodyReportId) {
      return NextResponse.json(
        { error: "sessionId, reference, or reportId is required." },
        { status: 400 }
      );
    }

    await connectDB();

    let targetReportId = bodyReportId;

    if (sessionIdentifier) {
      const session = await stripe.checkout.sessions.retrieve(sessionIdentifier);

      if (session.payment_status !== "paid" && session.status !== "complete") {
        return NextResponse.json(
          { error: "Payment verification failed. Checkout session is incomplete." },
          { status: 400 }
        );
      }

      if (!targetReportId && session.metadata?.reportId) {
        targetReportId = session.metadata.reportId;
      }
    }

    if (!targetReportId) {
      return NextResponse.json({ error: "Could not identify reportId to unlock." }, { status: 400 });
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
      report: updatedReport,
      message: "Report unlocked successfully!"
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Stripe report unlock verification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
