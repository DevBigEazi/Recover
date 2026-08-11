import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { getShipperFromApiKey } from "@/lib/auth-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    await connectDB();

    const authResult = await getShipperFromApiKey(
      apiKeyToken,
      request.headers.get("x-owner-address") || searchParams.get("shipperAddress")
    );
    if (!authResult.shipper) {
      return NextResponse.json(
        { error: authResult.error || "Invalid or unauthorized API key provided." },
        { status: authResult.status || 401 }
      );
    }
    const targetShipperAddress = authResult.shipper._id.toLowerCase();
    const isTest = authResult.isTest;

    const limitParam = parseInt(searchParams.get("limit") || "100", 10);
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 100 : limitParam), 500);
    const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
    const skip = (page - 1) * limit;

    const shipmentModel = isTest ? db.testShipment : db.shipment;

    const shipments = await shipmentModel
      .find({ shipperAddress: targetShipperAddress })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json(shipments);
  } catch (error: unknown) {
    console.error("Failed to fetch shipments:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch shipments";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
