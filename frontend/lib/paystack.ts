/**
 * Paystack Integration Module
 * Official REST API integration for Nigerian market transactions (Cards, Bank Transfer, USSD, OPay).
 * Documentation: https://paystack.com/docs/api/transaction
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackInitParams {
  email: string;
  amountNgn: number;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  reference?: string;
}

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResult {
  verified: boolean;
  status: string;
  amountNgn: number;
  currency: string;
  reference: string;
  metadata: Record<string, unknown>;
  customerEmail: string | null;
}

/**
 * Initializes a transaction with Paystack in real-time.
 * Converts amount in NGN to Kobo (multiply by 100).
 */
export async function initializePaystackTransaction(
  params: PaystackInitParams
): Promise<PaystackInitResult> {
  const reference =
    params.reference ||
    `pstk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  if (!PAYSTACK_SECRET_KEY) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured in the server environment. Please set PAYSTACK_SECRET_KEY in deployment environment variables."
    );
  }

  const amountKobo = Math.round(params.amountNgn * 100);

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email.trim().toLowerCase(),
      amount: amountKobo,
      reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata || {},
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    const errorMsg = data.message || "Failed to initialize Paystack checkout session";
    throw new Error(`Paystack initialization failed: ${errorMsg}`);
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Verifies a Paystack transaction by its reference in real-time.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResult> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured in the server environment. Please set PAYSTACK_SECRET_KEY in deployment environment variables."
    );
  }

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok || !data.status || !data.data) {
    return {
      verified: false,
      status: data.data?.status || "failed",
      amountNgn: 0,
      currency: "NGN",
      reference,
      metadata: {},
      customerEmail: null,
    };
  }

  const tx = data.data;
  const isSuccess = tx.status === "success";

  return {
    verified: isSuccess,
    status: tx.status,
    amountNgn: (tx.amount || 0) / 100,
    currency: tx.currency || "NGN",
    reference: tx.reference || reference,
    metadata: (tx.metadata as Record<string, unknown>) || {},
    customerEmail: tx.customer?.email || null,
  };
}
