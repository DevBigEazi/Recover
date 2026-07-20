import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
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

    const item = await db.item.findUnique({
      where: { registrationId: registrationId.toString() },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in registry." }, { status: 404 });
    }

    // 1. Deduplication check: check if the item has been scanned in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    const recentScan = await db.notification.findFirst({
      where: {
        registrationId: registrationId.toString(),
        type: "scan",
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    });

    if (recentScan) {
      console.log(`Scan notification for item #${registrationId} deduplicated (ignored).`);
      return NextResponse.json({ message: "Scan deduplicated." }, { status: 200 });
    }

    const messageText = `Your item "${item.name}" QR sticker was scanned by a finder.`;

    // 2. Create in-app notification in DB
    const notification = await db.notification.create({
      data: {
        ownerAddress: item.ownerAddress,
        registrationId: item.registrationId,
        type: "scan",
        message: messageText,
      },
    });

    // 3. Retrieve user profile details to check email preferences
    const ownerUser = await db.user.findUnique({
      where: { walletAddress: item.ownerAddress },
    });

    const isEmailEnabled = ownerUser ? ownerUser.emailNotifications : true;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const targetEmail = item.email || ownerUser?.email || (item.contactInfo && item.contactInfo.includes("@") ? item.contactInfo : null);

    // 4. Send Email Alert in Real-Time if enabled
    if (isEmailEnabled && targetEmail) {
      const emailSubject = `[Recover] Item QR Sticker Scanned: ${item.name}`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="background-color: #1E2A4A; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <img src="${appUrl}/icon-192.png" alt="Recover" width="60" height="60" style="margin: 0 auto 12px auto; display: block; border-radius: 12px;" />
            <h2 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 20px;">QR Code Scan Alert</h2>
          </div>
          <div style="padding: 20px; color: #1f2937; line-height: 1.6;">
            <p>Hello,</p>
            <p>Someone has scanned the physical QR sticker attached to your item: <strong>${item.name}</strong>.</p>
            <p>If you did not scan this yourself, someone may have found your item. Please open your dashboard to verify reports or coordinate a return.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/items/${item.registrationId}" style="background-color: #0EA394; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Recovery Inbox</a>
            </div>
            <p style="font-size: 11px; color: #6b7280; margin-top: 30px;">
              You received this alert because notification updates are enabled on your Recover profile settings page.
            </p>
          </div>
        </div>
      `;
      // Dispatches real-time email (falls back to console warning if Resend key is missing)
      await sendNotificationEmail(targetEmail, emailSubject, emailHtml);
    }

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
