import { NextResponse } from "next/server";
import { getShipperFromApiKey } from "@/lib/auth-api";
import { db, connectDB } from "@/lib/db";
import { buildShipmentIdFilter } from "@/lib/shipment-lookup";

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

    const xOwnerAddress = request.headers.get("x-owner-address");
    if (apiKeyToken || xOwnerAddress) {
      const authResult = await getShipperFromApiKey(apiKeyToken, xOwnerAddress);
      if (!authResult.shipper) {
        return NextResponse.json({ error: authResult.error || "Invalid or unauthorized API key provided." }, { status: authResult.status || 401 });
      }
    }

    const idFilter = buildShipmentIdFilter(id, false);

    let shipment = await db.testShipment.findOne({ $or: idFilter });
    if (!shipment) {
      shipment = await db.shipment.findOne({ $or: idFilter });
    }

    if (!shipment || (!shipment.innerSecret && !shipment.innerSecretHash)) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }



    const url = new URL(request.url);
    const pinParam = url.searchParams.get("pin");

    // Look up the shipper's company name
    const shipperUser = await db.user.findOne({ _id: shipment.shipperAddress });
    const shipperCompanyName = shipperUser?.companyName || "Logistics Provider";

    const shipmentObj = typeof shipment.toObject === "function" ? shipment.toObject() : shipment;
    const rawMetadata = { ...(shipmentObj.metadata || {}) } as Record<string, unknown>;
    delete rawMetadata.courierPin;

    const storedCourierPin = shipmentObj.metadata?.courierPin as string | undefined;
    const isCourierAuthorized = Boolean(
      pinParam && storedCourierPin && pinParam.trim() === storedCourierPin.trim()
    );

    const riderInfo = {
      name: (rawMetadata.riderName as string) || null,
      phone: isCourierAuthorized ? ((rawMetadata.riderPhone as string) || null) : null,
      plateNumber: (rawMetadata.riderPlateNumber as string) || null,
    };

    const sanitizedMetadata = isCourierAuthorized ? rawMetadata : {
      ...rawMetadata,
      receiverName: undefined,
      receiverPhone: undefined,
      destination: undefined,
      riderPhone: undefined,
    };

    const cleanId = id.trim().replace(/^RCV-/i, "").replace(/^RCVR-/i, "").replace(/^PKG-/i, "").replace(/^0x/i, "");
    const effectiveTrackingCode = shipment.trackingCode || `RCV-${cleanId.slice(0, 12).toUpperCase()}`;

    return NextResponse.json({
      trackingCode: effectiveTrackingCode,
      onChainId: shipment._id,
      packageId: shipment._id,
      shipperAddress: shipment.shipperAddress,
      shipperCompanyName,
      status: shipment.status,
      metadata: sanitizedMetadata,
      events: shipment.events,
      webhookUrl: shipment.webhookUrl,
      isCourierAuthorized,
      riderInfo,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch shipment history:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch history";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
