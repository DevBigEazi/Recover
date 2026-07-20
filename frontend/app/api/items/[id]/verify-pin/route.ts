import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";
import { sendNotificationEmail } from "@/lib/email";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  { params }: PageProps
) {
  try {
    const resolvedParams = await params;
    const registrationId = resolvedParams.id;
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || pin.trim() === "") {
      return NextResponse.json(
        { valid: false, message: "Please provide a PIN code to verify." },
        { status: 400 }
      );
    }

    // Fetch the item off-chain details
    const item = await db.item.findUnique({
      where: { registrationId },
      select: {
        registrationId: true,
        ownerAddress: true,
        passphrase: true,
        name: true,
        contactInfo: true,
        email: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { valid: false, message: "Item not found in registration database." },
        { status: 404 }
      );
    }

    if (!item.passphrase) {
      return NextResponse.json(
        { valid: false, message: "No handover verification PIN was configured for this item." },
        { status: 400 }
      );
    }

    const isMatch = pin.trim().toLowerCase() === item.passphrase.trim().toLowerCase();

    if (isMatch) {
      const messageText = `Handover PIN verified! A finder has successfully verified authentic ownership in-person for item "${item.name}".`;

      // 1. Log in DB notification table
      try {
        await db.notification.create({
          data: {
            ownerAddress: item.ownerAddress,
            registrationId: item.registrationId,
            type: "handover",
            message: messageText,
          },
        });
      } catch (notifErr) {
        console.error("Failed to save handover notification in DB:", notifErr);
      }

      // 2. Dispatch real-time Web Push notification to owner
      try {
        await sendPushNotification(
          item.ownerAddress,
          "Handover Confirmed! 🎉",
          messageText,
          `/items/${item.registrationId}`
        );
      } catch (pushErr) {
        console.error("Failed to send handover push notification:", pushErr);
      }

      // 3. Dispatch Email Alert if enabled
      try {
        const ownerUser = await db.user.findUnique({
          where: { walletAddress: item.ownerAddress },
        });

        const isEmailEnabled = ownerUser ? ownerUser.emailNotifications : true;
        const targetEmail =
          item.email?.trim() ||
          ownerUser?.email?.trim() ||
          (item.contactInfo && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(item.contactInfo)
            ? item.contactInfo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]
            : null);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (isEmailEnabled && targetEmail) {
          const emailSubject = `[Recover] Handover PIN Verified: ${item.name}`;
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <div style="background-color: #0EA394; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <img src="${appUrl}/icon-192.png" alt="Recover" width="60" height="60" style="margin: 0 auto 12px auto; display: block; border-radius: 12px;" />
                <h2 style="color: #ffffff; margin: 0; font-family: sans-serif; font-size: 20px;">Handover PIN Verified! 🎉</h2>
              </div>
              <div style="padding: 20px; color: #1f2937; line-height: 1.6;">
                <p>Hello Valued Owner,</p>
                <p>Great news! A finder has successfully verified your secret Handover PIN for item <strong>"${item.name}"</strong> in-person.</p>
                <p>This confirms authentic ownership during physical handover.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/items/${item.registrationId}" style="background-color: #1E2A4A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Recovery Inbox</a>
                </div>
              </div>
            </div>
          `;
          await sendNotificationEmail(targetEmail, emailSubject, emailHtml);
        }
      } catch (emailErr) {
        console.error("Failed to send handover email alert:", emailErr);
      }

      return NextResponse.json({
        valid: true,
        message: "✅ Handover Verification Successful! Verified authentic item owner.",
      });
    } else {
      return NextResponse.json(
        { valid: false, message: "❌ Invalid Handover PIN. The code entered does not match." },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("Error in verify-pin API:", err);
    return NextResponse.json(
      { valid: false, message: "An internal server error occurred while verifying the PIN." },
      { status: 500 }
    );
  }
}
