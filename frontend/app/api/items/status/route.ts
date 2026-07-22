import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
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

    await connectDB();

    // 2. Fetch the item details from local MongoDB to retrieve owner Address
    const item = await db.item.findOne({
      _id: registrationId,
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

    // 4. Record original status for potential rollback
    const originalStatus = item.status;

    // 5. Update Database record status optimistically first.
    await db.item.updateOne(
      { _id: registrationId },
      {
        $set: { status: status },
      }
    );

    try {
      // 6. Fetch the owner's nonce from the blockchain contract
      const nonce = await readContract({
        contract: recoverContract,
        method: "function userNonces(address user) view returns (uint256)",
        params: [item.ownerAddress],
      });

      // 7. Generate signature parameters
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes expiration
      const chainId = 52014;
      const contractAddress = process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as `0x${string}`;
      const statusNumber = status === "Lost" ? 1 : 2; // 1 for Lost, 2 for Recovered

      // 8. Sign the message payload using Backend Signer key
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

      // 9. Prepare and broadcast the transition transaction via backend relayer
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

      // 10. Wait for block confirmation and verify event log
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

      // Clear existing finder reports on successful on-chain status transition
      await db.finderReport.deleteMany({
        registrationId: registrationId,
      });

      // Fetch and return the updated item to verify final state
      const updatedItem = await db.item.findOne({
        _id: registrationId,
      });

      return NextResponse.json(updatedItem ? updatedItem.toObject() : item.toObject(), { status: 200 });
    } catch (blockchainErr) {
      // Revert the DB status if the blockchain execution failed (revert/timeout)
      try {
        await db.item.updateOne(
          { _id: registrationId },
          {
            $set: { status: originalStatus },
          }
        );
      } catch (revertErr) {
        console.error("Failed to revert database status after blockchain transaction failure:", revertErr);
      }
      throw blockchainErr;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to update status on-chain:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
