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
    const { reportId, currency = "USD" } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: "reportId is a required parameter." },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("Missing PAYSTACK_SECRET_KEY in environment variables.");
      return NextResponse.json(
        { error: "Payment configuration is missing on the server." },
        { status: 500 }
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

    // 4. Load owner/user details for email
    const ownerUser = await db.user.findOne({ _id: item.ownerAddress });
    const userEmail = ownerUser?.email || `owner_${item.ownerAddress.substring(0, 8)}@recover.id`;

    // 5. Call Paystack Initialize Transaction API
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: userEmail,
        amount: expectedAmount * 100, // Smallest unit
        currency: upperCurrency,
        metadata: {
          reportId,
          registrationId: item._id,
          category: item.category
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paystack initialize API returned status ${response.status}: ${errorText}`);
    }

    const resData = await response.json();
    if (!resData.status || !resData.data?.access_code) {
      return NextResponse.json(
        { error: "Failed to initialize payment transaction with Paystack." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      access_code: resData.data.access_code,
      reference: resData.data.reference
    }, { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to initialize payment:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
