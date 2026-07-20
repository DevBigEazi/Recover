import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, message, contactInfo, location, photo } = body;

    if (!registrationId || !message) {
      return NextResponse.json(
        { error: "registrationId and message are required." },
        { status: 400 }
      );
    }

    // Fetch corresponding item to verify existence and retrieve owner contact info
    const item = await db.item.findUnique({
      where: { registrationId: registrationId.toString() },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in registry." },
        { status: 404 }
      );
    }

    // Rate-limiting check: restrict reports for this item in the last 60 seconds
    const recentReport = await db.finderReport.findFirst({
      where: {
        registrationId: registrationId.toString(),
        createdAt: {
          gte: new Date(Date.now() - 60000), // last 60 seconds
        },
      },
    });

    if (recentReport) {
      return NextResponse.json(
        { error: "You are submitting reports too quickly. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    // Save report to database
    const report = await db.finderReport.create({
      data: {
        registrationId: registrationId.toString(),
        message,
        contactInfo: contactInfo || null,
        location: location || null,
        photo: photo || null,
      },
    });

    const messageText = `New found report submitted for your item "${item.name}".`;

    // 1. Log in-app notification in DB
    await db.notification.create({
      data: {
        ownerAddress: item.ownerAddress,
        registrationId: item.registrationId,
        type: "report",
        message: messageText,
      },
    });

    // 2. Fetch owner preferences
    const ownerUser = await db.user.findUnique({
      where: { walletAddress: item.ownerAddress },
    });

    const isEmailEnabled = ownerUser ? ownerUser.emailNotifications : true;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 3. Dispatch Email Notification
    if (isEmailEnabled && item.contactInfo) {
      const emailSubject = `[Recover] Found Report for Item #${item.registrationId}: ${item.name}`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="background-color: #1E2A4A; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <img src="${appUrl}/icon-192.png" alt="Recover" width="60" height="60" style="margin: 0 auto 12px auto; display: block; border-radius: 12px;" />
            <h2 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 20px;">Item Found Alert</h2>
          </div>
          <div style="padding: 20px; color: #1f2937; line-height: 1.6;">
            <p>Hello Valued Owner,</p>
            <p>Someone has scanned your QR sticker and submitted a found report for your item: <strong>"${item.name}"</strong>.</p>
            
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1e2a4a;">Finder Message:</h4>
              <p style="font-style: italic; white-space: pre-wrap;">"${message}"</p>
              
              <h4 style="color: #1e2a4a; margin-bottom: 5px;">Finder Contact Details:</h4>
              <p>${contactInfo || "None provided"}</p>
              
              <h4 style="color: #1e2a4a; margin-bottom: 5px;">Location coordinate shared:</h4>
              <p>${location || "None provided"}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/items/${item.registrationId}" style="background-color: #0EA394; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Recovery Inbox</a>
            </div>
            <p style="font-size: 11px; color: #6b7280; margin-top: 30px;">
              You received this alert because notification updates are enabled on your Recover profile settings page.
            </p>
          </div>
        </div>
      `;

      await sendNotificationEmail(item.contactInfo, emailSubject, emailHtml);
    }

    // 4. Dispatch Web Push Alert
    await sendPushNotification(
      item.ownerAddress,
      "New Found Report!",
      messageText,
      `/items/${item.registrationId}`
    );

    return NextResponse.json(report, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to submit finder report:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
