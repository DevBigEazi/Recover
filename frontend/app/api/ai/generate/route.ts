import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, itemName, category, brand, finderNotes } = body;

    let prompt = "";
    if (action === "instructions") {
      if (!itemName) {
        return NextResponse.json({ error: "Item name is required." }, { status: 400 });
      }
      prompt = `You are an AI recovery assistant for 'Recover', a secure lost-and-found protocol.
Generate a short, friendly, and practical set of recovery/return instructions (max 2 sentences, 40 words) for an owner who is registering a lost item.
The item is a '${itemName}' in the '${category || "Other"}' category. ${brand ? `Brand/model is '${brand}'.` : ""}
Do not use any blockchain, technical, or crypto jargon.
Example style: 'If found, please keep it safe and contact me here to arrange a return. We can meet in a public place like a transit station or cafe.'
Return ONLY the instruction text, without quotes, markdown formatting, or any extra explanation.`;
    } else if (action === "message") {
      if (!itemName) {
        return NextResponse.json({ error: "Item name is required." }, { status: 400 });
      }
      prompt = `You are an AI assistant helping a finder write a polite message to the owner of a lost item they just found.
The item is '${itemName}'.
${finderNotes ? `Finder's brief notes/context: '${finderNotes}'.` : "No specific notes provided."}
Generate a polite, helpful, and concise message (max 3 sentences, 50 words) coordination text that the finder can send to the owner.
Do not use any crypto or technical jargon.
Example style: 'Hi, I found your lost keys near the Central Library. I have kept them safe. Let me know when you are available to meet at a public cafe to return them.'
Return ONLY the message text, without quotes, markdown formatting, or any extra explanation.`;
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const cleanedText = await generateContent(prompt);
    return NextResponse.json({ text: cleanedText });
  } catch (err: unknown) {
    console.error("AI Generation error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
