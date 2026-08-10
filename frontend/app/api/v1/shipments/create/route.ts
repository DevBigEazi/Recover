import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recoverShipmentContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";
import crypto from "node:crypto";
import { sendPushNotification } from "@/lib/push";
import { getShipperFromApiKey } from "@/lib/auth-api";

export async function POST(request: Request) {
  let reservedUserAddress: string | null = null;
  let reservedOverageAmount = 0;
  let isQuotaReserved = false;

  try {
    const body = await request.json();
    const {
      webhookUrl,
      metadata,
      packageName,
      weight,
      receiverPhone,
      receiverName,
      destination,
    } = body;

    const finalMetadata = {
      name: packageName || metadata?.name || "General Package",
      weight: weight || metadata?.weight || "unknown",
      receiverPhone: receiverPhone || metadata?.receiverPhone || null,
      receiverName: receiverName || metadata?.receiverName || null,
      destination: destination || metadata?.destination || null,
      ...(metadata || {}),
    };

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = (bearerToken || xApiKeyHeader)?.trim();

    const authResult = await getShipperFromApiKey(apiKeyToken);
    if (!authResult.shipper) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized API key provided." },
        { status: authResult.status || 401 }
      );
    }

    const shipper = authResult.shipper;
    const isTest = authResult.isTest;
    const shipperAddress = shipper._id.toLowerCase();

    if (!isTest) {
      const billingStart = shipper.billingCycleStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const shipmentCount = await db.shipment.countDocuments({
        shipperAddress: { $regex: new RegExp(`^${shipper._id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        createdAt: { $gte: billingStart },
      });

      const TIER_LIMITS: Record<string, number> = {
        free: 100,
        pro_starter: 10000,
        pro_growth: 100000,
        pro_scale: 500000,
        pro: 100000,
      };

      const baseLimit = TIER_LIMITS[shipper.plan] || 100;
      const totalAllowed = baseLimit + (shipper.rolloverQuota || 0);

      const OVERAGE_RATES_USD: Record<string, number> = {
        pro_starter: 0.02,
        pro_growth: 0.015,
        pro_scale: 0.01,
        pro: 0.015,
      };

      const isOverage = shipmentCount >= totalAllowed;
      const overageRate = isOverage ? (OVERAGE_RATES_USD[shipper.plan] || 0.02) : 0;
      reservedUserAddress = shipper._id;
      reservedOverageAmount = overageRate;

      const reservedUser = await db.user.findByIdAndUpdate(
        shipper._id,
        {
          $inc: {
            shipmentsThisMonth: 1,
            ...(overageRate > 0 ? { overageCharges: overageRate } : {}),
          },
        },
        { new: true }
      );

      isQuotaReserved = true;
      const reservedCount = reservedUser?.shipmentsThisMonth || (shipmentCount + 1);

      if (shipper.plan === "free" && reservedCount > totalAllowed) {
        await db.user.findByIdAndUpdate(shipper._id, {
          $inc: { shipmentsThisMonth: -1 },
        });
        isQuotaReserved = false;
        return NextResponse.json(
          {
            error: `Monthly limit reached (${totalAllowed} packages). Upgrade your plan to increase shipment capacity.`,
            upgradeUrl: "/shipments",
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // 2. Generate cryptographically secure package credentials
    const packageIdBytes = crypto.randomBytes(32);
    const packageId = "0x" + packageIdBytes.toString("hex");

    const innerSecret = "RCVR-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // Compute innerSecretHash = keccak256(packageId + innerSecret)
    const packageHash = keccak256(
      encodePacked(["bytes32", "string"], [packageId as `0x${string}`, innerSecret])
    );

    let txHash = `0xsimulated_tx_${crypto.randomBytes(16).toString("hex")}`;

    if (!isTest) {
      const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
      if (!signerPrivateKey) {
        return NextResponse.json({ error: "Backend relayer configuration is missing." }, { status: 500 });
      }

      const relayerAccount = privateKeyToAccount({
        client,
        privateKey: signerPrivateKey.startsWith("0x") ? signerPrivateKey : `0x${signerPrivateKey}`,
      });

      // 3. Obtain current nonce from contract for the relayer (msg.sender)
      const nonce = await readContract({
        contract: recoverShipmentContract,
        method: "function userNonces(address user) view returns (uint256)",
        params: [relayerAccount.address as `0x${string}`],
      });

      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes deadline
      const chainId = 52014;
      const contractAddress = process.env.NEXT_PUBLIC_RECOVER_SHIPMENT_CONTRACT_ADDRESS as `0x${string}`;

      // 4. Generate backend witness signature (msg.sender in contract is relayerAccount.address)
      const messageHash = keccak256(
        encodePacked(
          ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
          [
            relayerAccount.address as `0x${string}`,
            packageId as `0x${string}`,
            packageHash,
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

      // 5. Send transaction to contract
      const transaction = prepareContractCall({
        contract: recoverShipmentContract,
        method: "function registerShipment(bytes32 packageId, bytes32 packageHash, uint256 deadline, bytes signature)",
        params: [packageId as `0x${string}`, packageHash, BigInt(deadline), signature],
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

    const cleanId = packageId.startsWith("0x") ? packageId.slice(2) : packageId;
    const trackingCode = `RCV-${cleanId.slice(0, 12).toUpperCase()}`;

    // 6. Save to database (live shipment vs isolated test shipment)
    const shipmentData = {
      _id: packageId,
      shipperAddress: shipperAddress.toLowerCase(),
      status: "Created" as const,
      innerSecret: innerSecret,
      innerSecretHash: packageHash,
      metadata: finalMetadata,
      webhookUrl: webhookUrl || null,
      trackingCode: trackingCode,
      isTest: isTest,
      events: [
        {
          event: "Created" as const,
          operator: shipperAddress,
          timestamp: new Date(),
          onChainTxHash: txHash,
        },
      ],
    };

    const newShipment = isTest
      ? await db.testShipment.create(shipmentData)
      : await db.shipment.create(shipmentData);

    // 8. Create in-app notification in DB & send Web Push alert (live only)
    if (!isTest) {
      try {
        const resolvedPkgName = (finalMetadata.name as string) || "Package";
        const notifMsg = `Package "${resolvedPkgName}" (${trackingCode}) has been registered.`;
        await db.notification.create({
          _id: crypto.randomUUID(),
          ownerAddress: shipperAddress.toLowerCase(),
          registrationId: trackingCode,
          type: "shipment_created",
          message: notifMsg,
        });
        await sendPushNotification(
          shipperAddress.toLowerCase(),
          "Package Registered 📦",
          notifMsg,
          `/shipments/${trackingCode}`
        );
      } catch (err) {
        console.error("Failed to dispatch shipment_created notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      mode: isTest ? "sandbox" : "live",
      isTest,
      trackingCode,
      onChainId: packageId,
      innerSecret,
      shipment: newShipment,
    });
  } catch (error: unknown) {
    if (isQuotaReserved && reservedUserAddress) {
      try {
        await db.user.findByIdAndUpdate(reservedUserAddress, {
          $inc: {
            shipmentsThisMonth: -1,
            ...(reservedOverageAmount > 0 ? { overageCharges: -reservedOverageAmount } : {}),
          },
        });
      } catch (rollbackErr) {
        console.error("Quota reservation rollback failed:", rollbackErr);
      }
    }
    console.error("Failed to register shipment:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create shipment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
