import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface ReceiptPdfData {
  receiptNumber: string;
  merchantName: string;
  merchantLogo?: string | null;
  merchantAddress?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  currency?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  amountPaid?: number;
  creditDueDate?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  fulfillmentType: string;
  status: "Issued" | "Voided";
  voidReason?: string | null;
  receiptHash?: string;
  createdAt: string;
  publicUrl?: string;
}

export interface SalesReportPdfData {
  period: "daily" | "weekly" | "monthly" | "yearly";
  merchantName: string;
  merchantLogo?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  merchantAddress?: string | null;
  timeframe: {
    start: string;
    end: string;
  };
  summary: {
    grossRevenue: number;
    netRevenue: number;
    voidedRevenue: number;
    receiptsCount: number;
    issuedCount: number;
    voidedCount: number;
    totalUnitsSold: number;
    averageOrderValue: number;
    totalCreditOwed?: number;
    debtorsCount?: number;
  };
  paymentBreakdown: {
    cash: { total: number; count: number };
    bankTransfer: { total: number; count: number };
    cardPos: { total: number; count: number };
    credit?: { total: number; count: number; unpaidTotal?: number; unpaidCount?: number };
    other: { total: number; count: number };
  };
  topItems: Array<{ name: string; unitsSold: number; grossSales: number }>;
  debtors?: Array<{
    customerName: string;
    customerPhone?: string | null;
    totalOwed: number;
    receiptCount: number;
    oldestDueDate?: string | null;
  }>;
  receipts: Array<{
    _id?: string;
    receiptNumber?: string;
    status: "Issued" | "Voided";
    customerName?: string | null;
    paymentMethod: string;
    paymentStatus?: "paid" | "unpaid" | "partially_paid";
    amountPaid?: number;
    creditDueDate?: string | null;
    fulfillmentType?: string;
    total: number;
    createdAt: string;
  }>;
}

/**
 * Captures an HTML receipt element into a high-resolution retina canvas.
 * Includes automatic CSS color sanitization to convert modern oklab/oklch colors
 * from Tailwind v4 into standard hex/rgba supported by html2canvas.
 */
export async function captureReceiptElement(
  element: HTMLElement,
  scale: number = 2
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#FFFFFF",
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
      const canvas = clonedDoc.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const colorProps = [
        "color",
        "background-color",
        "border-color",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "outline-color",
        "text-decoration-color",
        "fill",
        "stroke",
      ];

      const allElements = [clonedEl, ...Array.from(clonedEl.querySelectorAll("*"))] as HTMLElement[];

      for (const el of allElements) {
        const computed = clonedDoc.defaultView?.getComputedStyle(el);
        if (!computed) continue;

        for (const prop of colorProps) {
          const val = computed.getPropertyValue(prop);
          if (val && (val.includes("oklab") || val.includes("oklch"))) {
            ctx.fillStyle = "#000000";
            ctx.fillStyle = val;
            el.style.setProperty(prop, ctx.fillStyle, "important");
          }
        }
      }
    },
  });
}

/**
 * Downloads a captured receipt element as an executive A4 invoice PDF.
 */
export async function generateReceiptPdf(
  element: HTMLElement,
  filename: string = "receipt"
): Promise<void> {
  const canvas = await captureReceiptElement(element, 2);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const marginX = 28;
  const marginY = 28;
  const pdfContentWidth = 539.28; // 595.28 - 56pt margins
  const pdfContentHeight = (canvas.height * pdfContentWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", marginX, marginY, pdfContentWidth, pdfContentHeight);

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanName);
}

/**
 * Generates a receipt PDF as a Blob.
 */
export async function generateReceiptPdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureReceiptElement(element, 2);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const marginX = 28;
  const marginY = 28;
  const pdfContentWidth = 539.28;
  const pdfContentHeight = (canvas.height * pdfContentWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", marginX, marginY, pdfContentWidth, pdfContentHeight);

  return doc.output("blob");
}

/**
 * Downloads a captured receipt element as a high-resolution PNG image.
 */
export async function generateReceiptImage(
  element: HTMLElement,
  filename: string = "receipt"
): Promise<void> {
  const canvas = await captureReceiptElement(element, 2);
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generates a receipt image as a PNG Blob (useful for Web Share API file attachments).
 */
export async function generateReceiptImageBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureReceiptElement(element, 2);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export receipt image blob"));
    }, "image/png");
  });
}

/**
 * Generates and downloads an official Sales Report Statement as a professional vector PDF.
 *
 * Layout: Landscape A4 (297mm × 210mm) — 269mm content width.
 * All monetary values use n.toLocaleString() — exact figures always, no rounding, no compacting.
 * Sections: KPI Summary Cards → Outstanding Debtors Ledger → Itemized Transactions → Period Totals.
 *
 * Note: Individual retail receipt PDFs (generateReceiptPdf / generateReceiptPdfBlob) remain
 * portrait A4 via html2canvas capture and are completely unaffected by this function.
 */
export async function generateSalesReportPdf(data: SalesReportPdfData): Promise<void> {
  // Landscape A4: pageW=297mm, pageH=210mm → cW=269mm content width
  const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW  = 297;
  const pageH  = 210;
  const margin = 14;
  const cW     = pageW - margin * 2; // 269mm
  const maxY   = pageH - margin;     // 196mm — page-break threshold
  let y = 16;

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(data.merchantName.toUpperCase(), margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (data.merchantPhone) { doc.text(`Phone: ${data.merchantPhone}`, margin, y); y += 4; }
  if (data.merchantEmail) { doc.text(`Email: ${data.merchantEmail}`, margin, y); y += 4; }
  if (data.merchantAddress && !data.merchantAddress.startsWith("0x")) {
    doc.text(`Address: ${data.merchantAddress}`, margin, y); y += 4;
  }

  // Right-side header block
  const rightX = pageW - margin;
  let hRY = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text("OFFICIAL SALES STATEMENT", rightX, hRY, { align: "right" });
  hRY += 5;
  doc.setFontSize(11);
  const periodTitle =
    data.period === "daily"   ? "Daily Sales & Close-of-Day Report"
    : data.period === "weekly"  ? "Weekly Sales & Performance Report"
    : data.period === "monthly" ? "Monthly Business Summary Statement"
    : "Annual / Yearly Financial Summary";
  doc.text(periodTitle, rightX, hRY, { align: "right" });
  hRY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const startStr = new Date(data.timeframe.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endStr   = new Date(data.timeframe.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  doc.text(`Period: ${startStr} - ${endStr}`, rightX, hRY, { align: "right" });
  hRY += 4;
  doc.text(`Generated: ${new Date().toLocaleString()}`, rightX, hRY, { align: "right" });

  y = Math.max(y, hRY) + 6;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── KPI CARDS (4 across 269mm) ────────────────────────────────────────────
  const cardW = (cW - 9) / 4;
  const cardH = 18;
  const kpis = [
    { label: "NET SALES REVENUE",   val: `NGN ${data.summary.netRevenue.toLocaleString()}` },
    { label: "RECEIPTS ISSUED",     val: `${data.summary.issuedCount} (${data.summary.voidedCount} voided)` },
    { label: "UNITS SOLD",          val: `${data.summary.totalUnitsSold} items` },
    { label: "AVERAGE ORDER (AOV)", val: `NGN ${data.summary.averageOrderValue.toLocaleString()}` },
  ];
  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 3.5, y + 5.5);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, cx + 3.5, y + 13);
  });
  y += cardH + 8;

  // ── OUTSTANDING CUSTOMER CREDIT & DEBTORS LEDGER ─────────────────────────
  const creditReceipts = data.receipts.filter(
    (r) => r.paymentMethod === "Credit" && r.status === "Issued" && r.paymentStatus !== "paid"
  );

  if (creditReceipts.length > 0) {
    if (y > maxY - 30) { doc.addPage(); y = 16; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("OUTSTANDING CUSTOMER CREDIT & DEBTORS LEDGER", margin, y);
    y += 2;

    const totalCreditOwed = data.summary.totalCreditOwed ?? 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Total outstanding across ${data.summary.debtorsCount ?? creditReceipts.length} debtor(s): NGN ${totalCreditOwed.toLocaleString()}`,
      margin, y + 4
    );
    y += 9;

    // Debtor ledger column right-edge anchors (landscape)
    const DL = {
      name:    margin + 2,
      receipt: margin + 80,
      date:    margin + 130,
      due:     margin + 165,
      totalR:  margin + 218,        // right-edge anchor
      owedR:   pageW - margin - 2,  // right-edge anchor
    };

    const renderDebtorHeader = (): void => {
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, cW, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text("CUSTOMER NAME", DL.name, y + 4.5);
      doc.text("RECEIPT #", DL.receipt, y + 4.5);
      doc.text("DATE", DL.date, y + 4.5);
      doc.text("DUE DATE", DL.due, y + 4.5);
      doc.text("TOTAL (NGN)", DL.totalR, y + 4.5, { align: "right" });
      doc.text("BALANCE OWED (NGN)", DL.owedR, y + 4.5, { align: "right" });
      y += 7;
    };
    renderDebtorHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    let debtorAlt = false;

    for (const r of creditReceipts) {
      if (y > maxY - 10) {
        doc.addPage(); y = 16;
        renderDebtorHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        debtorAlt = false;
      }
      if (debtorAlt) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, cW, 6.5, "F"); }
      debtorAlt = !debtorAlt;

      const custName = (r.customerName ?? "Unknown Customer").slice(0, 40);
      const rNum     = (r.receiptNumber ?? r._id ?? "–").slice(-18);
      const dateStr  = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const dueStr   = r.creditDueDate
        ? new Date(r.creditDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "–";
      const paid = r.amountPaid ?? 0;
      const owed = Math.max(0, r.total - paid);

      doc.setTextColor(15, 23, 42);
      doc.text(custName, DL.name, y + 4.2);
      doc.text(rNum, DL.receipt, y + 4.2);
      doc.text(dateStr, DL.date, y + 4.2);
      doc.text(dueStr, DL.due, y + 4.2);
      doc.text(r.total.toLocaleString(), DL.totalR, y + 4.2, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(153, 27, 27);
      doc.text(`NGN ${owed.toLocaleString()}`, DL.owedR, y + 4.2, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageW - margin, y + 6.5);
      y += 6.5;
    }

    // Debtor subtotal footer
    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, cW, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("TOTAL OUTSTANDING BALANCE", margin + 2, y + 5);
    doc.setTextColor(153, 27, 27);
    doc.text(`NGN ${totalCreditOwed.toLocaleString()}`, pageW - margin - 2, y + 5, { align: "right" });
    y += 13;
  }

  // ── ITEMIZED SALES TRANSACTIONS ──────────────────────────────────────────
  if (y > maxY - 30) { doc.addPage(); y = 16; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("ITEMIZED SALES TRANSACTIONS", margin, y);
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Complete record — ${data.receipts.length} transaction(s) for the selected period.`, margin, y + 4);
  y += 9;

  // Transaction column positions — landscape 269mm gives each money column ~40mm.
  // Right-edge anchors used for all three money columns so exact numbers never overlap.
  const C = {
    receipt:  margin + 2,    // left 16mm
    datetime: margin + 30,   // left 44mm  (28mm wide)
    customer: margin + 70,   // left 84mm  (40mm wide)
    method:   margin + 116,  // left 130mm (46mm wide)
    status:   margin + 152,  // left 166mm (36mm wide)
    totalR:   margin + 212,  // right-edge 226mm (~46mm from status — fits any exact number)
    paidR:    margin + 248,  // right-edge 262mm (~36mm)
    owedR:    pageW - margin - 2, // right-edge 281mm (~33mm)
  };

  const renderTxnHeader = (): void => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, cW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("RECEIPT #", C.receipt, y + 4.5);
    doc.text("DATE / TIME", C.datetime, y + 4.5);
    doc.text("CUSTOMER", C.customer, y + 4.5);
    doc.text("METHOD", C.method, y + 4.5);
    doc.text("STATUS", C.status, y + 4.5);
    doc.text("TOTAL (NGN)", C.totalR, y + 4.5, { align: "right" });
    doc.text("PAID (NGN)", C.paidR, y + 4.5, { align: "right" });
    doc.text("BALANCE (NGN)", C.owedR, y + 4.5, { align: "right" });
    y += 7;
  };

  renderTxnHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  let grandTotal = 0;
  let grandPaid  = 0;
  let grandOwed  = 0;
  let txnAlt     = false;

  for (const r of data.receipts) {
    if (y > maxY - 10) {
      doc.addPage(); y = 16;
      renderTxnHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      txnAlt = false;
    }

    if (txnAlt) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, cW, 6, "F"); }
    txnAlt = !txnAlt;

    const rNum   = (r.receiptNumber ?? r._id ?? "–").slice(-16);
    const dtStr  = new Date(r.createdAt).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const cust   = (r.customerName ?? "Walk-in").slice(0, 26);
    const method = (r.paymentMethod === "Credit" ? "Store Credit" : r.paymentMethod).slice(0, 18);
    const paid   = r.amountPaid ?? (r.paymentStatus === "paid" ? r.total : 0);
    const owed   = r.status === "Voided" ? 0 : Math.max(0, r.total - paid);

    if (r.status !== "Voided") { grandTotal += r.total; }
    grandPaid += paid;
    grandOwed += owed;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    doc.text(rNum, C.receipt, y + 4);
    doc.text(dtStr, C.datetime, y + 4);
    doc.text(cust, C.customer, y + 4);
    doc.text(method, C.method, y + 4);

    // Status — color-coded
    if (r.status === "Voided")           doc.setTextColor(153, 27, 27);
    else if (r.paymentStatus === "paid") doc.setTextColor(21, 128, 61);
    else                                 doc.setTextColor(120, 53, 15);
    doc.text(
      r.status === "Voided"                  ? "Voided"
        : r.paymentStatus === "paid"           ? "Paid"
        : r.paymentStatus === "partially_paid" ? "Partial"
        : "Unpaid",
      C.status, y + 4
    );
    doc.setTextColor(15, 23, 42);

    // Exact numbers — n.toLocaleString(), right-aligned, no rounding
    doc.text(r.total.toLocaleString(), C.totalR, y + 4, { align: "right" });
    doc.text(paid.toLocaleString(), C.paidR, y + 4, { align: "right" });

    if (owed > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(153, 27, 27);
    }
    doc.text(owed > 0 ? owed.toLocaleString() : "–", C.owedR, y + 4, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, pageW - margin, y + 6);
    y += 6;
  }

  // ── PERIOD TOTALS ROW ─────────────────────────────────────────────────────
  y += 2;
  if (y > maxY - 12) { doc.addPage(); y = 16; }
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, cW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("PERIOD TOTALS", C.receipt, y + 6.5);
  // Sub-labels
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text("GROSS REVENUE", C.totalR, y + 3.5, { align: "right" });
  doc.text("COLLECTED", C.paidR, y + 3.5, { align: "right" });
  doc.text("BALANCE OWED", C.owedR, y + 3.5, { align: "right" });
  // Exact totals
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`NGN ${grandTotal.toLocaleString()}`, C.totalR, y + 8, { align: "right" });
  doc.text(`NGN ${grandPaid.toLocaleString()}`, C.paidR, y + 8, { align: "right" });
  doc.setTextColor(252, 165, 165);
  doc.text(`NGN ${grandOwed.toLocaleString()}`, C.owedR, y + 8, { align: "right" });
  y += 16;

  // ── DOCUMENT FOOTER ───────────────────────────────────────────────────────
  if (y > maxY - 8) { doc.addPage(); y = 16; }
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated securely via Recover (https://userecover.xyz)", margin, y);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageW - margin, y, { align: "right" });

  doc.save(`${data.period}-sales-report-${Date.now()}.pdf`);
}
