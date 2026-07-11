import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    const items = await db.item.findMany({
      where: { ownerAddress: ownerAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items, { status: 200 });
  } catch (err: any) {
    console.error("Failed to list items for owner:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
