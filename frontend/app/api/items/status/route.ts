import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt, parseEventLogs, prepareEvent } from "thirdweb";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
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

    // 4. Record original status for potential rollback
    const originalStatus = item.status;

    // 5. Update Database record status optimistically first.
    // If the database has connection or locking issues, it will fail here before any transaction is broadcast on-chain.
    await db.item.update({
      where: { registrationId: registrationId },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });

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

      // Fetch and return the updated item to verify final state
      const updatedItem = await db.item.findUnique({
        where: { registrationId: registrationId },
      });

      if (status === "Recovered") {
        const messageText = `Item "${item.name}" has been marked as recovered.`;

        // 1. Log in DB
        await db.notification.create({
          data: {
            ownerAddress: item.ownerAddress,
            registrationId: item.registrationId,
            type: "recovered",
            message: messageText,
          },
        });

        // 2. Fetch owner preferences
        const ownerUser = await db.user.findUnique({
          where: { walletAddress: item.ownerAddress },
        });

        const isEmailEnabled = ownerUser ? ownerUser.emailNotifications : true;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // 3. Dispatch Email Notification
        if (isEmailEnabled && item.contactInfo) {
          const emailSubject = `[Recover] Item Marked Recovered: ${item.name}`;
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <div style="background-color: #0EA394; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="color: #ffffff; margin: 0; font-family: sans-serif;">Item Recovered 🎉</h2>
              </div>
              <div style="padding: 20px; color: #1f2937; line-height: 1.6;">
                <p>Hello,</p>
                <p>Your physical item <strong>"${item.name}"</strong> has been successfully marked as <strong>Recovered</strong> in our secure registry.</p>
                <p>We are thrilled that your item is back in your possession! The lost alert, reward details, and finder contact options have been deactivated on the public verification page.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/dashboard" style="background-color: #1E2A4A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                </div>
              </div>
            </div>
          `;
          await sendNotificationEmail(item.contactInfo, emailSubject, emailHtml);
        }

        // 4. Dispatch Web Push Alert
        await sendPushNotification(
          item.ownerAddress,
          "Item Recovered! 🎉",
          messageText,
          `/items/${item.registrationId}`
        );
      }

      return NextResponse.json(updatedItem || item, { status: 200 });
    } catch (blockchainErr) {
      // Revert the DB status if the blockchain execution failed (revert/timeout)
      try {
        await db.item.update({
          where: { registrationId: registrationId },
          data: {
            status: originalStatus,
            updatedAt: new Date(),
          },
        });
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
