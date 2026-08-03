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
    const { shipperAddress, webhookUrl, metadata } = body;

    if (!shipperAddress) {
      return NextResponse.json({ error: "Shipper address is required." }, { status: 400 });
    }

    await connectDB();

    // 1. Monetization check: Validate shipper's subscription status
    const shipper = await db.user.findById(shipperAddress.toLowerCase());
    const isSubscriptionActive = shipper?.subscriptionActive === true;

    if (!isSubscriptionActive) {
      return NextResponse.json(
        {
          error: "Active subscription required. Please upgrade to Pro/Enterprise to track packages.",
          upgradeUrl: "/settings",
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

    // 3. Obtain current nonce from contract
    const nonce = await readContract({
      contract: recoverShipmentContract,
      method: "function userNonces(address user) view returns (uint256)",
      params: [shipperAddress],
    });

    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes deadline
    const chainId = 52014;
    const contractAddress = process.env.NEXT_PUBLIC_RECOVER_SHIPMENT_CONTRACT_ADDRESS as `0x${string}`;

    // 4. Generate backend signature
    const messageHash = keccak256(
      encodePacked(
        ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
        [
          shipperAddress,
          packageId as `0x${string}`,
          packageHash,
          BigInt(nonce),
          BigInt(deadline),
          BigInt(chainId),
          contractAddress,
        ]
      )
    );

    const relayerAccount = privateKeyToAccount({
      client,
      privateKey: signerPrivateKey.startsWith("0x") ? signerPrivateKey : `0x${signerPrivateKey}`,
    });

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
      innerSecretHash: packageHash,
      metadata: metadata || null,
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

    return NextResponse.json({
      success: true,
      packageId,
      innerSecret,
      shipment: newShipment,
    });
  } catch (error: unknown) {
    console.error("Failed to register shipment:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create shipment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
