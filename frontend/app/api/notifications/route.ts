import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const ownerAddress = request.headers.get("x-owner-address")?.toLowerCase();

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "x-owner-address header is required." },
        { status: 400 }
      );
    }

    const notifications = await db.notification.findMany({
      where: { ownerAddress: ownerAddress },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to list notifications:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerAddress = request.headers.get("x-owner-address")?.toLowerCase();

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "x-owner-address header is required." },
        { status: 400 }
      );
    }

    await db.notification.updateMany({
      where: {
        ownerAddress: ownerAddress,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to mark notifications as read:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
