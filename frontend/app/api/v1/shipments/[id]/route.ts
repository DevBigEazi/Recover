import { NextResponse } from "next/server";
import { getShipperFromApiKey } from "@/lib/auth-api";
import { db, connectDB } from "@/lib/db";
import { buildShipmentIdFilter } from "@/lib/shipment-lookup";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      packageName,
      receiverName,
      receiverPhone,
      destination,
      weight,
      webhookUrl,
      metadata,
    } = body;

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;
    const xOwnerAddress = request.headers.get("x-owner-address");

    const authResult = await getShipperFromApiKey(apiKeyToken, xOwnerAddress);
    if (!authResult.shipper) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized API key or owner session required." },
        { status: authResult.status || 401 }
      );
    }

    const authenticatedShipper = authResult.shipper;
    const isTestKey = authResult.isTest;

    const idFilter = buildShipmentIdFilter(id, true);

    let isTestShipment = false;
    let shipment = await db.testShipment.findOne({ $or: idFilter });
    if (shipment) {
      isTestShipment = true;
    } else {
      shipment = await db.shipment.findOne({ $or: idFilter });
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Verify creator authorization
    const isCreator = authenticatedShipper._id.toLowerCase() === shipment.shipperAddress.toLowerCase();
    if (!isCreator) {
      return NextResponse.json(
        { error: "Only the package creator can edit shipment details." },
        { status: 403 }
      );
    }

    // Prevent modifying sandbox with live key or vice-versa
    if (isTestKey && !isTestShipment) {
      return NextResponse.json(
        { error: "Test Sandbox API keys cannot modify live production shipments." },
        { status: 403 }
      );
    }

    // Check shipment status
    if (shipment.status === "Verified" || shipment.status === "Disputed") {
      return NextResponse.json(
        { error: `Cannot edit package details. Shipment is already '${shipment.status}'.` },
        { status: 409 }
      );
    }

    // Validate receiverPhone if provided in edit payload
    const updatedReceiverPhone = receiverPhone !== undefined
      ? receiverPhone
      : metadata?.receiverPhone;

    if (updatedReceiverPhone !== undefined && (!updatedReceiverPhone || !String(updatedReceiverPhone).trim())) {
      return NextResponse.json(
        { error: "receiverPhone cannot be empty." },
        { status: 400 }
      );
    }

    const existingMetadata = shipment.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...(packageName !== undefined ? { name: packageName } : {}),
      ...(receiverName !== undefined ? { receiverName } : {}),
      ...(updatedReceiverPhone !== undefined ? { receiverPhone: String(updatedReceiverPhone).trim() } : {}),
      ...(destination !== undefined ? { destination } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(metadata || {}),
    };

    shipment.metadata = updatedMetadata;
    if (webhookUrl !== undefined) {
      shipment.webhookUrl = webhookUrl || null;
    }

    shipment.events.push({
      event: "MetadataUpdated",
      operator: authenticatedShipper._id,
      timestamp: new Date(),
    });

    await shipment.save();

    return NextResponse.json({
      success: true,
      shipment,
    });
  } catch (error: unknown) {
    console.error("Failed to update shipment:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to edit shipment details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
