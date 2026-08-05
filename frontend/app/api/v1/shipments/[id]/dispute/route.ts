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
    const { recipientAddress, reason, location, locationContext } = body;

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    let effectiveRecipientAddress = recipientAddress;
    if (apiKeyToken) {
      const apiKeyUser = await db.user.findOne({ apiKey: apiKeyToken });
      if (!apiKeyUser) {
        return NextResponse.json({ error: "Invalid or unauthorized API key provided." }, { status: 401 });
      }
      effectiveRecipientAddress = effectiveRecipientAddress || apiKeyUser._id;
    }

    if (!effectiveRecipientAddress || !reason) {
      return NextResponse.json({ error: "Recipient address and reason are required." }, { status: 400 });
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


    // Idempotency guard: cannot dispute a package that is already resolved
    if (shipment.status === "Verified" || shipment.status === "Disputed") {
      return NextResponse.json(
        { error: `Cannot file a dispute. Package status is already '${shipment.status}'.` },
        { status: 409 }
      );
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
        ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
        [
          relayerAccount.address as `0x${string}`,
          shipment._id as `0x${string}`,
          keccak256(encodePacked(["string"], [reason])),
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
      method: "function disputeDelivery(bytes32 packageId, string reason, uint256 deadline, bytes signature)",
      params: [shipment._id as `0x${string}`, reason, BigInt(deadline), signature],
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

    // 4. Update MongoDB shipment record
    shipment.status = "Disputed";
    shipment.events.push({
      event: "Disputed",
      operator: effectiveRecipientAddress,
      location: location || null,
      locationContext: locationContext || null,
      timestamp: new Date(),
      onChainTxHash: receipt.transactionHash,
    });

    await shipment.save();

    // 5. Fire webhook if configured
    if (shipment.webhookUrl) {
      try {
        await fetch(shipment.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "shipment.disputed",
            packageId: id,
            status: "Disputed",
            recipient: effectiveRecipientAddress,
            reason,
            location,
            timestamp: new Date(),
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
      const notifMsg = `Package "${pkgName}" (${trackingCode}) was flagged as disputed. Reason: ${reason || "Unspecified"}`;

      await db.notification.create({
        _id: crypto.randomUUID(),
        ownerAddress: shipment.shipperAddress.toLowerCase(),
        registrationId: trackingCode,
        type: "shipment_disputed",
        message: notifMsg,
      });
      await sendPushNotification(
        shipment.shipperAddress.toLowerCase(),
        "Package Disputed ⚠️",
        notifMsg,
        `/shipments/${trackingCode}`
      );
    } catch (err) {
      console.error("Failed to dispatch shipment_disputed notification:", err);
    }

    return NextResponse.json({ success: true, shipment });
  } catch (error: unknown) {
    console.error("Dispute failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to log dispute";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
