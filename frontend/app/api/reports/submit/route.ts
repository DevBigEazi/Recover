import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";
import { generateContent } from "@/lib/ai";
import crypto from "node:crypto";

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

    await connectDB();

    // Fetch corresponding item to verify existence and retrieve owner contact info
    const item = await db.item.findOne({
      _id: registrationId.toString(),
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in registry." },
        { status: 404 }
      );
    }

    // Rate-limiting check: restrict reports for this item in the last 60 seconds
    const recentReport = await db.finderReport.findOne({
      registrationId: registrationId.toString(),
      createdAt: {
        $gte: new Date(Date.now() - 60000), // last 60 seconds
      },
    });

    if (recentReport) {
      return NextResponse.json(
        { error: "You are submitting reports too quickly. Please wait 60 seconds." },
        { status: 429 }
      );
    }

    const cleanLocation = typeof location === "string" && location.trim() ? location.trim() : null;

    let locationContext = null;
    if (cleanLocation) {
      try {
        const aiPrompt = `Interpret the following location coordinates or address: '${cleanLocation}'.
Generate a very short, polite, and practical human-readable summary (max 2 sentences, 30 words) explaining where this is and any quick safety or recovery recommendation for the owner who lost their item.
Example style: 'Scanned near Lagos International Airport. This is a high-traffic public space; coordinate meetups near check-in security desks.'
Return ONLY the plain text context summary, without quotes, markdown formatting, or any extra explanation.`;

        locationContext = await generateContent(aiPrompt);
      } catch (aiErr) {
        console.error("Failed to generate AI location context:", aiErr);
      }
    }

    // Save report to database
    const report = await db.finderReport.create({
      _id: crypto.randomUUID(),
      registrationId: registrationId.toString(),
      message,
      contactInfo: contactInfo || null,
      location: cleanLocation,
      locationContext,
      photo: photo || null,
    });

    const messageText = `New found report submitted for your item "${item.name}".`;

    // 1. Log in-app notification in DB
    await db.notification.create({
      _id: crypto.randomUUID(),
      ownerAddress: item.ownerAddress,
      registrationId: item.registrationId || "",
      type: "report",
      message: messageText,
    });



    // 4. Dispatch Web Push Alert
    await sendPushNotification(
      item.ownerAddress,
      "New Found Report!",
      messageText,
      `/items/${item.registrationId}`
    );

    return NextResponse.json(report, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to submit finder report:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
