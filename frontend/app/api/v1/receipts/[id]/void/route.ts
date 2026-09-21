import { NextRequest, NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { recoverReceiptContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { privateKeyToAccount } from "thirdweb/wallets";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { keccak256, encodePacked, stringToHex } from "thirdweb/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { shipper: merchant, error, status } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "Voided by merchant").trim();

    const receipt = await db.receipt.findById(id);
    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (receipt.merchantAddress.toLowerCase() !== merchant._id.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized: only the issuing merchant can void this receipt." }, { status: 403 });
    }

    if (receipt.status === "Voided") {
      return NextResponse.json({ error: "Receipt has already been voided." }, { status: 400 });
    }

    // Call smart contract voidReceipt via relayer
    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
    if (signerPrivateKey && receipt.receiptHash) {
      try {
        const relayerAccount = privateKeyToAccount({
          client,
          privateKey: signerPrivateKey.startsWith("0x") ? signerPrivateKey : `0x${signerPrivateKey}`,
        });

        const nonce = await readContract({
          contract: recoverReceiptContract,
          method: "function userNonces(address user) view returns (uint256)",
          params: [relayerAccount.address as `0x${string}`],
        });

        const deadline = Math.floor(Date.now() / 1000) + 600;
        const chainId = 52014;
        const contractAddress = process.env.NEXT_PUBLIC_RECOVER_RECEIPT_CONTRACT_ADDRESS as `0x${string}`;
        const reasonHash = keccak256(stringToHex(reason));

        const messageHash = keccak256(
          encodePacked(
            ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
            [
              relayerAccount.address as `0x${string}`,
              receipt.receiptHash as `0x${string}`,
              reasonHash,
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

        const transaction = prepareContractCall({
          contract: recoverReceiptContract,
          method: "function voidReceipt(bytes32 receiptHash, string reason, uint256 deadline, bytes signature)",
          params: [receipt.receiptHash as `0x${string}`, reason, BigInt(deadline), signature],
        });

        const txResult = await sendTransaction({
          transaction,
          account: relayerAccount,
        });

        await waitForReceipt({
          client,
          chain: recoverReceiptContract.chain,
          transactionHash: txResult.transactionHash,
        });
      } catch (chainErr) {
        console.error("On-chain voiding error:", chainErr);
      }
    }

    // Update in database
    receipt.status = "Voided";
    receipt.voidReason = reason;
    receipt.voidedAt = new Date();
    await receipt.save();

    return NextResponse.json({
      success: true,
      message: "Receipt voided successfully.",
      receipt,
    });
  } catch (err: unknown) {
    console.error("Void receipt error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
