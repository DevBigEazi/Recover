import webpush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:support@recover.id";

let isVapidSet = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
    isVapidSet = true;
  } catch (err) {
    console.error("Failed to configure Web Push VAPID details:", err);
  }
} else {
  console.warn(
    "⚠️ Web Push VAPID keys are missing. Push notifications cannot be sent in real-time. " +
    "Please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local"
  );
}

export async function sendPushNotification(
  ownerAddress: string,
  title: string,
  body: string,
  url: string
): Promise<boolean> {
  if (!isVapidSet) {
    console.error("❌ Cannot send push notification: VAPID keys not configured.");
    return false;
  }

  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { ownerAddress: ownerAddress.toLowerCase() },
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user: ${ownerAddress}`);
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const iconUrl = `${appUrl}/icon-192.png`;

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: iconUrl,
      badge: iconUrl,
    });
    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        const subKeys = JSON.parse(sub.keys);
        const pushSubscriptionObj = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: subKeys.p256dh,
            auth: subKeys.auth,
          },
        };

        await webpush.sendNotification(pushSubscriptionObj, payload);
        successCount++;
      } catch (err: unknown) {
        // If status is 410 (Gone) or 404 (Not Found), the subscription is no longer valid
        const statusCode = (err && typeof err === "object" && "statusCode" in err) ? (err.statusCode as number) : 0;
        if (statusCode === 410 || statusCode === 404) {
          console.log(`Push subscription expired/invalid. Removing endpoint: ${sub.endpoint}`);
          await db.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
        } else {
          console.error(`Failed to send push alert to endpoint ${sub.endpoint}:`, err);
        }
      }
    }

    console.log(`Successfully sent push notifications to ${successCount}/${subscriptions.length} active sessions.`);
    return successCount > 0;
  } catch (error) {
    console.error("Error broadcasting push notifications:", error);
    return false;
  }
}
