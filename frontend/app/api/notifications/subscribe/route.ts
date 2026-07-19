import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const ownerAddress = request.headers.get("x-owner-address")?.toLowerCase();

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "x-owner-address header is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Valid push subscription object is required." },
        { status: 400 }
      );
    }

    const savedSub = await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        ownerAddress: ownerAddress,
        keys: JSON.stringify(subscription.keys),
      },
      create: {
        endpoint: subscription.endpoint,
        ownerAddress: ownerAddress,
        keys: JSON.stringify(subscription.keys),
      },
    });

    return NextResponse.json(savedSub, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to register push subscription:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
