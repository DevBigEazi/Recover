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

    // Check cookie-based session token if present
    const cookieHeader = request.headers.get("cookie");
    const authTokenFromCookie = cookieHeader
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("auth_token="))
      ?.split("=")[1];

    const apiKeyToken = bearerToken || xApiKeyHeader || authTokenFromCookie;

    if (!apiKeyToken) {
      return NextResponse.json(
        { error: "Authentication required. A valid API key or verified session token is required to modify shipment details." },
        { status: 401 }
      );
    }

    const authResult = await getShipperFromApiKey(apiKeyToken);
    if (!authResult.shipper) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized API key or session token provided." },
        { status: authResult.status || 401 }
      );
    }

    const xOwnerAddress = request.headers.get("x-owner-address");
    if (xOwnerAddress && authResult.shipper._id.toLowerCase() !== xOwnerAddress.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Forbidden: x-owner-address header does not match authenticated credentials." },
        { status: 403 }
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
      ...(destination !== undefined ? { destination } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(metadata || {}),
      ...(updatedReceiverPhone !== undefined ? { receiverPhone: String(updatedReceiverPhone).trim() } : {}),
    };

    shipment.metadata = updatedMetadata;
    if (webhookUrl !== undefined) {
      shipment.webhookUrl = webhookUrl || null;
    }

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
