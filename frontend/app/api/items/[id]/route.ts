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

    const ownerUser = await db.user.findUnique({
      where: { walletAddress: item.ownerAddress },
    });
    const ownerName = ownerUser?.fullName || ownerUser?.username || "Secured Owner";

    // If verified owner, return full record with secrets and passphrase
    if (isOwner) {
      return NextResponse.json({ ...item, ownerName }, { status: 200 });
    }

    // Masked public copy for finders/scanners (strictly excludes secrets, passphrase, and receipt)
    const publicItem = {
      registrationId: item.registrationId,
      name: item.name,
      brand: item.brand,
      serial: item.serial ? `${item.serial.substring(0, 3)}***` : null,
      ownerAddress: item.ownerAddress,
      ownerName,
      status: item.status,
      category: item.category,
      image: item.image, // Item photo is allowed publicly
      reward: item.status === "Lost" ? item.reward : null,
      contactInfo: item.status === "Lost" ? item.contactInfo : null,
      instructions: item.status === "Lost" ? item.instructions : null,
      alternateContact: item.status === "Lost" ? item.alternateContact : null,
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
