import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import crypto from "node:crypto";
import { sendPushNotification } from "@/lib/push";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await db.item.findOne({
      _id: registrationId.toString(),
    });

    let targetOwnerAddress = "";
    let targetRegistrationId = "";
    let notificationType = "scan";
    let titleText = "Item Sticker Scanned!";
    let messageText = "";
    let targetUrl = "";

    if (item) {
      targetOwnerAddress = item.ownerAddress;
      targetRegistrationId = item.registrationId || item._id;
      notificationType = "scan";
      titleText = "Item Sticker Scanned!";
      messageText = `Your item "${item.name}" QR sticker was scanned by a finder.`;
      targetUrl = `/items/${targetRegistrationId}`;
    } else {
      const cleanId = registrationId.toString().replace(/^RCV-/i, "").replace(/^PKG-/i, "");
      const shipment = await db.shipment.findOne({
        $or: [
          { _id: registrationId.toString() },
          { _id: registrationId.toString().toLowerCase() },
          { _id: { $regex: new RegExp(`^0x${cleanId}`, "i") } },
        ],
      });

      if (!shipment) {
        return NextResponse.json({ error: "Item or package not found in registry." }, { status: 404 });
      }

      const cleanPkgId = shipment._id.startsWith("0x") ? shipment._id.slice(2) : shipment._id;
      const trackingCode = `RCV-${cleanPkgId.slice(0, 12).toUpperCase()}`;
      const packageName = (shipment.metadata?.name as string) || "General Package";

      targetOwnerAddress = shipment.shipperAddress;
      targetRegistrationId = trackingCode;
      notificationType = "shipment_scan";
      titleText = "Package QR Scanned 📱";
      messageText = `Package "${packageName}" (${trackingCode}) QR sticker was scanned by a rider or recipient.`;
      targetUrl = `/shipments/${trackingCode}`;
    }

    // 1. Deduplication check: check if scanned in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    const recentScan = await db.notification.findOne({
      registrationId: targetRegistrationId,
      type: notificationType,
      createdAt: {
        $gte: fiveMinutesAgo,
      },
    });

    if (recentScan) {
      console.log(`Scan notification for #${targetRegistrationId} deduplicated (ignored).`);
      return NextResponse.json({ message: "Scan deduplicated." }, { status: 200 });
    }

    // 2. Create in-app notification in DB
    const notification = await db.notification.create({
      _id: crypto.randomUUID(),
      ownerAddress: targetOwnerAddress.toLowerCase(),
      registrationId: targetRegistrationId,
      type: notificationType,
      message: messageText,
    });

    // 3. Broadcast Web Push Alert in Real-Time
    await sendPushNotification(
      targetOwnerAddress.toLowerCase(),
      titleText,
      messageText,
      targetUrl
    );

    return NextResponse.json(notification, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to log scan notification:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
