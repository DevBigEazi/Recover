import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const item = await db.item.findUnique({
      where: { registrationId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check request header for auth verification
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    const isOwner = requestOwner === item.ownerAddress.toLowerCase();

    // If owner or item is reported lost, expose details. Otherwise, mask.
    if (isOwner || item.status === "Lost") {
      return NextResponse.json(item, { status: 200 });
    }

    // Masked public copy
    const publicItem = {
      registrationId: item.registrationId,
      name: item.name,
      brand: item.brand,
      serial: item.serial ? `${item.serial.substring(0, 3)}***` : null,
      ownerAddress: item.ownerAddress,
      status: item.status,
      reward: null,
      contactInfo: null,
      instructions: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    return NextResponse.json(publicItem, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to fetch item details:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
