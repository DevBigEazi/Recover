import { NextResponse } from "next/server";
import { db, connectDB } from "@/lib/db";
import { recoverContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt, parseEventLogs, prepareEvent } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { keccak256, encodePacked } from "thirdweb/utils";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ownerAddress,
      name,
      brand,
      serial,
      reward,
      contactInfo,
      phone,
      whatsapp,
      email,
      instructions,
      category,
      alternateContact,
      receiptData,
      secrets,
      passphrase,
      rewardType,
      image,
    } = body;

    // 1. Inputs validation
    if (!ownerAddress || !name) {
      return NextResponse.json(
        { error: "Owner Address and Item Name are required." },
        { status: 400 }
      );
    }

    if (category === "Phone" && (!alternateContact || alternateContact.trim() === "")) {
      return NextResponse.json(
        { error: "Trusted alternate contact details are required for Mobile Devices." },
        { status: 400 }
      );
    }

    // 2. Validate environment configuration
    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (!signerPrivateKey) {
      console.error("Missing BACKEND_SIGNER_PRIVATE_KEY in environment variables.");
      return NextResponse.json(
        { error: "Backend signer configuration is missing on the server. Please verify your environment files." },
        { status: 500 }
      );
    }

    // 3. Compute off-chain metadata hash (itemHash)
    const metadataToHash = {
      name: name.trim(),
      brand: brand?.trim() || "",
      serial: serial?.trim() || "",
      rewardType: rewardType || "custom",
      reward: reward?.trim() || "",
      contactInfo: contactInfo?.trim() || "",
      phone: phone?.trim() || "",
      whatsapp: whatsapp?.trim() || "",
      email: email?.trim() || "",
      instructions: instructions?.trim() || "",
      alternateContact: alternateContact?.trim() || "",
      category: category || "Other",
      receiptHash: receiptData ? crypto.createHash("sha256").update(receiptData).digest("hex") : "",
      secretsHash: secrets ? crypto.createHash("sha256").update(secrets).digest("hex") : "",
      passphraseHash: passphrase ? crypto.createHash("sha256").update(passphrase).digest("hex") : "",
      imageHash: image ? crypto.createHash("sha256").update(image).digest("hex") : "",
      ownerAddress: ownerAddress.toLowerCase(),
    };
    
    const itemHash = "0x" + crypto.createHash("sha256").update(JSON.stringify(metadataToHash)).digest("hex");

    await connectDB();

    // 4. Check if an active record with the same owner and itemHash already exists in the database
    const existingActiveItem = await db.item.findOne({
      ownerAddress: ownerAddress.toLowerCase(),
      itemHash,
      status: "Active",
    });

    if (existingActiveItem) {
      return NextResponse.json(existingActiveItem, { status: 200 });
    }

    // 5. Save details in local Mongoose database as PENDING first.
    // If the database has connection or schema issues, it will fail here before any transaction is broadcast on-chain.
    const tempId = `pending_${itemHash}`;
    await db.item.findOneAndUpdate(
      { _id: tempId },
      {
        $set: {
          ownerAddress: ownerAddress.toLowerCase(),
          name: name.trim(),
          brand: brand?.trim() || null,
          serial: serial?.trim() || null,
          reward: reward?.trim() || null,
          contactInfo: contactInfo?.trim() || null,
          phone: phone?.trim() || null,
          whatsapp: whatsapp?.trim() || null,
          email: email?.trim() || null,
          instructions: instructions?.trim() || null,
          itemHash,
          status: "Pending",
          category: category || "Other",
          alternateContact: alternateContact?.trim() || null,
          receiptData: receiptData || null,
          secrets: secrets || null,
          passphrase: passphrase || null,
          image: image || null,
          rewardType: rewardType || "custom",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      // 6. Fetch the owner's nonce from the blockchain contract
      const nonce = await readContract({
        contract: recoverContract,
        method: "function userNonces(address user) view returns (uint256)",
        params: [ownerAddress],
      });

      // 7. Generate signature parameters
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes expiration
      const chainId = 52014;
      const contractAddress = process.env.NEXT_PUBLIC_RECOVER_CONTRACT_ADDRESS as `0x${string}`;

      // 8. Sign the message payload using Backend Signer key
      const messageHash = keccak256(
        encodePacked(
          ["address", "bytes32", "uint256", "uint256", "uint256", "address"],
          [
            ownerAddress,
            itemHash as `0x${string}`,
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

      // 9. Prepare and broadcast the transaction via backend relayer
      const transaction = prepareContractCall({
        contract: recoverContract,
        method: "function registerItem(address owner, bytes32 itemHash, uint256 deadline, bytes signature) returns (uint256)",
        params: [ownerAddress, itemHash as `0x${string}`, BigInt(deadline), signature],
      });

      const txResult = await sendTransaction({
        transaction,
        account: relayerAccount,
      });

      // 10. Wait for receipt and extract registration ID from events
      const receipt = await waitForReceipt({
        client,
        chain: recoverContract.chain,
        transactionHash: txResult.transactionHash,
      });

      const itemRegisteredEvent = prepareEvent({
        signature: "event ItemRegistered(uint256 indexed registrationId, address indexed owner, bytes32 itemHash, uint256 timestamp)",
      });

      const logs = parseEventLogs({
        logs: receipt.logs,
        events: [itemRegisteredEvent],
      });

      if (logs.length === 0) {
        throw new Error("ItemRegistered event log not found in receipt.");
      }

      const registrationId = logs[0].args.registrationId.toString();

      // 11. Replace the temporary Pending record with the final Active record in MongoDB.
      // Delete pending record
      await db.item.deleteOne({ _id: tempId });

      // Create the active record with final registrationId
      const item = await db.item.create({
        _id: registrationId,
        ownerAddress: ownerAddress.toLowerCase(),
        name: name.trim(),
        brand: brand?.trim() || null,
        serial: serial?.trim() || null,
        reward: reward?.trim() || null,
        contactInfo: contactInfo?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim() || null,
        instructions: instructions?.trim() || null,
        itemHash,
        status: "Active",
        category: category || "Other",
        alternateContact: alternateContact?.trim() || null,
        receiptData: receiptData || null,
        secrets: secrets || null,
        passphrase: passphrase || null,
        image: image || null,
        rewardType: rewardType || "custom",
      });

      return NextResponse.json(item, { status: 201 });
    } catch (blockchainErr) {
      // If the blockchain execution failed (revert/timeout), clean up the pending DB entry.
      try {
        await db.item.deleteOne({ _id: tempId });
      } catch (cleanupErr) {
        console.error("Failed to clean up pending record after blockchain failure:", cleanupErr);
      }
      throw blockchainErr;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Failed to register item in database:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
