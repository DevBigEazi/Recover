import { NextRequest, NextResponse } from "next/server";
import { connectDB, db, IReceiptItem } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { hasPermission } from "@/lib/permissions";
import { computeReceiptHash } from "@/lib/receipt-hash";
import { recoverReceiptContract } from "@/lib/contract";
import { client } from "@/lib/client";
import { privateKeyToAccount } from "thirdweb/wallets";
import { readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { keccak256, encodePacked } from "thirdweb/utils";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { shipper: merchant, error, status, actor } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const body = await req.json();
    const {
      items,
      discount = 0,
      tax = 0,
      paymentMethod = "Cash",
      amountPaid = null,
      creditDueDate = null,
      creditNotes = null,
      customerName = null,
      customerPhone = null,
      customerEmail = null,
      fulfillmentType = "spot",
      parentReceiptNumber = null,
    } = body;

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Receipt must contain at least one line item." }, { status: 400 });
    }

    const processedItems: IReceiptItem[] = [];
    let subtotal = 0;

    for (const raw of items) {
      const name = String(raw.name || "").trim();
      const quantity = Math.floor(Number(raw.quantity));
      const unitPrice = Number(raw.unitPrice);

      if (!name) {
        return NextResponse.json({ error: "Each item must have a valid name." }, { status: 400 });
      }
      if (isNaN(quantity) || quantity < 1) {
        return NextResponse.json({ error: `Invalid quantity for item "${name}". Must be at least 1.` }, { status: 400 });
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: `Invalid unit price for item "${name}". Cannot be negative.` }, { status: 400 });
      }

      const lineTotal = quantity * unitPrice;
      subtotal += lineTotal;

      processedItems.push({
        name,
        quantity,
        unitPrice,
        lineTotal,
      });
    }

    const numDiscount = Math.max(0, Number(discount) || 0);
    const numTax = Math.max(0, Number(tax) || 0);
    const total = Math.max(0, subtotal - numDiscount + numTax);

    // Validate Credit payment channel requirements
    if (paymentMethod === "Credit") {
      if (actor && !hasPermission(actor.role, "sell_credit")) {
        return NextResponse.json(
          { error: "Sales Reps are not permitted to issue store credit. A Manager or Owner must record credit sales." },
          { status: 403 }
        );
      }
      const trimmedCustomerName = customerName ? String(customerName).trim() : "";
      if (!trimmedCustomerName) {
        return NextResponse.json(
          { error: "Customer name is required when issuing items on Store Credit so you can track who owes you." },
          { status: 400 }
        );
      }
    }

    const numAmountPaid =
      paymentMethod === "Credit"
        ? Math.max(0, Number(amountPaid) || 0)
        : total;

    const paymentStatus: "paid" | "unpaid" | "partially_paid" =
      paymentMethod === "Credit"
        ? numAmountPaid >= total
          ? "paid"
          : numAmountPaid > 0
          ? "partially_paid"
          : "unpaid"
        : "paid";

    const parsedCreditDueDate = creditDueDate ? new Date(creditDueDate) : null;
    const parsedCreditNotes = creditNotes ? String(creditNotes).trim() : null;

    // Generate unique receipt number e.g. RCVR-REC-2026-XXXXXXX
    const year = new Date().getFullYear();
    let receiptNumber = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      attempts++;
      const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
      receiptNumber = `RCVR-REC-${year}-${randomSuffix}`;
      const existing = await db.receipt.findById(receiptNumber);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: "Could not allocate unique receipt number. Please retry." }, { status: 500 });
    }

    const createdAtTimestamp = Date.now();

    // Compute canonical cryptographic hash
    const receiptHash = computeReceiptHash({
      receiptNumber,
      merchantAddress: merchant._id.toLowerCase(),
      items: processedItems,
      currency: "NGN",
      subtotal,
      discount: numDiscount,
      tax: numTax,
      total,
      paymentMethod,
      createdAt: createdAtTimestamp,
    });

    // Check parent voided receipt if provided
    let parentReceiptHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (parentReceiptNumber) {
      const parentDoc = await db.receipt.findById(parentReceiptNumber);
      if (parentDoc) {
        if (parentDoc.status !== "Voided") {
          return NextResponse.json(
            { error: `Parent receipt ${parentReceiptNumber} is still active and cannot be corrected until voided.` },
            { status: 400 }
          );
        }
        parentReceiptHash = parentDoc.receiptHash as `0x${string}`;
      }
    }

    // Anchor on Electroneum Mainnet via backend relayer
    let txHash: string | null = null;
    const signerPrivateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;

    if (signerPrivateKey) {
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

        const messageHash = keccak256(
          encodePacked(
            ["address", "bytes32", "bytes32", "uint256", "uint256", "uint256", "address"],
            [
              relayerAccount.address as `0x${string}`,
              receiptHash,
              parentReceiptHash,
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
          method:
            "function registerReceipt(bytes32 receiptHash, bytes32 parentReceiptHash, uint256 deadline, bytes signature)",
          params: [receiptHash, parentReceiptHash, BigInt(deadline), signature],
        });

        const txResult = await sendTransaction({
          transaction,
          account: relayerAccount,
        });

        const onChainReceipt = await waitForReceipt({
          client,
          chain: recoverReceiptContract.chain,
          transactionHash: txResult.transactionHash,
        });

        txHash = onChainReceipt.transactionHash;
      } catch (chainErr) {
        console.error("Relayer on-chain anchoring error:", chainErr);
        // We log error but don't fail receipt creation so POS merchant is never blocked
      }
    }

    // Optional dispatch creation bridge
    let linkedShipmentId: string | null = null;
    if (fulfillmentType === "dispatch") {
      try {
        const randomBytes = crypto.randomBytes(32);
        const packageId = `0x${randomBytes.toString("hex")}`;
        const secretCode = `RCVR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const secretHash = keccak256(encodePacked(["bytes32", "string"], [packageId as `0x${string}`, secretCode]));
        const trackingCode = `RCV-${packageId.slice(2, 14).toUpperCase()}`;

        await db.shipment.create({
          _id: packageId,
          shipperAddress: merchant._id.toLowerCase(),
          status: "Created",
          innerSecret: secretCode,
          innerSecretHash: secretHash,
          trackingCode,
          metadata: {
            receiptNumber,
            customerName: customerName || "Customer",
            itemCount: processedItems.length,
            total,
          },
          createdBy: actor
            ? {
                address: actor.address,
                name: actor.name,
                role: actor.role,
                branchId: actor.branchId,
                branchName: actor.branchName,
              }
            : {
                address: merchant._id.toLowerCase(),
                name: merchant.displayName || "Owner",
                role: "owner",
                branchId: null,
                branchName: null,
              },
          events: [
            {
              event: "Created",
              operator: actor ? actor.address : merchant._id.toLowerCase(),
              operatorName: actor?.name || merchant.displayName || "Owner",
              operatorBranch: actor?.branchName || null,
              timestamp: new Date(),
            },
          ],
        });
        linkedShipmentId = packageId;
      } catch (shipErr) {
        console.warn("Could not create linked shipment record:", shipErr);
      }
    }

    const resolvedMerchantName =
      merchant.companyName || merchant.fullName || merchant.displayName || "Business";
    const resolvedMerchantLogo = merchant.businessLogo || null;
    const resolvedMerchantPhone = merchant.phone || merchant.whatsapp || null;
    const resolvedMerchantEmail = merchant.email || null;

    // Save receipt to MongoDB
    const createdReceipt = await db.receipt.create({
      _id: receiptNumber,
      merchantAddress: merchant._id.toLowerCase(),
      merchantName: resolvedMerchantName,
      merchantLogo: resolvedMerchantLogo,
      merchantPhone: resolvedMerchantPhone,
      merchantEmail: resolvedMerchantEmail,
      items: processedItems,
      currency: "NGN",
      subtotal,
      discount: numDiscount,
      tax: numTax,
      total,
      paymentMethod,
      paymentStatus,
      amountPaid: numAmountPaid,
      creditDueDate: parsedCreditDueDate,
      creditSettledAt: paymentStatus === "paid" && paymentMethod === "Credit" ? new Date() : null,
      creditNotes: parsedCreditNotes,
      customerName,
      customerPhone,
      customerEmail,
      fulfillmentType,
      linkedShipmentId,
      branchId: actor?.branchId || null,
      issuedBy: actor
        ? {
            address: actor.address,
            name:
              actor.role === "owner"
                ? "CEO"
                : actor.role === "manager"
                ? "Manager"
                : actor.name || "Sales Rep",
            role: actor.role,
            branchId: actor.branchId,
            branchName: actor.branchName,
          }
        : {
            address: merchant._id.toLowerCase(),
            name: "CEO",
            role: "owner",
            branchId: null,
            branchName: null,
          },
      status: "Issued",
      parentReceiptNumber,
      receiptHash,
      onChainTxHash: txHash,
      onChainTimestamp: txHash ? new Date() : null,
    });

    // Update product presets in catalog asynchronously
    for (const item of processedItems) {
      await db.productPreset.findOneAndUpdate(
        {
          merchantAddress: merchant._id.toLowerCase(),
          name: item.name,
        },
        {
          $inc: { salesCount: item.quantity },
          $set: { defaultPrice: item.unitPrice, lastSoldAt: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    // Increment merchant operations quota count
    await db.user.updateOne(
      { _id: merchant._id.toLowerCase() },
      { $inc: { shipmentsThisMonth: 1 } }
    );

    return NextResponse.json(
      {
        success: true,
        receipt: createdReceipt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Receipt creation API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { shipper: merchant, error, status, actor } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const branchFilter = searchParams.get("branchId");
    const statusFilter = searchParams.get("status");
    const paymentFilter = searchParams.get("paymentMethod");
    const paymentStatusFilter = searchParams.get("paymentStatus");
    const unpaidCreditOnly = searchParams.get("unpaidCreditOnly") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 30));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      merchantAddress: merchant._id.toLowerCase(),
    };

    const isOwner = actor?.role === "owner";

    const mySalesOnly = searchParams.get("mySalesOnly") === "true";
    const staffAddressFilter = searchParams.get("staffAddress");

    const andConditions: Record<string, unknown>[] = [];

    if (!isOwner) {
      // Staff members (both Manager and Sales Rep) can see their own sales or their branch sales
      if (mySalesOnly && actor?.address) {
        query["issuedBy.address"] = actor.address.toLowerCase();
      } else {
        const staffBranchId = actor?.branchId || branchFilter;
        if (staffBranchId) {
          andConditions.push({
            $or: [
              { branchId: staffBranchId },
              { "issuedBy.branchId": staffBranchId },
            ],
          });
        } else if (actor?.address) {
          // Fallback to own sales if no branch assigned
          query["issuedBy.address"] = actor.address.toLowerCase();
        }
      }
    } else {
      // Owner has unrestricted access; can view all store sales or filter as desired
      if (mySalesOnly && actor?.address) {
        query["issuedBy.address"] = actor.address.toLowerCase();
      } else if (staffAddressFilter) {
        query["issuedBy.address"] = staffAddressFilter.toLowerCase();
      }

      if (branchFilter) {
        andConditions.push({
          $or: [
            { branchId: branchFilter },
            { "issuedBy.branchId": branchFilter },
          ],
        });
      }
    }

    if (unpaidCreditOnly) {
      query.paymentMethod = "Credit";
      query.paymentStatus = { $ne: "paid" };
      query.status = "Issued";
    } else {
      if (statusFilter && (statusFilter === "Issued" || statusFilter === "Voided")) {
        query.status = statusFilter;
      }

      if (paymentFilter && ["Cash", "Bank Transfer", "Card/POS", "Credit", "Other"].includes(paymentFilter)) {
        query.paymentMethod = paymentFilter;
      }

      if (paymentStatusFilter && ["paid", "unpaid", "partially_paid"].includes(paymentStatusFilter)) {
        query.paymentStatus = paymentStatusFilter;
      }
    }

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.createdAt = dateQuery;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      andConditions.push({
        $or: [
          { _id: regex },
          { customerName: regex },
          { customerPhone: regex },
          { "items.name": regex },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const [receipts, total] = await Promise.all([
      db.receipt.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      db.receipt.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("Receipts listing error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
