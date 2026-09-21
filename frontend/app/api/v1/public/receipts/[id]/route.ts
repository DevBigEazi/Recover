import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const cleanId = id.trim();

    const receipt = await db.receipt.findById(cleanId).lean();
    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    // Lookup merchant business info
    const merchantUser = await db.user.findById(receipt.merchantAddress.toLowerCase()).lean();
    const merchantName = merchantUser?.companyName || merchantUser?.fullName || "Verified Merchant";

    // Public sanitized receipt record (exclude customer phone/email from public responses)
    const publicReceipt = {
      receiptNumber: receipt._id,
      merchantName,
      merchantAddress: receipt.merchantAddress,
      items: receipt.items,
      currency: receipt.currency || "NGN",
      subtotal: receipt.subtotal,
      discount: receipt.discount || 0,
      tax: receipt.tax || 0,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      fulfillmentType: receipt.fulfillmentType,
      linkedShipmentId: receipt.linkedShipmentId,
      status: receipt.status,
      voidReason: receipt.voidReason,
      voidedAt: receipt.voidedAt,
      parentReceiptNumber: receipt.parentReceiptNumber,
      receiptHash: receipt.receiptHash,
      onChainTxHash: receipt.onChainTxHash,
      onChainTimestamp: receipt.onChainTimestamp,
      createdAt: receipt.createdAt,
    };

    return NextResponse.json({
      success: true,
      receipt: publicReceipt,
    });
  } catch (err: unknown) {
    console.error("Public receipt error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
