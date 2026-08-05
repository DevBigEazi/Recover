import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { recoverShipmentContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";
import crypto from "node:crypto";

export async function POST(request: Request) {
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
    const apiKeyToken = bearerToken || xApiKeyHeader;

    if (!apiKeyToken) {
      return NextResponse.json(
        { error: "API key is required for shipment creation." },
        { status: 401 }
      );
    }

    await connectDB();

    const shipper = await db.user.findOne({ apiKey: apiKeyToken });
    if (!shipper) {
      return NextResponse.json(
        { error: "Invalid or unauthorized API key provided." },
        { status: 401 }
      );
    }


    if (!shipper || shipper.role !== "merchant") {
      return NextResponse.json(
        {
          error: "To use shipment features, please configure a logistics profile first.",
          upgradeUrl: "/settings",
        },
        { status: 403 }
      );
    }

    const shipperAddress = shipper._id.toLowerCase();

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

    if (shipper.plan === "free" && shipmentCount >= totalAllowed) {
      return NextResponse.json(
        {
          error: `Monthly limit reached (${totalAllowed} packages). Upgrade your plan to increase shipment capacity.`,
          upgradeUrl: "/shipments",
        },
        { status: 402 } // Payment Required
      );
    }

    // 2. Generate cryptographically secure package credentials
    const packageIdBytes = crypto.randomBytes(32);
    const packageId = "0x" + packageIdBytes.toString("hex");

    const innerSecret = "RCVR-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // Compute innerSecretHash = keccak256(packageId + innerSecret)
    const packageHash = keccak256(
      encodePacked(["bytes32", "string"], [packageId as `0x${string}`, innerSecret])
    );

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

    // 6. Save to database
    const newShipment = await db.shipment.create({
      _id: packageId,
      shipperAddress: shipperAddress.toLowerCase(),
      status: "Created",
      innerSecret: innerSecret,
      innerSecretHash: packageHash,
      metadata: finalMetadata,
      webhookUrl: webhookUrl || null,
      events: [
        {
          event: "Created",
          operator: shipperAddress,
          timestamp: new Date(),
          onChainTxHash: receipt.transactionHash,
        },
      ],
    });

    // 7. Increment shipment usage counter or apply pay-as-you-go metered overage in USD only AFTER successful registration
    if (shipmentCount >= totalAllowed) {
      const OVERAGE_RATES_USD: Record<string, number> = {
        pro_starter: 0.02,
        pro_growth: 0.015,
        pro_scale: 0.01,
        pro: 0.015,
      };
      const overageRate = OVERAGE_RATES_USD[shipper.plan] || 0.02;
      await db.user.findByIdAndUpdate(shipper._id, {
        $inc: { overageCharges: overageRate, shipmentsThisMonth: 1 },
      });
    } else {
      await db.user.findByIdAndUpdate(shipper._id, {
        $inc: { shipmentsThisMonth: 1 },
      });
    }

    const cleanId = packageId.startsWith("0x") ? packageId.slice(2) : packageId;
    const trackingCode = `RCV-${cleanId.slice(0, 12).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      packageId,
      trackingCode,
      innerSecret,
      shipment: newShipment,
    });
  } catch (error: unknown) {
    console.error("Failed to register shipment:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create shipment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
