import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { shipper: merchant, error, status } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json(
        { error: error || "Unauthorized merchant access." },
        { status: status || 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const amountSettled = body.amountSettled !== undefined ? Number(body.amountSettled) : null;
    const settlementNotes = body.notes ? String(body.notes).trim() : null;

    const receipt = await db.receipt.findById(id);
    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (receipt.merchantAddress.toLowerCase() !== merchant._id.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized: only the issuing merchant can settle this credit receipt." },
        { status: 403 }
      );
    }

    if (receipt.status === "Voided") {
      return NextResponse.json(
        { error: "Cannot record settlement on a voided receipt." },
        { status: 400 }
      );
    }

    if (receipt.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This receipt has already been settled in full." },
        { status: 400 }
      );
    }

    const currentPaid = receipt.amountPaid || 0;
    const remainingBalance = Math.max(0, receipt.total - currentPaid);

    const paymentIncrement =
      amountSettled !== null && !isNaN(amountSettled) && amountSettled > 0
        ? Math.min(amountSettled, remainingBalance)
        : remainingBalance;

    const newAmountPaid = currentPaid + paymentIncrement;
    const isFullyPaid = newAmountPaid >= receipt.total;

    receipt.amountPaid = newAmountPaid;
    receipt.paymentStatus = isFullyPaid ? "paid" : "partially_paid";
    if (isFullyPaid) {
      receipt.creditSettledAt = new Date();
    }
    if (settlementNotes) {
      receipt.creditNotes = receipt.creditNotes
        ? `${receipt.creditNotes} | Settled: ${settlementNotes}`
        : settlementNotes;
    }

    await receipt.save();

    return NextResponse.json({
      success: true,
      message: isFullyPaid
        ? "Customer debt settled in full."
        : `Partial payment of ₦${paymentIncrement.toLocaleString()} recorded. Remaining balance: ₦${Math.max(0, receipt.total - newAmountPaid).toLocaleString()}.`,
      receipt,
      isFullyPaid,
      remainingBalance: Math.max(0, receipt.total - newAmountPaid),
    });
  } catch (err: unknown) {
    console.error("Credit settlement API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
