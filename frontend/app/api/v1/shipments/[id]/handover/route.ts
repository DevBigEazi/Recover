import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
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
    const {
      nextHandlerAddress,
      nextHandler,
      riderName,
      riderPhone,
      riderPlateNumber,
      location,
      locationContext,
      notes,
      operatorAddress,
    } = body;

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    let authenticatedUser = null;
    if (apiKeyToken) {
      authenticatedUser = await db.user.findOne({ apiKey: apiKeyToken });
    } else if (operatorAddress) {
      const cleanOp = operatorAddress.toLowerCase();
      authenticatedUser = await db.user.findOne({
        $or: [{ _id: cleanOp }, { _id: operatorAddress }],
      });
    }

    if (!authenticatedUser && apiKeyToken) {
      return NextResponse.json({ error: "Invalid or unauthorized API key provided." }, { status: 401 });
    }

    const effectiveOperatorAddress = authenticatedUser
      ? (authenticatedUser._id as string).toLowerCase()
      : (operatorAddress || "").toLowerCase();

    if (!effectiveOperatorAddress) {
      return NextResponse.json(
        { error: "Authentication required (provide x-api-key or operatorAddress)." },
        { status: 401 }
      );
    }

    const cleanId = id.replace(/^RCV-/i, "").replace(/^PKG-/i, "");
    const shipment = await db.shipment.findOne({
      $or: [
        { _id: id },
        { _id: id.toLowerCase() },
        { _id: { $regex: new RegExp(`^0x${cleanId}`, "i") } },
      ],
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (shipment.status === "Verified" || shipment.status === "Disputed") {
      return NextResponse.json(
        { error: `Cannot log handover. Shipment status is '${shipment.status}'.` },
        { status: 409 }
      );
    }

    const lastEvent = shipment.events && shipment.events.length > 0 ? shipment.events[shipment.events.length - 1] : null;
    const currentHandler = (lastEvent?.operator || shipment.shipperAddress || "").toLowerCase();

    if (
      effectiveOperatorAddress !== currentHandler &&
      effectiveOperatorAddress !== (shipment.shipperAddress || "").toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Authenticated operator is not the owner or current handler of this shipment." },
        { status: 403 }
      );
    }

    // Determine target EVM address for smart contract logHandover
    let targetNextHandler: `0x${string}`;
    const rawNext = nextHandlerAddress || nextHandler;
    if (typeof rawNext === "string" && rawNext.startsWith("0x") && rawNext.length === 42) {
      targetNextHandler = rawNext as `0x${string}`;
    } else {
      // Deterministically derive fallback address from rider identity hash (non-zero)
      const seed = riderPhone || riderPlateNumber || riderName || `RIDER_${id}_${Date.now()}`;
      const rawHash = keccak256(encodePacked(["string"], [seed]));
      targetNextHandler = ("0x" + rawHash.slice(26)) as `0x${string}`;
    }

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
        ["address", "bytes32", "address", "uint256", "uint256", "uint256", "address"],
        [
          relayerAccount.address as `0x${string}`,
          shipment._id as `0x${string}`,
          targetNextHandler,
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
      method: "function logHandover(bytes32 packageId, address nextHandler, uint256 deadline, bytes signature)",
      params: [shipment._id as `0x${string}`, targetNextHandler, BigInt(deadline), signature],
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

    // 4. Construct human-friendly rider operator label & location description (no phone in public timeline label)
    let riderOperatorLabel = "";
    if (riderName && riderName.trim()) {
      riderOperatorLabel += riderName.trim();
    } else {
      riderOperatorLabel += "Dispatch Rider";
    }
    if (riderPlateNumber && riderPlateNumber.trim()) {
      riderOperatorLabel += ` (Plate: ${riderPlateNumber.trim()})`;
    }

    let fullLocationContext = locationContext?.trim() || "";
    if (notes && notes.trim()) {
      fullLocationContext = fullLocationContext ? `${fullLocationContext} · Note: ${notes.trim()}` : `Note: ${notes.trim()}`;
    }

    // Generate 4-digit Courier Dispatch PIN for rider link access
    const courierPin = Math.floor(1000 + Math.random() * 9000).toString();

    // 5. Update MongoDB shipment record
    shipment.status = "InTransit";
    shipment.metadata = {
      ...(shipment.metadata || {}),
      courierPin,
      riderName: riderName ? riderName.trim() : null,
      riderPhone: riderPhone ? riderPhone.trim() : null,
      riderPlateNumber: riderPlateNumber ? riderPlateNumber.trim() : null,
      handoverLocation: fullLocationContext || null,
    };

    shipment.events.push({
      event: "InTransit",
      operator: riderOperatorLabel,
      location: location || null,
      locationContext: fullLocationContext || null,
      timestamp: new Date(),
      onChainTxHash: receipt.transactionHash,
    });

    await shipment.save();

    // 6. Fire webhook if configured
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
            event: "package.handover",
            timestamp: new Date().toISOString(),
            data: {
              packageId: id,
              companyName: shipperUser?.companyName || shipperUser?.fullName || "Merchant",
              shipperAddress: shipment.shipperAddress,
              packageName: shipment.metadata?.name || "Package",
              status: "InTransit",
              operator: riderOperatorLabel,
              riderName: riderName || null,
              riderPhone: riderPhone || null,
              riderPlateNumber: riderPlateNumber || null,
              courierPin,
              location: location || null,
              locationContext: fullLocationContext || null,
              onChainTxHash: receipt.transactionHash,
            },
          }),
        });
      } catch (err) {
        console.error("Webhook notification failed:", err);
      }
    }

    const requestOrigin = request.headers.get("origin") || request.headers.get("host") ? `https://${request.headers.get("host")}` : "https://userecover.xyz";
    const cleanPackageId = shipment._id.startsWith("0x") ? shipment._id.slice(2) : shipment._id;
    const trackingCode = `RCV-${cleanPackageId.slice(0, 12).toUpperCase()}`;
    const riderLink = `${requestOrigin}/scan/${trackingCode}?pin=${courierPin}`;
    const recipientLink = `${requestOrigin}/scan/${trackingCode}?pin=${courierPin}`;

    // 7. Dispatch in-app notification in DB & Web Push alert
    try {
      const pkgName = (shipment.metadata?.name as string) || "Package";
      const notifMsg = `Package "${pkgName}" (${trackingCode}) was handed over to ${riderName ? riderName.trim() : "Dispatch Rider"}.`;
      await db.notification.create({
        _id: crypto.randomUUID(),
        ownerAddress: shipment.shipperAddress.toLowerCase(),
        registrationId: trackingCode,
        type: "shipment_intransit",
        message: notifMsg,
      });
      await sendPushNotification(
        shipment.shipperAddress.toLowerCase(),
        "Package In Transit 🛵",
        notifMsg,
        `/shipments/${trackingCode}`
      );
    } catch (err) {
      console.error("Failed to dispatch shipment_intransit notification:", err);
    }

    return NextResponse.json({
      success: true,
      shipment,
      courierPin,
      riderName: riderName || null,
      riderPhone: riderPhone || null,
      riderPlateNumber: riderPlateNumber || null,
      riderLink,
      recipientLink,
    });
  } catch (error: unknown) {
    console.error("Handover failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to log handover";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
