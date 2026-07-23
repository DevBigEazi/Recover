import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    await connectDB();

    const item = await db.item.findOne({
      _id: id,
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check request header for auth verification
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    const isOwner = requestOwner === item.ownerAddress.toLowerCase();

    const ownerUser = await db.user.findOne({
      _id: item.ownerAddress,
    });
    const ownerName = ownerUser?.fullName || ownerUser?.username || "Secured Owner";

    const showDirectContact = Boolean(item.showPublicContact);
    const method = item.publicContactMethod || "phone";

    const derivedPhone = item.phone || (item.contactInfo && /\+?[0-9\s-]{7,}/.test(item.contactInfo) ? item.contactInfo.match(/\+?[0-9\s-]{7,}/)?.[0]?.trim() || null : null) || ownerUser?.phone || item.alternateContact || null;
    const derivedWhatsapp = item.whatsapp || ownerUser?.whatsapp || derivedPhone;
    const derivedEmail = item.email || (item.contactInfo && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(item.contactInfo) ? item.contactInfo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null : null) || ownerUser?.email || null;

    let targetPhone = showDirectContact && (method === "phone" || !method) ? derivedPhone : null;
    let targetWhatsapp = showDirectContact && method === "whatsapp" ? derivedWhatsapp : null;
    let targetEmail = showDirectContact && method === "email" ? derivedEmail : null;

    if (showDirectContact && !targetPhone && !targetWhatsapp && !targetEmail) {
      targetPhone = derivedPhone;
      targetWhatsapp = derivedWhatsapp;
      targetEmail = derivedEmail;
    }

    const NO_CACHE_HEADERS = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    // If verified owner, return full record with secrets and passphrase
    if (isOwner) {
      return NextResponse.json({
        ...item.toObject(),
        ownerName,
        phone: targetPhone || derivedPhone,
        whatsapp: targetWhatsapp || derivedWhatsapp,
        email: targetEmail || derivedEmail,
        contactInfo: item.contactInfo || targetPhone || derivedPhone || derivedEmail || null,
        showPublicContact: Boolean(item.showPublicContact),
        publicContactMethod: method,
      }, { status: 200, headers: NO_CACHE_HEADERS });
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
      contactInfo: showDirectContact ? (item.contactInfo || targetPhone || targetWhatsapp || targetEmail || null) : null,
      phone: targetPhone,
      whatsapp: targetWhatsapp,
      email: targetEmail,
      instructions: item.status === "Lost" ? item.instructions : null,
      alternateContact: item.status === "Lost" ? item.alternateContact : null,
      showPublicContact: Boolean(item.showPublicContact),
      publicContactMethod: method,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    return NextResponse.json(publicItem, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to fetch item details:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();

    if (!requestOwner) {
      return NextResponse.json(
        { error: "Authentication required. Missing x-owner-address header." },
        { status: 401 }
      );
    }

    await connectDB();

    const item = await db.item.findOne({ _id: id });
    if (!item) {
      return NextResponse.json({ error: "Item not found in registry." }, { status: 404 });
    }

    if (item.ownerAddress.toLowerCase() !== requestOwner) {
      return NextResponse.json(
        { error: "Unauthorized. You are not the owner of this item." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      brand,
      serial,
      category,
      reward,
      instructions,
      alternateContact,
      passphrase,
      secrets,
      showPublicContact,
      publicContactMethod,
      phone,
      whatsapp,
      email,
      contactInfo,
      receiptData,
      image,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    }

    const cleanCategory = category || item.category || "Other";
    const cleanAlternate = alternateContact !== undefined ? alternateContact?.trim() || null : item.alternateContact;

    if (cleanCategory === "Phone" && (!cleanAlternate || cleanAlternate.trim() === "")) {
      return NextResponse.json(
        { error: "Alternate contact details are required when category is set to Phone." },
        { status: 400 }
      );
    }

    const method = publicContactMethod || item.publicContactMethod || "phone";

    const cleanPhone = phone !== undefined ? phone?.trim() || null : item.phone;
    const cleanWhatsapp = whatsapp !== undefined ? whatsapp?.trim() || null : item.whatsapp;
    const cleanEmail = email !== undefined ? email?.trim() || null : item.email;
    const cleanContactInfo = contactInfo !== undefined ? contactInfo?.trim() || null : (cleanPhone || cleanWhatsapp || cleanEmail || item.contactInfo);

    const updateFields: Record<string, unknown> = {
      name: name.trim(),
      brand: brand !== undefined ? brand?.trim() || null : item.brand,
      serial: serial !== undefined ? serial?.trim() || null : item.serial,
      category: cleanCategory,
      reward: reward !== undefined ? reward?.trim() || null : item.reward,
      instructions: instructions !== undefined ? instructions?.trim() || null : item.instructions,
      alternateContact: cleanAlternate,
      passphrase: passphrase !== undefined ? passphrase?.trim() || null : item.passphrase,
      secrets: secrets !== undefined ? secrets?.trim() || null : item.secrets,
      showPublicContact: showPublicContact !== undefined ? Boolean(showPublicContact) : Boolean(item.showPublicContact),
      publicContactMethod: method,
      phone: cleanPhone || (method === "phone" ? cleanContactInfo : null),
      whatsapp: cleanWhatsapp || (method === "whatsapp" ? cleanContactInfo : null),
      email: cleanEmail || (method === "email" ? cleanContactInfo : null),
      contactInfo: cleanContactInfo,
      receiptData: receiptData !== undefined ? receiptData || null : item.receiptData,
      image: image !== undefined ? image || null : item.image,
    };

    const updatedItem = await db.item.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ error: "Failed to update item record." }, { status: 500 });
    }

    const ownerUser = await db.user.findOne({ _id: item.ownerAddress });
    const ownerName = ownerUser?.fullName || ownerUser?.username || "Secured Owner";

    return NextResponse.json({ ...updatedItem.toObject(), ownerName }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to update item details:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

