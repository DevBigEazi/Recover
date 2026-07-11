import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      registrationId,
      ownerAddress,
      name,
      brand,
      serial,
      reward,
      contactInfo,
      instructions,
      itemHash,
      status,
    } = body;

    if (!registrationId || !ownerAddress || !name || !itemHash || !status) {
      return NextResponse.json(
        { error: "Missing required registration parameters." },
        { status: 400 }
      );
    }

    const item = await db.item.upsert({
      where: { registrationId: registrationId.toString() },
      update: {
        ownerAddress: ownerAddress.toLowerCase(),
        name,
        brand: brand || null,
        serial: serial || null,
        reward: reward || null,
        contactInfo: contactInfo || null,
        instructions: instructions || null,
        itemHash,
        status,
      },
      create: {
        registrationId: registrationId.toString(),
        ownerAddress: ownerAddress.toLowerCase(),
        name,
        brand: brand || null,
        serial: serial || null,
        reward: reward || null,
        contactInfo: contactInfo || null,
        instructions: instructions || null,
        itemHash,
        status,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("Failed to register item in database:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
