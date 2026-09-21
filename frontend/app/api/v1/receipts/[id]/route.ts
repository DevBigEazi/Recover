import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { shipper: merchant, error, status } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { id } = await params;
    const receipt = await db.receipt.findById(id);

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (receipt.merchantAddress.toLowerCase() !== merchant._id.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized access to this receipt." }, { status: 403 });
    }

    let linkedShipment = null;
    if (receipt.linkedShipmentId) {
      linkedShipment = await db.shipment.findById(receipt.linkedShipmentId);
    }

    return NextResponse.json({
      success: true,
      receipt,
      linkedShipment,
    });
  } catch (err: unknown) {
    console.error("Receipt detail error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
