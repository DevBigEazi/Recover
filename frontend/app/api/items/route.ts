import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get("ownerAddress");

    if (!ownerAddress) {
      return NextResponse.json(
        { error: "ownerAddress query parameter is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const items = await db.item.find({ ownerAddress: ownerAddress.toLowerCase() }).sort({ createdAt: -1 });

    return NextResponse.json(items, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to list items for owner:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
