import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const shipment = await db.shipment.findById(id);

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    return NextResponse.json({
      packageId: shipment.packageId,
      shipperAddress: shipment.shipperAddress,
      status: shipment.status,
      metadata: shipment.metadata,
      events: shipment.events,
      webhookUrl: shipment.webhookUrl,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch shipment history:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
