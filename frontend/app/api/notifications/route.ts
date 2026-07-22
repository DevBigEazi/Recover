import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const ownerAddress = request.headers.get("x-owner-address")?.toLowerCase();

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "x-owner-address header is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const notifications = await db.notification.find({ ownerAddress: ownerAddress }).sort({ createdAt: -1 });

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

    await connectDB();

    await db.notification.updateMany(
      {
        ownerAddress: ownerAddress,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to mark notifications as read:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
