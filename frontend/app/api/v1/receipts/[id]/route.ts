import { NextRequest, NextResponse } from "next/server";
import { connectDB, db, IReceiptItem } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";
import { canEditReceipt } from "@/lib/permissions";

export async function GET(
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
    const receipt = await db.receipt.findById(id);

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (receipt.merchantAddress.toLowerCase() !== merchant._id.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized access to this receipt." }, { status: 403 });
    }

    let linkedShipment = null;
    if (receipt.linkedShipmentId) {
      linkedShipment = await db.shipment.findById(receipt.linkedShipmentId);
    }

    return NextResponse.json({
      success: true,
      receipt,
      linkedShipment,
    });
  } catch (err: unknown) {
    console.error("Receipt detail error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { shipper: merchant, error, status, actor } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { id } = await params;
    const receipt = await db.receipt.findById(id);

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    if (receipt.merchantAddress.toLowerCase() !== merchant._id.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized access to this receipt." }, { status: 403 });
    }

    if (receipt.status === "Voided") {
      return NextResponse.json({ error: "Cannot edit a voided receipt." }, { status: 400 });
    }

    const currentActor = actor || {
      address: merchant._id.toLowerCase(),
      name: merchant.displayName || "Owner",
      role: "owner" as const,
      branchId: null,
      branchName: null,
    };

    if (!canEditReceipt(currentActor, receipt)) {
      return NextResponse.json(
        { error: "Unauthorized: You do not have permission to edit or re-issue this receipt." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { items, discount, tax, customerName, customerPhone, customerEmail, editReason } = body;

    const previousTotal = receipt.total;
    const changeList: string[] = [];

    if (customerName !== undefined && customerName !== receipt.customerName) {
      changeList.push(`Customer name updated from "${receipt.customerName || 'None'}" to "${customerName}"`);
      receipt.customerName = customerName;
    }

    if (customerPhone !== undefined && customerPhone !== receipt.customerPhone) {
      changeList.push("Customer phone updated");
      receipt.customerPhone = customerPhone;
    }

    if (customerEmail !== undefined && customerEmail !== receipt.customerEmail) {
      changeList.push("Customer email updated");
      receipt.customerEmail = customerEmail;
    }

    if (Array.isArray(items) && items.length > 0) {
      const processedItems: IReceiptItem[] = [];
      let subtotal = 0;
      for (const raw of items) {
        const name = String(raw.name || "").trim();
        const quantity = Math.floor(Number(raw.quantity));
        const unitPrice = Number(raw.unitPrice);
        if (!name || isNaN(quantity) || quantity < 1 || isNaN(unitPrice) || unitPrice < 0) {
          return NextResponse.json({ error: `Invalid item data for "${name}".` }, { status: 400 });
        }
        const lineTotal = quantity * unitPrice;
        subtotal += lineTotal;
        processedItems.push({ name, quantity, unitPrice, lineTotal });
      }

      const numDiscount = discount !== undefined ? Math.max(0, Number(discount) || 0) : receipt.discount;
      const numTax = tax !== undefined ? Math.max(0, Number(tax) || 0) : receipt.tax;
      const newTotal = Math.max(0, subtotal - numDiscount + numTax);

      receipt.items = processedItems;
      receipt.subtotal = subtotal;
      receipt.discount = numDiscount;
      receipt.tax = numTax;
      receipt.total = newTotal;
      changeList.push(`Line items updated. New total: ₦${newTotal.toLocaleString()}`);
    }

    const reasonSummary = editReason ? `Reason: ${editReason}. ` : "";
    const description = `${reasonSummary}${changeList.join("; ") || "Receipt metadata updated"}`;

    receipt.editHistory = receipt.editHistory || [];
    receipt.editHistory.push({
      editedAt: new Date(),
      editedBy: {
        address: currentActor.address,
        name: currentActor.name,
        role: currentActor.role,
        branchId: currentActor.branchId || null,
        branchName: currentActor.branchName || null,
      },
      changes: description,
      previousTotal,
    });

    await receipt.save();

    return NextResponse.json({
      success: true,
      message: "Receipt updated successfully.",
      receipt,
    });
  } catch (err: unknown) {
    console.error("Receipt update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
