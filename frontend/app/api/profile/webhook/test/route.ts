import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawWalletAddress = request.headers.get("x-owner-address")?.trim();
    if (!rawWalletAddress) {
      return NextResponse.json(
        { error: "Authentication required. Missing x-owner-address header." },
        { status: 401 }
      );
    }

    const walletAddress = rawWalletAddress.toLowerCase();
    await connectDB();

    const user = await db.user.findOne({
      $or: [
        { _id: walletAddress },
        { _id: walletAddress.toLowerCase() },
        { _id: { $regex: new RegExp(`^${walletAddress}$`, "i") } },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "Merchant profile not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const testUrl = (body.webhookUrl || user.webhookUrl || "").trim();

    if (!testUrl) {
      return NextResponse.json(
        { error: "No webhook URL configured to test." },
        { status: 400 }
      );
    }

    if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Webhook URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const pingResponse = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Recover-Webhook-Tester/1.0",
        },
        body: JSON.stringify({
          event: "recover.ping",
          timestamp: new Date().toISOString(),
          data: {
            message: "Test ping from Recover platform to verify webhook connectivity.",
            companyName: user.companyName || user.fullName || "Merchant",
            environment: "test",
            timestamp: new Date().toISOString(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      return NextResponse.json({
        success: pingResponse.ok,
        statusCode: pingResponse.status,
        statusText: pingResponse.statusText,
        responseTimeMs,
        message: pingResponse.ok
          ? `Webhook responded successfully with status ${pingResponse.status} in ${responseTimeMs}ms.`
          : `Webhook server responded with HTTP status ${pingResponse.status} (${pingResponse.statusText}) in ${responseTimeMs}ms.`,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const msg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to ${testUrl}: ${msg}`,
          responseTimeMs,
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Test webhook failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
