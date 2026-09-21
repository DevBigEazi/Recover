import { keccak256, stringToHex } from "thirdweb/utils";

export interface CanonicalReceiptPayload {
  receiptNumber: string;
  merchantAddress: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  createdAt: number;
}

/**
 * Computes a deterministic canonical cryptographic keccak256 hash for a digital receipt.
 */
export function computeReceiptHash(payload: CanonicalReceiptPayload): `0x${string}` {
  const canonicalData = {
    createdAt: payload.createdAt,
    currency: payload.currency,
    discount: payload.discount,
    items: payload.items.map((it) => ({
      lineTotal: it.lineTotal,
      name: it.name.trim(),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    merchantAddress: payload.merchantAddress.toLowerCase(),
    paymentMethod: payload.paymentMethod,
    receiptNumber: payload.receiptNumber,
    subtotal: payload.subtotal,
    tax: payload.tax,
    total: payload.total,
  };

  const jsonString = JSON.stringify(canonicalData);
  return keccak256(stringToHex(jsonString));
}
