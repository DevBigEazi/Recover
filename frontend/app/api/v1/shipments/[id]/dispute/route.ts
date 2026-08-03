import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { recoverShipmentContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recipientAddress, reason, location, locationContext } = body;

    if (!recipientAddress || !reason) {
      return NextResponse.json({ error: "Recipient address and reason are required." }, { status: 400 });
    }

    await connectDB();

    const shipment = await db.shipment.findById(id);
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      return NextResponse.json({ error: "Backend signer configuration missing." }, { status: 500 });
    }

    // 1. Fetch current nonce from contract
    const nonce = await readContract({
      contract: recoverShipmentContract,
      method: "function userNonces(address user) view returns (uint256)",
      params: [recipientAddress],
    });

    const deadline = Math.floor(Date.now() / 1000) + 600;
    const chainId = 52014;
    const contractAddress = process.env.NEXT_PUBLIC_RECOVER_SHIPMENT_CONTRACT_ADDRESS as `0x${string}`;

    // 2. Generate backend witness signature
    const messageHash = keccak256(
      encodePacked(
        ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
        [
          recipientAddress,
          id as `0x${string}`,
          keccak256(encodePacked(["string"], [reason])),
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

    // 3. Prepare and send transaction
    const transaction = prepareContractCall({
      contract: recoverShipmentContract,
      method: "function disputeDelivery(bytes32 packageId, string reason, uint256 deadline, bytes signature)",
      params: [id as `0x${string}`, reason, BigInt(deadline), signature],
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
      operator: recipientAddress,
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
            recipient: recipientAddress,
            reason,
            location,
            timestamp: new Date(),
          }),
        });
      } catch (err) {
        console.error("Webhook notification failed:", err);
      }
    }

    return NextResponse.json({ success: true, shipment });
  } catch (error: unknown) {
    console.error("Dispute failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to log dispute";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
