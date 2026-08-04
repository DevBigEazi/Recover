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
    const { operatorAddress, nextHandlerAddress, nextHandler, location, locationContext } = body;
    const targetNextHandler = nextHandlerAddress || nextHandler;

    await connectDB();

    const authHeader = request.headers.get("authorization");
    const xApiKeyHeader = request.headers.get("x-api-key");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
    const apiKeyToken = bearerToken || xApiKeyHeader;

    let effectiveOperatorAddress = operatorAddress;
    if (apiKeyToken) {
      const apiKeyUser = await db.user.findOne({ apiKey: apiKeyToken });
      if (!apiKeyUser) {
        return NextResponse.json({ error: "Invalid or unauthorized API key provided." }, { status: 401 });
      }
      effectiveOperatorAddress = effectiveOperatorAddress || apiKeyUser._id;
    }

    if (!effectiveOperatorAddress || !targetNextHandler) {
      return NextResponse.json({ error: "Operator and nextHandler addresses are required." }, { status: 400 });
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
          id as `0x${string}`,
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
      params: [id as `0x${string}`, nextHandlerAddress, BigInt(deadline), signature],
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
    shipment.status = "InTransit";
    shipment.events.push({
      event: "InTransit",
      operator: nextHandlerAddress,
      location: location || null,
      locationContext: locationContext || null,
      timestamp: new Date(),
      onChainTxHash: receipt.transactionHash,
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
            event: "package.handover",
            timestamp: new Date().toISOString(),
            data: {
              packageId: id,
              companyName: shipperUser?.companyName || shipperUser?.fullName || "Merchant",
              shipperAddress: shipment.shipperAddress,
              packageName: shipment.metadata?.name || "Package",
              status: "InTransit",
              operator: nextHandlerAddress,
              location: location || null,
              onChainTxHash: receipt.transactionHash,
            },
          }),
        });
      } catch (err) {
        console.error("Webhook notification failed:", err);
      }
    }


    return NextResponse.json({ success: true, shipment });
  } catch (error: unknown) {
    console.error("Handover failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to log handover";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
