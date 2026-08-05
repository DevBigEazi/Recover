import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    await connectDB();

    let targetShipperAddress = searchParams.get("shipperAddress")?.toLowerCase();

    if (apiKeyToken) {
      const shipper = await db.user.findOne({ apiKey: apiKeyToken });
      if (!shipper) {
        return NextResponse.json({ error: "Invalid or unauthorized API key provided." }, { status: 401 });
      }
      targetShipperAddress = shipper._id.toLowerCase();
    }

    if (!targetShipperAddress) {
      return NextResponse.json({ error: "API key or shipperAddress parameter is required" }, { status: 400 });
    }

    const limitParam = parseInt(searchParams.get("limit") || "100", 10);
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 100 : limitParam), 500);
    const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
    const skip = (page - 1) * limit;

    const shipments = await db.shipment
      .find({ shipperAddress: targetShipperAddress })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Auto-heal missing innerSecret fields on legacy shipment documents
    for (const shipment of shipments) {
      if (!shipment.innerSecret) {
        const cleanId = shipment._id.replace(/^0x/i, "").slice(0, 8).toUpperCase();
        shipment.innerSecret = `RCVR-${cleanId}`;
        await shipment.save();
      }
    }

    return NextResponse.json(shipments);
  } catch (error: unknown) {
    console.error("Failed to fetch shipments:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch shipments";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
