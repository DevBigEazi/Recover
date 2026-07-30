import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

const PRICES: Record<string, { Phone: number; Other: number }> = {
  NGN: { Phone: 5000, Other: 2000 },
  GHS: { Phone: 150, Other: 60 },
  KES: { Phone: 1500, Other: 600 },
  ZAR: { Phone: 250, Other: 100 },
  USD: { Phone: 10, Other: 4 }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId, reference, currency = "USD" } = body;

    if (!reportId || !reference) {
      return NextResponse.json(
        { error: "reportId and reference are required parameters." },
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

    // 3. Determine expected price
    const upperCurrency = String(currency).toUpperCase();
    const pricing = PRICES[upperCurrency] || PRICES.USD;
    const isPhone = item.category === "Phone";
    const expectedAmount = isPhone ? pricing.Phone : pricing.Other;

    // 4. Verification Check
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("Missing PAYSTACK_SECRET_KEY in environment variables.");
      return NextResponse.json(
        { error: "Payment verification configuration is missing on the server." },
        { status: 500 }
      );
    }

    // Real Paystack verification
    try {
      const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
      const response = await fetch(verifyUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Paystack verification API returned status ${response.status}`);
      }

      const verifyData = await response.json();
      if (!verifyData.status || verifyData.data.status !== "success") {
        return NextResponse.json(
          { error: "Payment verification failed. Transaction was not successful." },
          { status: 400 }
        );
      }

      const paidAmount = verifyData.data.amount / 100; // Paystack returns amount in kobo/cents
      const paidCurrency = String(verifyData.data.currency).toUpperCase();

      // Validate currency and amount (accepting a small buffer or exact match)
      if (paidCurrency !== upperCurrency) {
        return NextResponse.json(
          { error: `Currency mismatch. Expected ${upperCurrency}, got ${paidCurrency}.` },
          { status: 400 }
        );
      }

      if (paidAmount < expectedAmount) {
        return NextResponse.json(
          { error: `Insufficient payment amount. Paid ${paidAmount} ${paidCurrency}, expected ${expectedAmount} ${upperCurrency}.` },
          { status: 400 }
        );
      }

      // Update report status to unlocked in MongoDB
      const updatedReport = await db.finderReport.findOneAndUpdate(
        { _id: reportId },
        { $set: { unlocked: true } },
        { new: true }
      );

      // Set unlockedForCurrentLostCycle = true on the item so all subsequent reports in this cycle are unlocked
      await db.item.updateOne(
        { _id: report.registrationId },
        { $set: { unlockedForCurrentLostCycle: true } }
      );

      return NextResponse.json({
        success: true,
        message: "Report unlocked successfully.",
        report: updatedReport
      }, { status: 200 });

    } catch (paystackErr) {
      console.error("Paystack verification error:", paystackErr);
      return NextResponse.json(
        { error: "Failed to verify transaction with payment provider." },
        { status: 502 }
      );
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to unlock report:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
