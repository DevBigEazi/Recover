import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawWalletAddress = searchParams.get("walletAddress")?.trim();

    if (!rawWalletAddress) {
      return NextResponse.json(
        { error: "walletAddress query parameter is required." },
        { status: 400 }
      );
    }

    const walletAddress = rawWalletAddress.toLowerCase();
    const requestOwner = request.headers.get("x-owner-address")?.trim()?.toLowerCase();

    await connectDB();

    const user = await db.user.findOne({
      $or: [
        { _id: walletAddress },
        { _id: walletAddress.toLowerCase() },
        { _id: { $regex: new RegExp(`^${walletAddress}$`, "i") } },
      ],
    });

    const hasCompleteProfile = Boolean(
      user &&
      (user.username ||
       user.hasPersonalProfile ||
       user.hasMerchantProfile ||
       user.companyName ||
       user.businessHandle)
    );

    if (!user || !hasCompleteProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check request header for authentication (case & whitespace insensitive)
    const isOwner = Boolean(
      requestOwner &&
      (requestOwner === walletAddress ||
       requestOwner === user._id.toLowerCase() ||
       requestOwner === user._id)
    );

    if (isOwner) {
      const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
      userObj.billingCycle = userObj.billingCycle || "monthly";
      userObj.plan = userObj.plan || "free";
      userObj.subscriptionActive = userObj.subscriptionActive !== undefined ? userObj.subscriptionActive : (userObj.plan !== "free");
      userObj.rolloverQuota = userObj.rolloverQuota || 0;
      userObj.overageCharges = userObj.overageCharges || 0;
      userObj.activeMode = user.activeMode || (user.hasMerchantProfile && !user.hasPersonalProfile ? "merchant" : "personal");
      userObj.hasPersonalProfile = Boolean(user.hasPersonalProfile);
      userObj.hasMerchantProfile = Boolean(user.hasMerchantProfile || user.companyName);
      userObj.businessPhone = user.businessPhone || null;
      userObj.businessEmail = user.businessEmail || null;
      userObj.businessHandle = user.businessHandle || null;
      userObj.username = user.username || null;

      if (user.apiKeyMasked) {
        userObj.apiKeyMasked = user.apiKeyMasked;
      } else if (user.apiKey) {
        userObj.apiKeyMasked = `${user.apiKey.substring(0, 13)}••••${user.apiKey.slice(-4)}`;
      } else {
        userObj.apiKeyMasked = null;
      }

      if (user.testApiKeyMasked) {
        userObj.testApiKeyMasked = user.testApiKeyMasked;
      } else if (user.testApiKey) {
        userObj.testApiKeyMasked = `${user.testApiKey.substring(0, 13)}••••${user.testApiKey.slice(-4)}`;
      } else {
        userObj.testApiKeyMasked = null;
      }

      // Never expose plaintext keys in profile responses
      // Automatically sanitize database: purge raw plaintext keys from MongoDB if hashes exist
      const setFields: Record<string, string> = {};
      const unsetFields: Record<string, string> = {};
      if (user.apiKey) {
        if (!user.apiKeyHash) {
          setFields.apiKeyHash = crypto.createHash("sha256").update(user.apiKey).digest("hex");
          setFields.apiKeyMasked = user.apiKeyMasked || `${user.apiKey.substring(0, 13)}••••${user.apiKey.slice(-4)}`;
        }
        unsetFields.apiKey = "";
      }
      if (user.testApiKey) {
        if (!user.testApiKeyHash) {
          setFields.testApiKeyHash = crypto.createHash("sha256").update(user.testApiKey).digest("hex");
          setFields.testApiKeyMasked = user.testApiKeyMasked || `${user.testApiKey.substring(0, 13)}••••${user.testApiKey.slice(-4)}`;
        }
        unsetFields.testApiKey = "";
      }
      if (Object.keys(unsetFields).length > 0) {
        await db.user
          .findByIdAndUpdate(user._id, {
            ...(Object.keys(setFields).length > 0 ? { $set: setFields } : {}),
            $unset: unsetFields,
          })
          .catch((e) => console.error("Purge plaintext key error:", e));
      }

      const billingStart = userObj.billingCycleStart ? new Date(userObj.billingCycleStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cleanUserId = user._id.toLowerCase();
      const [shipmentCount, receiptCount] = await Promise.all([
        db.shipment.countDocuments({
          shipperAddress: { $regex: new RegExp(`^${user._id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          createdAt: { $gte: billingStart },
        }),
        db.receipt.countDocuments({
          merchantAddress: cleanUserId,
          createdAt: { $gte: billingStart },
        }),
      ]);
      const actualCount = shipmentCount + receiptCount;
      userObj.shipmentsThisMonth = actualCount;
      if (user.shipmentsThisMonth !== actualCount) {
        await db.user.findByIdAndUpdate(user._id, { shipmentsThisMonth: actualCount }).catch((e) => console.error("Sync operations count error:", e));
      }

      return NextResponse.json(userObj, { status: 200 });
    }


    // Return sanitized public profile for non-owners (excluding phone, email, whatsapp)
    const publicProfile = {
      _id: user._id,
      walletAddress: user._id,
      fullName: user.fullName,
      companyName: user.companyName || null,
      businessLogo: user.businessLogo || null,
      businessHandle: user.businessHandle || null,
      username: user.username || null,
      subscriptionActive: user.subscriptionActive !== undefined ? Boolean(user.subscriptionActive) : (user.plan !== "free"),
      role: user.role,
      plan: user.plan || "free",
      hasPersonalProfile: Boolean(user.hasPersonalProfile),
      hasMerchantProfile: Boolean(user.hasMerchantProfile || user.companyName),
      activeMode: user.activeMode || (user.hasMerchantProfile && !user.hasPersonalProfile ? "merchant" : "personal"),
    };

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to fetch user profile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      fullName,
      companyName,
      businessLogo,
      businessPhone,
      businessEmail,
      businessHandle,
      username,
      phone,
      whatsapp,
      email,
      role,
      activeMode,
      plan,
      billingCycle,
      webhookUrl,
    } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required." },
        { status: 400 }
      );
    }

    await connectDB();

    // Load existing user profile to merge details if fields are partially provided
    const existingUser = await db.user.findOne({
      $or: [
        { _id: walletAddress },
        { _id: walletAddress.toLowerCase() },
        { _id: { $regex: new RegExp(`^${walletAddress}$`, "i") } },
      ],
    });

    const targetFullName =
      fullName !== undefined && fullName.trim().length > 0
        ? fullName.trim()
        : companyName !== undefined && companyName.trim().length > 0
        ? companyName.trim()
        : existingUser?.fullName || "";

    // Merchant profile details
    const targetCompanyName =
      companyName !== undefined
        ? companyName.trim() || null
        : existingUser?.companyName || null;
    const targetBusinessPhone =
      businessPhone !== undefined
        ? businessPhone.trim() || null
        : existingUser?.businessPhone || null;
    const targetBusinessEmail =
      businessEmail !== undefined
        ? businessEmail.trim() || null
        : existingUser?.businessEmail || null;

    const targetBusinessHandle =
      businessHandle !== undefined
        ? businessHandle ? businessHandle.trim().toLowerCase() : null
        : existingUser?.businessHandle || (targetCompanyName ? targetCompanyName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "_").slice(0, 30) : null);

    const targetUsername =
      username !== undefined
        ? username ? username.trim().toLowerCase() : null
        : existingUser?.username || null;

    const targetPhone = phone !== undefined ? phone.trim() : existingUser?.phone || "";
    const targetWhatsapp = whatsapp !== undefined ? whatsapp.trim() : existingUser?.whatsapp || "";
    const targetEmail = email !== undefined ? email.trim() : existingUser?.email || "";

    const hasMerchantProfile = Boolean(
      body.hasMerchantProfile !== undefined
        ? body.hasMerchantProfile
        : (targetCompanyName && targetCompanyName.length > 0) || existingUser?.hasMerchantProfile || role === "merchant"
    );

    const hasPersonalProfile = Boolean(
      body.hasPersonalProfile !== undefined
        ? body.hasPersonalProfile
        : existingUser?.hasPersonalProfile !== undefined
        ? existingUser.hasPersonalProfile
        : targetUsername && (targetPhone || targetWhatsapp || targetEmail)
    );

    // Active UI Mode: can be explicitly switched to "personal" or "merchant"
    const targetActiveMode: "personal" | "merchant" =
      activeMode === "personal" || activeMode === "merchant"
        ? activeMode
        : existingUser?.activeMode || (hasMerchantProfile && !hasPersonalProfile ? "merchant" : "personal");

    // Unified role: marked as "merchant" if merchant profile exists or was requested, else "user"
    const targetRole: "user" | "merchant" = hasMerchantProfile ? "merchant" : "user";

    const targetPlan = plan || existingUser?.plan || "free";
    const targetBillingCycle = billingCycle || existingUser?.billingCycle || "monthly";

    if (targetBusinessHandle && !/^[a-z0-9_-]{3,30}$/.test(targetBusinessHandle)) {
      return NextResponse.json(
        {
          error:
            "Business Handle must be between 3 and 30 characters and only contain lowercase letters, numbers, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }

    if (targetUsername && !/^[a-z0-9_-]{3,30}$/.test(targetUsername)) {
      return NextResponse.json(
        {
          error:
            "Personal username must be between 3 and 30 characters and only contain letters, numbers, underscores, or hyphens.",
        },
        { status: 400 }
      );
    }

    if (fullName !== undefined || !existingUser) {
      if (targetFullName.length === 0 || targetFullName.length > 50) {
        return NextResponse.json(
          { error: "Full name must be between 1 and 50 characters." },
          { status: 400 }
        );
      }
    }

    // At least one contact method (Phone, WhatsApp, or Email) required for personal profile
    if (hasPersonalProfile && !targetPhone && !targetWhatsapp && !targetEmail) {
      return NextResponse.json(
        { error: "At least one contact method (Phone, WhatsApp, or Email) is required on your personal profile." },
        { status: 400 }
      );
    }

    // Uniqueness checks
    if (targetUsername) {
      const userWithUsername = await db.user.findOne({
        username: targetUsername,
        _id: { $ne: walletAddress.toLowerCase() },
      });
      if (userWithUsername) {
        return NextResponse.json(
          { error: "Personal username is already taken. Please choose another." },
          { status: 400 }
        );
      }
    }

    if (targetBusinessHandle) {
      const userWithHandle = await db.user.findOne({
        businessHandle: targetBusinessHandle,
        _id: { $ne: walletAddress.toLowerCase() },
      });
      if (userWithHandle) {
        return NextResponse.json(
          { error: "Business Handle is already taken. Please choose another." },
          { status: 400 }
        );
      }
    }

    let targetWebhookUrl: string | null = existingUser?.webhookUrl || null;
    if (webhookUrl !== undefined) {
      if (webhookUrl && typeof webhookUrl === "string") {
        const trimmed = webhookUrl.trim();
        if (trimmed) {
          if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return NextResponse.json(
              { error: "Webhook URL must start with http:// or https://" },
              { status: 400 }
            );
          }
          targetWebhookUrl = trimmed;
        } else {
          targetWebhookUrl = null;
        }
      } else {
        targetWebhookUrl = null;
      }
    }

    let targetBusinessLogo: string | null = existingUser?.businessLogo || null;
    if (businessLogo !== undefined) {
      if (!businessLogo || (typeof businessLogo === "string" && businessLogo.trim() === "")) {
        targetBusinessLogo = null;
      } else if (typeof businessLogo === "string") {
        const trimmedLogo = businessLogo.trim();
        if (trimmedLogo.length > 500_000) {
          return NextResponse.json(
            { error: "Business logo must be under 500KB." },
            { status: 400 }
          );
        }
        if (
          trimmedLogo.startsWith("data:image/") ||
          trimmedLogo.startsWith("http://") ||
          trimmedLogo.startsWith("https://")
        ) {
          targetBusinessLogo = trimmedLogo;
        } else {
          return NextResponse.json(
            { error: "Invalid business logo format. Must be an image data URL or HTTPS image link." },
            { status: 400 }
          );
        }
      }
    }

    try {
      const targetId = existingUser ? existingUser._id : walletAddress.toLowerCase();

      const updateDoc: Record<string, unknown> = {
        fullName: targetFullName,
        activeMode: targetActiveMode,
        role: targetRole,
        plan: targetPlan,
        billingCycle: targetBillingCycle,
      };

      if (body.hasMerchantProfile !== undefined || !existingUser) {
        updateDoc.hasMerchantProfile = hasMerchantProfile;
      }
      if (body.hasPersonalProfile !== undefined || !existingUser) {
        updateDoc.hasPersonalProfile = hasPersonalProfile;
      }

      // Business Profile Fields
      if (companyName !== undefined || !existingUser) updateDoc.companyName = targetCompanyName;
      if (businessHandle !== undefined || !existingUser) updateDoc.businessHandle = targetBusinessHandle;
      if (businessPhone !== undefined || !existingUser) updateDoc.businessPhone = targetBusinessPhone;
      if (businessEmail !== undefined || !existingUser) updateDoc.businessEmail = targetBusinessEmail;
      if (businessLogo !== undefined || !existingUser) updateDoc.businessLogo = targetBusinessLogo;
      if (webhookUrl !== undefined || !existingUser) updateDoc.webhookUrl = targetWebhookUrl;

      // Personal Profile Fields
      if (username !== undefined || !existingUser) updateDoc.username = targetUsername;
      if (phone !== undefined || !existingUser) updateDoc.phone = targetPhone || null;
      if (whatsapp !== undefined || !existingUser) updateDoc.whatsapp = targetWhatsapp || null;
      if (email !== undefined || !existingUser) updateDoc.email = targetEmail || null;

      const user = await db.user.findOneAndUpdate(
        { _id: targetId },
        { $set: updateDoc },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      return NextResponse.json(user, { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err.code === 11000 || err.code === "P2002")) {
        const keyPattern = (err as Record<string, unknown>).keyPattern as Record<string, unknown> | undefined;
        if (keyPattern && keyPattern.businessHandle) {
          return NextResponse.json(
            { error: "Business Handle is already taken. Please choose another." },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Personal username is already taken. Please choose another." },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to upsert user profile:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
