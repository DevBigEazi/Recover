import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";
import crypto from "crypto";

// In-memory rate limiting & lockout store (per item and per IP)
type AttemptRecord = { count: number; expiresAt: number };
const pinAttemptsMap = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = pinAttemptsMap.get(key);
  if (!record || record.expiresAt < now) {
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = pinAttemptsMap.get(key);
  if (!record || record.expiresAt < now) {
    pinAttemptsMap.set(key, { count: 1, expiresAt: now + LOCKOUT_WINDOW_MS });
  } else {
    record.count += 1;
  }
}

function clearRateLimit(key: string): void {
  pinAttemptsMap.delete(key);
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

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

    // Rate limiting check per-item and per-IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const itemKey = `item:${registrationId}`;
    const ipKey = `ip:${ip}:${registrationId}`;

    if (!checkRateLimit(itemKey) || !checkRateLimit(ipKey)) {
      return NextResponse.json(
        { valid: false, message: "Too many failed PIN attempts. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    if (!pin || typeof pin !== "string" || pin.trim() === "") {
      return NextResponse.json(
        { valid: false, message: "Please provide a PIN code to verify." },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the item off-chain details
    const item = await db.item.findOne(
      { _id: registrationId },
      "registrationId ownerAddress passphrase name contactInfo email"
    );

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

    const isMatch = safeCompare(pin.trim().toLowerCase(), item.passphrase.trim().toLowerCase());

    if (isMatch) {
      const messageText = `Handover PIN verified! A finder has successfully verified authentic ownership in-person for item "${item.name}".`;

      // 1. Log in DB notification table
      try {
        await db.notification.create({
          _id: crypto.randomUUID(),
          ownerAddress: item.ownerAddress,
          registrationId: item.registrationId || "",
          type: "handover",
          message: messageText,
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
      clearRateLimit(itemKey);
      clearRateLimit(ipKey);

      return NextResponse.json({
        valid: true,
        message: "✅ Handover Verification Successful! Verified authentic item owner.",
      });
    } else {
      recordFailedAttempt(itemKey);
      recordFailedAttempt(ipKey);

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
