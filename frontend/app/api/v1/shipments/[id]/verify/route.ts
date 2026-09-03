import { NextResponse } from "next/server";
import { getShipperFromApiKey } from "@/lib/auth-api";
import { db, connectDB } from "@/lib/db";
import { buildShipmentIdFilter } from "@/lib/shipment-lookup";
import { recoverShipmentContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";
import crypto from "node:crypto";
import { sendPushNotification } from "@/lib/push";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recipientAddress, recipientName, innerSecret, passcode, secret, location, locationContext } = body;
    const secretCode = (id && id.trim().toUpperCase().startsWith("RCVR-"))
      ? id.trim()
      : (innerSecret || passcode || secret);

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    let effectiveRecipientAddress = recipientAddress || recipientName || null;
    let isTestKey = apiKeyToken?.startsWith("rec_test_") || false;

    const xOwnerAddress = request.headers.get("x-owner-address");
    if (apiKeyToken || xOwnerAddress) {
      const authResult = await getShipperFromApiKey(apiKeyToken, xOwnerAddress);
      if (!authResult.shipper) {
        return NextResponse.json({ error: authResult.error || "Invalid or unauthorized API key provided." }, { status: authResult.status || 401 });
      }
      const apiKeyUser = authResult.shipper;
      effectiveRecipientAddress = effectiveRecipientAddress || apiKeyUser._id;
      isTestKey = authResult.isTest;
    }

    if (!secretCode) {
      return NextResponse.json({ error: "Scratch-off secret code (innerSecret) is required for verification." }, { status: 400 });
    }

    const idFilter = buildShipmentIdFilter(id, true);

    // Check both testShipment and live shipment models
    let shipment = await db.testShipment.findOne({ $or: idFilter });
    let isTestShipment = true;

    if (!shipment) {
      shipment = await db.shipment.findOne({ $or: idFilter });
      isTestShipment = false;
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (isTestKey && !isTestShipment) {
      return NextResponse.json(
        { error: "Test Sandbox API keys cannot be used to modify live production shipments." },
        { status: 403 }
      );
    }

    const isSandboxMode = isTestShipment || shipment.isTest || shipment._id.startsWith("0xsimulated_") || shipment._id.startsWith("0xtest_") || shipment.trackingCode === "RCV-DEMOPKG123";

    // Idempotency guard: package must be in transit to be verified
    if (shipment.status !== "InTransit") {
      return NextResponse.json(
        { error: `Cannot verify delivery. Package must be 'InTransit' (handed over to a courier). Current status is '${shipment.status}'.` },
        { status: 400 }
      );
    }

    const targetPackageId = shipment._id as `0x${string}`;

    // Normalize input code & stored secret for case-insensitive matching
    const rawSecret = String(secretCode).trim();
    const cleanRaw = rawSecret.replace(/^RCVR-/i, "");

    const candidates = [
      rawSecret,
      rawSecret.toUpperCase(),
      rawSecret.toLowerCase(),
      `RCVR-${cleanRaw.toUpperCase()}`,
      `RCVR-${cleanRaw.toLowerCase()}`,
      `rcvr-${cleanRaw.toLowerCase()}`,
      cleanRaw.toUpperCase(),
      cleanRaw.toLowerCase(),
    ];

    let matchedSecret: string | null = null;

    // 1. Authoritative cryptographic hash check against all input candidates
    if (shipment.innerSecretHash) {
      for (const cand of candidates) {
        const testHash = keccak256(
          encodePacked(["bytes32", "string"], [targetPackageId, cand])
        );
        if (testHash === shipment.innerSecretHash) {
          matchedSecret = cand;
          break;
        }
      }
    }

    // 2. Recover original stored casing after hash validation succeeds
    if (matchedSecret && shipment.innerSecret) {
      const storedClean = shipment.innerSecret.replace(/^RCVR-/i, "").trim().toUpperCase();
      if (cleanRaw.toUpperCase() === storedClean) {
        matchedSecret = shipment.innerSecret;
      }
    }

    if (!matchedSecret) {
      return NextResponse.json({ error: "Invalid secret code. Package integrity verification failed." }, { status: 400 });
    }

    let txHash = `0xsimulated_tx_${crypto.randomBytes(16).toString("hex")}`;

    if (!isSandboxMode) {
      const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
      if (!signerPrivateKey) {
        return NextResponse.json({ error: "Backend signer configuration missing." }, { status: 500 });
      }

      const relayerAccount = privateKeyToAccount({
        client,
        privateKey: signerPrivateKey.startsWith("0x") ? signerPrivateKey : `0x${signerPrivateKey}`,
      });

      // 1. Fetch current nonce from contract for the relayer (msg.sender)
      const nonce = await readContract({
        contract: recoverShipmentContract,
        method: "function userNonces(address user) view returns (uint256)",
        params: [relayerAccount.address as `0x${string}`],
      });

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const chainId = 52014;
      const contractAddress = process.env.NEXT_PUBLIC_RECOVER_SHIPMENT_CONTRACT_ADDRESS as `0x${string}`;

      // 2. Generate backend witness signature (msg.sender in contract is relayerAccount.address)
      const messageHash = keccak256(
        encodePacked(
          ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
          [
            relayerAccount.address as `0x${string}`,
            targetPackageId,
            keccak256(encodePacked(["string"], [matchedSecret])),
            BigInt(nonce),
            BigInt(deadline),
            BigInt(chainId),
            contractAddress,
          ]
        )
      );

      const signature = await relayerAccount.signMessage({
        message: { raw: messageHash },
      });

      // 3. Prepare and send transaction
      const transaction = prepareContractCall({
        contract: recoverShipmentContract,
        method: "function verifyDelivery(bytes32 packageId, string innerSecret, uint256 deadline, bytes signature)",
        params: [targetPackageId, matchedSecret, BigInt(deadline), signature],
      });

      const txResult = await sendTransaction({
        transaction,
        account: relayerAccount,
      });

      const receipt = await waitForReceipt({
        client,
        chain: recoverShipmentContract.chain,
        transactionHash: txResult.transactionHash,
      });

      txHash = receipt.transactionHash;
    }

    // 4. Update MongoDB shipment record
    shipment.status = "Verified";
    shipment.events.push({
      event: "Verified",
      operator: effectiveRecipientAddress || (shipment.metadata?.receiverName as string) || "Package Recipient",
      location: typeof location === "object" && location !== null ? JSON.stringify(location) : location || null,
      locationContext: locationContext || null,
      timestamp: new Date(),
      onChainTxHash: txHash,
    });

    await shipment.save();

    // 5. Fire webhook if configured
    if (shipment.webhookUrl) {
      try {
        const shipperUser = await db.user.findOne({
          $or: [
            { _id: shipment.shipperAddress },
            { _id: shipment.shipperAddress.toLowerCase() },
            { _id: { $regex: new RegExp(`^${shipment.shipperAddress}$`, "i") } },
          ],
        });
        await fetch(shipment.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "package.delivered",
            timestamp: new Date().toISOString(),
            data: {
              packageId: id,
              companyName: shipperUser?.companyName || shipperUser?.fullName || "Merchant",
              shipperAddress: shipment.shipperAddress,
              packageName: shipment.metadata?.name || "Package",
              status: "Verified",
              recipient: effectiveRecipientAddress || (shipment.metadata?.receiverName as string) || null,
              location: location || null,
              onChainTxHash: txHash,
            },
          }),
        });
      } catch (err) {
        console.error("Webhook notification failed:", err);
      }
    }


    // 6. Dispatch in-app notification in DB & Web Push alert
    try {
      const cleanPackageId = shipment._id.startsWith("0x") ? shipment._id.slice(2) : shipment._id;
      const trackingCode = `RCV-${cleanPackageId.slice(0, 12).toUpperCase()}`;
      const pkgName = (shipment.metadata?.name as string) || "Package";
      const notifMsg = `Package "${pkgName}" (${trackingCode}) was successfully verified & delivered!`;

      await db.notification.create({
        _id: crypto.randomUUID(),
        ownerAddress: shipment.shipperAddress.toLowerCase(),
        registrationId: trackingCode,
        type: "shipment_verified",
        message: notifMsg,
      });
      await sendPushNotification(
        shipment.shipperAddress.toLowerCase(),
        "Package Delivered ✓",
        notifMsg,
        `/shipments/${trackingCode}`
      );
    } catch (err) {
      console.error("Failed to dispatch shipment_verified notification:", err);
    }

    const cleanId = id.trim().replace(/^RCV-/i, "").replace(/^RCVR-/i, "").replace(/^PKG-/i, "").replace(/^0x/i, "");
    const effectiveTrackingCode = shipment.trackingCode || `RCV-${cleanId.slice(0, 12).toUpperCase()}`;
    return NextResponse.json({
      success: true,
      trackingCode: effectiveTrackingCode,
      onChainId: targetPackageId,
      shipment,
    });
  } catch (error: unknown) {
    console.error("Verification failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify delivery";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const idFilter = buildShipmentIdFilter(id, true);

    let shipment = await db.testShipment.findOne({ $or: idFilter });
    if (!shipment) {
      shipment = await db.shipment.findOne({ $or: idFilter });
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const cleanId = id.trim().replace(/^RCV-/i, "").replace(/^RCVR-/i, "").replace(/^PKG-/i, "").replace(/^0x/i, "");
    return NextResponse.json({
      trackingCode: shipment.trackingCode || `RCV-${cleanId.slice(0, 12).toUpperCase()}`,
      onChainId: shipment._id,
      shipperAddress: shipment.shipperAddress,
      status: shipment.status,
      events: shipment.events,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch shipment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

