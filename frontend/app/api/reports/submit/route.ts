import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, message, contactInfo, location, photo } = body;

    if (!registrationId || !message) {
      return NextResponse.json(
        { error: "registrationId and message are required." },
        { status: 400 }
      );
    }

    // Fetch corresponding item to verify existence and retrieve owner contact info
    const item = await db.item.findUnique({
      where: { registrationId: registrationId.toString() },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in registry." },
        { status: 404 }
      );
    }

    // Rate-limiting check: restrict reports for this item in the last 60 seconds
    const recentReport = await db.finderReport.findFirst({
      where: {
        registrationId: registrationId.toString(),
        createdAt: {
          gte: new Date(Date.now() - 60000), // last 60 seconds
        },
      },
    });

    if (recentReport) {
      return NextResponse.json(
        { error: "You are submitting reports too quickly. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    // Save report to database
    const report = await db.finderReport.create({
      data: {
        registrationId: registrationId.toString(),
        message,
        contactInfo: contactInfo || null,
        location: location || null,
        photo: photo || null,
      },
    });

    // Simulate Notification Dispatch (PRD Email alert)
    if (item.contactInfo) {
      console.log(`
=========================================
📧 EMAIL DISPATCH NOTIFICATION
=========================================
To: ${item.contactInfo}
Subject: [Recover] Found Report for Item #${item.registrationId}

Hello Valued Owner,

Someone has scanned your QR sticker and submitted a found report for: "${item.name}".

Message details:
-----------------------------------------
${message}
-----------------------------------------

Finder Contact details:
${contactInfo || "None provided"}

Location coordinate shared:
${location || "None provided"}

Access detailed inbox dashboard to reply and manage recovery:
http://localhost:3000/items/${item.registrationId}

Thank you,
The Recover Platform Protocol
=========================================
`);
    }

    return NextResponse.json(report, { status: 201 });
  } catch (err: any) {
    console.error("Failed to submit finder report:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
