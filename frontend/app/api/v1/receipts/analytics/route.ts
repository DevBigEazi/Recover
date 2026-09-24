import { NextRequest, NextResponse } from "next/server";
import { connectDB, db, IReceipt } from "@/lib/db";
import { getMerchantFromAuth } from "@/lib/auth-api";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { shipper: merchant, error, status, actor } = await getMerchantFromAuth(req);
    if (!merchant) {
      return NextResponse.json({ error: error || "Unauthorized merchant access." }, { status: status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const branchParam = searchParams.get("branchId");
    const mySalesOnly = searchParams.get("mySalesOnly") === "true";
    const staffAddressParam = searchParams.get("staffAddress");

    const now = dateParam ? new Date(dateParam) : new Date();
    let startTime = new Date();
    let endTime = new Date();

    if (period === "daily") {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "weekly") {
      // Last 7 days
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(now);
      endTime.setHours(23, 59, 59, 999);
    } else if (period === "monthly") {
      // 1st of month to end of month
      startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "yearly") {
      // Jan 1 to Dec 31
      startTime = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endTime = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === "custom" && startDateParam && endDateParam) {
      startTime = new Date(startDateParam);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(endDateParam);
      endTime.setHours(23, 59, 59, 999);
    }

    const query: Record<string, unknown> = {
      merchantAddress: merchant._id.toLowerCase(),
      createdAt: { $gte: startTime, $lte: endTime },
    };

    const isOwner = actor?.role === "owner";

    if (!isOwner) {
      // Staff members (both Manager and Sales Rep) can see their own sales or their branch sales
      if (mySalesOnly && actor?.address) {
        query["issuedBy.address"] = actor.address.toLowerCase();
      } else {
        const staffBranchId = actor?.branchId || branchParam;
        if (staffBranchId) {
          query.$or = [
            { branchId: staffBranchId },
            { "issuedBy.branchId": staffBranchId },
          ];
        } else if (actor?.address) {
          query["issuedBy.address"] = actor.address.toLowerCase();
        }
      }
    } else {
      // Owner has unrestricted access; can see all store sales or filter as desired
      if (branchParam) {
        query.$or = [
          { branchId: branchParam },
          { "issuedBy.branchId": branchParam },
        ];
      }

      if (mySalesOnly && actor?.address) {
        query["issuedBy.address"] = actor.address.toLowerCase();
      } else if (staffAddressParam) {
        query["issuedBy.address"] = staffAddressParam.toLowerCase();
      }
    }

    const receipts = (await db.receipt
      .find(query)
      .sort({ createdAt: -1 })
      .lean()) as unknown as IReceipt[];

    let grossRevenue = 0;
    let netRevenue = 0;
    let voidedRevenue = 0;
    let issuedCount = 0;
    let voidedCount = 0;
    let totalUnitsSold = 0;

    const paymentBreakdown = {
      cash: { total: 0, count: 0 },
      bankTransfer: { total: 0, count: 0 },
      cardPos: { total: 0, count: 0 },
      credit: { total: 0, count: 0, unpaidTotal: 0, unpaidCount: 0, paidTotal: 0 },
      other: { total: 0, count: 0 },
    };

    const itemMap = new Map<string, { name: string; unitsSold: number; grossSales: number }>();

    for (const r of receipts) {
      grossRevenue += r.total;
      const isIssued = r.status === "Issued";

      if (isIssued) {
        netRevenue += r.total;
        issuedCount += 1;

        // Payment method breakdown
        if (r.paymentMethod === "Cash") {
          paymentBreakdown.cash.total += r.total;
          paymentBreakdown.cash.count += 1;
        } else if (r.paymentMethod === "Bank Transfer") {
          paymentBreakdown.bankTransfer.total += r.total;
          paymentBreakdown.bankTransfer.count += 1;
        } else if (r.paymentMethod === "Card/POS") {
          paymentBreakdown.cardPos.total += r.total;
          paymentBreakdown.cardPos.count += 1;
        } else if (r.paymentMethod === "Credit") {
          paymentBreakdown.credit.total += r.total;
          paymentBreakdown.credit.count += 1;
          const paid = r.amountPaid || 0;
          const unpaid = Math.max(0, r.total - paid);
          if (r.paymentStatus === "paid" || unpaid === 0) {
            paymentBreakdown.credit.paidTotal += r.total;
          } else {
            paymentBreakdown.credit.unpaidTotal += unpaid;
            paymentBreakdown.credit.unpaidCount += 1;
          }
        } else {
          paymentBreakdown.other.total += r.total;
          paymentBreakdown.other.count += 1;
        }

        // Units sold and product breakdown
        if (Array.isArray(r.items)) {
          for (const it of r.items) {
            totalUnitsSold += it.quantity;
            const existing = itemMap.get(it.name) || { name: it.name, unitsSold: 0, grossSales: 0 };
            existing.unitsSold += it.quantity;
            existing.grossSales += it.lineTotal;
            itemMap.set(it.name, existing);
          }
        }
      } else {
        voidedRevenue += r.total;
        voidedCount += 1;
      }
    }

    // Active customer debtors across all active unpaid credit receipts
    const allUnpaidCreditDocs = (await db.receipt
      .find({
        merchantAddress: merchant._id.toLowerCase(),
        paymentMethod: "Credit",
        paymentStatus: { $ne: "paid" },
        status: "Issued",
      })
      .sort({ createdAt: -1 })
      .lean()) as unknown as IReceipt[];

    let totalCreditOwed = 0;
    const debtorMap = new Map<
      string,
      {
        customerName: string;
        customerPhone: string;
        totalOwed: number;
        receiptsCount: number;
        receiptNumbers: string[];
        latestDate: Date | string;
        dueDate: Date | string | null;
        soldBy: string;
        soldByRole?: string | null;
        branchName?: string | null;
      }
    >();

    for (const doc of allUnpaidCreditDocs) {
      const owed = Math.max(0, doc.total - (doc.amountPaid || 0));
      if (owed > 0) {
        totalCreditOwed += owed;
        const key = (doc.customerPhone || doc.customerName || "unknown").trim().toLowerCase();
        const sellerName = doc.issuedBy?.name || merchant.companyName || merchant.fullName || "Store Owner";
        const branchName = doc.issuedBy?.branchName || null;
        const sellerRole = doc.issuedBy?.role || "owner";

        const existing = debtorMap.get(key);
        if (existing) {
          existing.totalOwed += owed;
          existing.receiptsCount += 1;
          if (doc._id) existing.receiptNumbers.push(doc._id);
          if (sellerName && !existing.soldBy.includes(sellerName)) {
            existing.soldBy = `${existing.soldBy}, ${sellerName}`;
          }
        } else {
          debtorMap.set(key, {
            customerName: doc.customerName || "Unspecified Customer",
            customerPhone: doc.customerPhone || "No Phone",
            totalOwed: owed,
            receiptsCount: 1,
            receiptNumbers: doc._id ? [doc._id] : [],
            latestDate: doc.createdAt || new Date(),
            dueDate: doc.creditDueDate || null,
            soldBy: sellerName,
            soldByRole: sellerRole,
            branchName,
          });
        }
      }
    }

    const debtors = Array.from(debtorMap.values()).sort((a, b) => b.totalOwed - a.totalOwed);

    const averageOrderValue = issuedCount > 0 ? Math.round(netRevenue / issuedCount) : 0;
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);

    return NextResponse.json({
      success: true,
      period,
      merchant: {
        address: merchant._id.toLowerCase(),
        name: merchant.companyName || merchant.fullName || "Business",
        companyName: merchant.companyName || null,
        businessLogo: merchant.businessLogo || null,
        fullName: merchant.fullName || null,
        phone: merchant.phone || null,
        email: merchant.email || null,
      },
      timeframe: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
      summary: {
        grossRevenue,
        netRevenue,
        voidedRevenue,
        receiptsCount: receipts.length,
        issuedCount,
        voidedCount,
        totalUnitsSold,
        averageOrderValue,
        totalCreditOwed,
        debtorsCount: debtors.length,
      },
      debtors,
      paymentBreakdown,
      topItems,
      receipts,
    });
  } catch (err: unknown) {
    console.error("Sales analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
