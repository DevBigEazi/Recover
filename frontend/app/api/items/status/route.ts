import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt, parseEventLogs, prepareEvent } from "thirdweb";
import { recoverContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, status } = body;

    // 1. Validate inputs
    if (!registrationId || !status) {
      return NextResponse.json(
        { error: "Registration ID and Target Status are required." },
        { status: 400 }
      );
    }

    if (status !== "Lost" && status !== "Recovered") {
      return NextResponse.json(
        { error: "Invalid status transition. Allowed values: 'Lost', 'Recovered'." },
        { status: 400 }
      );
    }

    // 2. Fetch the item details from local Prisma DB to retrieve owner Address
    const item = await db.item.findUnique({
      where: { registrationId: registrationId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in database." }, { status: 404 });
    }

    // Verify request owner matches DB owner
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    if (!requestOwner || requestOwner !== item.ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized access: Owner mismatch." }, { status: 401 });
    }

    // 3. Validate environment configuration
    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("Missing BACKEND_SIGNER_PRIVATE_KEY in environment variables.");
      return NextResponse.json(
        { error: "Backend signer configuration is missing on the server. Please verify your environment files." },
        { status: 500 }
      );
    }

    // 4. Fetch the owner's nonce from the blockchain contract
    const nonce = await readContract({
      contract: recoverContract,
      method: "function userNonces(address user) view returns (uint256)",
      params: [item.ownerAddress],
    });

    // 5. Generate signature parameters
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes expiration
    const chainId = 52014;
    const contractAddress = process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as `0x${string}`;
    const statusNumber = status === "Lost" ? 1 : 2; // 1 for Lost, 2 for Recovered

    // 6. Sign the message payload using Backend Signer key
    const messageHash = keccak256(
      encodePacked(
        ["uint256", "uint8", "uint256", "uint256", "uint256", "address"],
        [
          BigInt(registrationId),
          statusNumber,
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

    // 7. Prepare and broadcast the transition transaction via backend relayer
    const methodSignature =
      status === "Lost"
        ? "function markLost(uint256 registrationId, uint256 deadline, bytes signature)"
        : "function markRecovered(uint256 registrationId, uint256 deadline, bytes signature)";

    const transaction = prepareContractCall({
      contract: recoverContract,
      method: methodSignature,
      params: [BigInt(registrationId), BigInt(deadline), signature],
    });

    const txResult = await sendTransaction({
      transaction,
      account: relayerAccount,
    });

    // 8. Wait for block confirmation and verify event log
    const receipt = await waitForReceipt({
      client,
      chain: recoverContract.chain,
      transactionHash: txResult.transactionHash,
    });

    const eventSignature =
      status === "Lost"
        ? "event ItemMarkedLost(uint256 indexed registrationId, uint256 timestamp)"
        : "event ItemRecovered(uint256 indexed registrationId, uint256 timestamp)";

    const statusEvent = prepareEvent({ signature: eventSignature });

    const logs = parseEventLogs({
      logs: receipt.logs,
      events: [statusEvent],
    });

    if (logs.length === 0) {
      throw new Error(`Failed to find status transition event in transaction receipt.`);
    }

    // 9. Update Database record status
    const updatedItem = await db.item.update({
      where: { registrationId: registrationId },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to update status on-chain:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
