import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt, parseEventLogs, prepareEvent } from "thirdweb";
import { recoverContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked, stringToBytes } from "thirdweb/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, reason } = body;

    // 1. Validate inputs
    if (!registrationId || !reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "Registration ID and a mandatory deletion reason are required." },
        { status: 400 }
      );
    }

    // 2. Fetch the item details from local Prisma DB
    const item = await db.item.findUnique({
      where: { registrationId: registrationId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in database." }, { status: 404 });
    }

    // 3. Verify request owner matches DB owner address
    const requestOwner = request.headers.get("x-owner-address")?.toLowerCase();
    if (!requestOwner || requestOwner !== item.ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized access: Owner mismatch." }, { status: 401 });
    }

    // 4. Validate environment configuration
    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("Missing BACKEND_SIGNER_PRIVATE_KEY in environment variables.");
      return NextResponse.json(
        { error: "Backend signer configuration is missing on the server. Please check your environment variables." },
        { status: 500 }
      );
    }

    // 5. Fetch the owner's nonce from the smart contract
    const nonce = await readContract({
      contract: recoverContract,
      method: "function userNonces(address user) view returns (uint256)",
      params: [item.ownerAddress],
    });

    // 6. Generate signature parameters
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes expiration
    const chainId = 52014;
    const contractAddress = process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as `0x${string}`;

    // Hash the reason string (keccak256(bytes(reason)))
    const reasonBytes = stringToBytes(reason.trim());
    const reasonHash = keccak256(reasonBytes);

    // 7. Sign the message payload using Backend Signer key
    const messageHash = keccak256(
      encodePacked(
        ["uint256", "bytes32", "uint256", "uint256", "uint256", "address"],
        [
          BigInt(registrationId),
          reasonHash,
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

    // 8. Prepare and broadcast the deleteItem transaction via backend relayer
    const transaction = prepareContractCall({
      contract: recoverContract,
      method: "function deleteItem(uint256 registrationId, string reason, uint256 deadline, bytes signature)",
      params: [BigInt(registrationId), reason.trim(), BigInt(deadline), signature],
    });

    const txResult = await sendTransaction({
      transaction,
      account: relayerAccount,
    });

    // 9. Wait for block confirmation
    const receipt = await waitForReceipt({
      client,
      chain: recoverContract.chain,
      transactionHash: txResult.transactionHash,
    });

    const deleteEvent = prepareEvent({
      signature: "event ItemDeleted(uint256 indexed registrationId, address indexed owner, string reason, uint256 timestamp)",
    });

    const logs = parseEventLogs({
      logs: receipt.logs,
      events: [deleteEvent],
    });

    if (logs.length === 0) {
      console.warn("ItemDeleted event log not found in receipt, but transaction succeeded.");
    }

    // 10. Permanently delete item record and linked reports/notifications from local DB
    await db.item.delete({
      where: { registrationId: registrationId },
    });

    return NextResponse.json(
      { success: true, registrationId, reason: reason.trim(), txHash: txResult.transactionHash },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to delete item on-chain:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
