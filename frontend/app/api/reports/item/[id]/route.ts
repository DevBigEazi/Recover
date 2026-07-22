import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;

    await connectDB();

    // Verify item existence and owner address
    const item = await db.item.findOne({
      _id: id,
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

    const reports = await db.finderReport.find({
      registrationId: id,
    }).sort({ createdAt: -1 });

    return NextResponse.json(reports, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to list reports for item:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
