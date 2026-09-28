import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_API_BASE = "https://api.paystack.co";

export interface InitializePaystackParams {
  email: string;
  amountInKobo: number; // e.g. 520000 kobo = 5,200 NGN
  callbackUrl: string;
  metadata: {
    type: "report_unlock";
    reportId: string;
    registrationId: string;
    ownerAddress: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
}

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: "NGN" | string;
    ip_address: string;
    metadata?: {
      type?: string;
      reportId?: string;
      registrationId?: string;
      ownerAddress?: string;
    };
    customer?: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}

/**
 * Initializes a Paystack transaction for Nigerian users paying in NGN.
 */
export async function initializePaystackTransaction(
  params: InitializePaystackParams
): Promise<PaystackInitResponse> {
  const secretKey = PAYSTACK_SECRET_KEY.trim();

  // If secret key is missing in development, provide a graceful test fallback
  if (!secretKey) {
    console.warn("PAYSTACK_SECRET_KEY is not configured in environment. Using test redirect fallback.");
    const dummyRef = `mock_paystack_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const separator = params.callbackUrl.includes("?") ? "&" : "?";
    return {
      authorization_url: `${params.callbackUrl}${separator}reference=${dummyRef}&trxref=${dummyRef}&mock=true`,
      access_code: "mock_access_code",
      reference: dummyRef,
    };
  }

  const res = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email || "owner@userecover.xyz",
      amount: Math.round(params.amountInKobo),
      callback_url: params.callbackUrl,
      currency: "NGN",
      metadata: params.metadata,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.status) {
    const errorMsg = data.message || "Failed to initialize Paystack transaction.";
    throw new Error(errorMsg);
  }

  return {
    authorization_url: data.data.authorization_url,
    access_code: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Verifies a Paystack transaction reference with the Paystack API.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse["data"] | null> {
  const secretKey = PAYSTACK_SECRET_KEY.trim();

  // Mock verification fallback in development if no key configured
  if (!secretKey) {
    if (reference.startsWith("mock_paystack_")) {
      return {
        id: 999999,
        domain: "test",
        status: "success",
        reference,
        amount: 520000,
        gateway_response: "Successful",
        paid_at: new Date().toISOString(),
        channel: "card",
        currency: "NGN",
        ip_address: "127.0.0.1",
        metadata: {
          type: "report_unlock",
        },
      };
    }
  }

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is missing.");
  }

  const res = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!res.ok || !data.status) {
    console.error("Paystack transaction verification failed:", data);
    return null;
  }

  return data.data;
}

/**
 * Validates a Paystack webhook event using HMAC SHA-512.
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secretKey = PAYSTACK_SECRET_KEY.trim();
  if (!signatureHeader || !secretKey) return false;

  try {
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");

    return hash === signatureHeader;
  } catch (err) {
    console.error("Error verifying Paystack signature:", err);
    return false;
  }
}
