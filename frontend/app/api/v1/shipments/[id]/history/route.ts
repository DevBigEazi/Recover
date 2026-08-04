import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    await connectDB();

    if (apiKeyToken) {
      const apiKeyUser = await db.user.findOne({ apiKey: apiKeyToken });
      if (!apiKeyUser) {
        return NextResponse.json({ error: "Invalid or unauthorized API key provided." }, { status: 401 });
      }
    }

    const cleanId = id.replace(/^RCV-/i, "").replace(/^PKG-/i, "");
    const shipment = await db.shipment.findOne({
      $or: [
        { _id: id },
        { _id: id.toLowerCase() },
        { _id: { $regex: new RegExp(`^0x${cleanId}`, "i") } },
      ],
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }



    // Look up the shipper's company name
    const shipperUser = await db.user.findOne({ _id: shipment.shipperAddress });
    const shipperCompanyName = shipperUser?.companyName || "Logistics Provider";

    return NextResponse.json({
      packageId: shipment.packageId,
      shipperAddress: shipment.shipperAddress,
      shipperCompanyName,
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
