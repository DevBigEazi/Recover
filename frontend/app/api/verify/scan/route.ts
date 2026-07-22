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

    if (!item) {
      return NextResponse.json({ error: "Item not found in registry." }, { status: 404 });
    }

    // 1. Deduplication check: check if the item has been scanned in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    const recentScan = await db.notification.findOne({
      registrationId: registrationId.toString(),
      type: "scan",
      createdAt: {
        $gte: fiveMinutesAgo,
      },
    });

    if (recentScan) {
      console.log(`Scan notification for item #${registrationId} deduplicated (ignored).`);
      return NextResponse.json({ message: "Scan deduplicated." }, { status: 200 });
    }

    const messageText = `Your item "${item.name}" QR sticker was scanned by a finder.`;

    // 2. Create in-app notification in DB
    const notification = await db.notification.create({
      _id: crypto.randomUUID(),
      ownerAddress: item.ownerAddress,
      registrationId: item.registrationId || "",
      type: "scan",
      message: messageText,
    });



    // 5. Broadcast Web Push Alert in Real-Time
    await sendPushNotification(
      item.ownerAddress,
      "Item Sticker Scanned!",
      messageText,
      `/items/${item.registrationId}`
    );

    return NextResponse.json(notification, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to log scan notification:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
