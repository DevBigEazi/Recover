import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawId = (id || "").trim();

    if (!rawId) {
      return NextResponse.json({ error: "Shipment ID or tracking code is required." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const sizeParam = parseInt(searchParams.get("size") || "300", 10);
    const size = isNaN(sizeParam) || sizeParam < 50 || sizeParam > 1000 ? 300 : sizeParam;

    // Search in live shipments or test sandbox shipments
    const query = {
      $or: [
        { trackingCode: { $regex: new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { _id: rawId.toLowerCase() },
      ],
    };

    let shipment = await db.shipment.findOne(query);
    if (!shipment) {
      shipment = await db.testShipment.findOne(query);
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    const trackingCode = shipment.trackingCode || rawId;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://userecover.xyz";
    const scanUrl = `${appBaseUrl}/shipments/${trackingCode}/verify`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(scanUrl)}`;
    const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&format=svg&data=${encodeURIComponent(scanUrl)}`;

    if (format === "png" || format === "image") {
      return NextResponse.redirect(qrImageUrl, { status: 307 });
    }

    if (format === "svg") {
      const svgRes = await fetch(qrSvgUrl);
      if (svgRes.ok) {
        const svgContent = await svgRes.text();
        return new Response(svgContent, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
      return NextResponse.redirect(qrSvgUrl, { status: 307 });
    }

    return NextResponse.json({
      success: true,
      trackingCode,
      packageId: shipment._id,
      status: shipment.status,
      scanUrl,
      qrImageUrl,
      qrSvgUrl,
      caption: "This item/package is tracked on Recover. If found or handling, scan to verify status.",
      formatOptions: {
        png: `${appBaseUrl}/api/v1/shipments/${trackingCode}/qr?format=png&size=${size}`,
        svg: `${appBaseUrl}/api/v1/shipments/${trackingCode}/qr?format=svg&size=${size}`,
        json: `${appBaseUrl}/api/v1/shipments/${trackingCode}/qr?format=json&size=${size}`,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/v1/shipments/[id]/qr:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate QR code.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
