import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;

    // Verify item existence and owner address
    const item = await db.item.findUnique({
      where: { registrationId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    if (requestOwner !== item.ownerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized access: Only the verified owner can view reports." },
        { status: 403 }
      );
    }

    const reports = await db.finderReport.findMany({
      where: { registrationId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports, { status: 200 });
  } catch (err: any) {
    console.error("Failed to list reports for item:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
