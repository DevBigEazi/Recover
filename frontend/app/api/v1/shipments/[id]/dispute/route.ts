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
    const { recipientAddress, reason, location, locationContext, innerSecret, passcode, secret } = body;
    const secretCode = (id && id.trim().toUpperCase().startsWith("RCVR-"))
      ? id.trim()
      : (innerSecret || passcode || secret);

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    let effectiveRecipientAddress = recipientAddress;
    let isTestKey = apiKeyToken?.startsWith("rec_test_") || false;
    let authenticatedShipper = null;

    const xOwnerAddress = request.headers.get("x-owner-address");
    if (apiKeyToken || xOwnerAddress) {
      const authResult = await getShipperFromApiKey(apiKeyToken, xOwnerAddress);
      if (!authResult.shipper) {
        return NextResponse.json({ error: authResult.error || "Invalid or unauthorized API key provided." }, { status: authResult.status || 401 });
      }
      authenticatedShipper = authResult.shipper;
      effectiveRecipientAddress = effectiveRecipientAddress || authenticatedShipper._id;
      isTestKey = authResult.isTest;
    }

    if (!reason) {
      return NextResponse.json({ error: "Reason for dispute is required." }, { status: 400 });
    }

    const idFilter = buildShipmentIdFilter(id, true);

    let isTestShipment = false;
    let shipment = await db.testShipment.findOne({ $or: idFilter });
    if (shipment) {
      isTestShipment = true;
    } else {
      shipment = await db.shipment.findOne({ $or: idFilter });
    }

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const isShipper = authenticatedShipper && (
      authenticatedShipper._id.toLowerCase() === shipment.shipperAddress.toLowerCase()
    );

    let isSecretValid = false;
    if (secretCode && shipment.innerSecret) {
      isSecretValid = shipment.innerSecret.toUpperCase() === secretCode.trim().toUpperCase();
    } else if (secretCode && shipment.innerSecretHash) {
      const computedHash = keccak256(encodePacked(["string"], [secretCode.trim().toUpperCase()]));
      isSecretValid = computedHash.toLowerCase() === shipment.innerSecretHash.toLowerCase();
    }

    if (!isShipper && !isSecretValid) {
      return NextResponse.json(
        { error: "Scratch-off secret code (innerSecret) or owner API key authorization is required to file a dispute." },
        { status: 403 }
      );
    }

    effectiveRecipientAddress = effectiveRecipientAddress || "Anonymous Recipient";

    // Idempotency guard: cannot dispute a package that is not in transit
    if (shipment.status !== "InTransit") {
      return NextResponse.json(
        { error: `Cannot file a dispute. Package must be 'InTransit' (handed over to a courier). Current status is '${shipment.status}'.` },
        { status: 400 }
      );
    }

    if (isTestKey && !isTestShipment) {
      return NextResponse.json(
        { error: "Test Sandbox API keys cannot be used to modify live production shipments." },
        { status: 403 }
      );
    }

    const isSandboxMode = isTestShipment || shipment.isTest || shipment._id.startsWith("0xsimulated_") || shipment._id.startsWith("0xtest_") || shipment.trackingCode === "RCV-DEMOPKG123";
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

      txHash = receipt.transactionHash;
    }

    // 4. Update MongoDB shipment record
    shipment.status = "Disputed";
    shipment.events.push({
      event: "Disputed",
      operator: effectiveRecipientAddress,
      location: location || null,
      locationContext: locationContext || null,
      timestamp: new Date(),
      onChainTxHash: txHash,
    });

    await shipment.save();

    // 5. Fire webhook if merchant has configured a global webhook URL
    try {
      const shipperUser = await db.user.findOne({
        $or: [
          { _id: shipment.shipperAddress },
          { _id: shipment.shipperAddress.toLowerCase() },
          { _id: { $regex: new RegExp(`^${shipment.shipperAddress}$`, "i") } },
        ],
      });
      if (shipperUser?.webhookUrl) {
        await fetch(shipperUser.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "shipment.disputed",
            packageId: id,
            status: "Disputed",
            companyName: shipperUser?.companyName || shipperUser?.fullName || "Merchant",
            recipient: effectiveRecipientAddress,
            reason,
            location,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error("Webhook notification failed:", err);
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
