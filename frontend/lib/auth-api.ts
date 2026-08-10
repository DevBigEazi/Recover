import { db, connectDB, IUser } from "@/lib/db";
import crypto from "crypto";

export interface AuthApiResult {
  shipper: IUser | null;
  isTest: boolean;
  error?: string;
  status?: number;
}

export async function getShipperFromApiKey(apiKeyToken: string | null | undefined): Promise<AuthApiResult> {
  if (!apiKeyToken || !apiKeyToken.trim()) {
    return {
      shipper: null,
      isTest: false,
      error: "API key is required.",
      status: 401,
    };
  }

  await connectDB();

  const cleanToken = apiKeyToken.trim();
  const isTestToken = cleanToken.startsWith("rec_test_");
  const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

  const shipper = await db.user.findOne({
    $or: [
      { testApiKeyHash: tokenHash },
      { apiKeyHash: tokenHash },
      { testApiKey: cleanToken },
      { apiKey: cleanToken },
    ],
  });

  if (!shipper) {
    return {
      shipper: null,
      isTest: isTestToken,
      error: "Invalid or unauthorized API key provided.",
      status: 401,
    };
  }

  if (shipper.role !== "merchant") {
    return {
      shipper,
      isTest: isTestToken,
      error: "Developer API access is only enabled for logistics merchant accounts.",
      status: 403,
    };
  }

  const isTest = isTestToken || shipper.testApiKeyHash === tokenHash || shipper.testApiKey === cleanToken;

  return { shipper, isTest };
}
