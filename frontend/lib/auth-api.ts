import { db, connectDB, IUser } from "@/lib/db";
import crypto from "crypto";
import { serverAuth } from "@/lib/server-auth";

export interface AuthApiResult {
  shipper: IUser | null;
  isTest: boolean;
  error?: string;
  status?: number;
}

export async function getShipperFromApiKey(
  apiKeyToken: string | null | undefined,
  ownerAddressHeader?: string | null | undefined
): Promise<AuthApiResult> {
  await connectDB();

  const cleanToken = (apiKeyToken || "").trim();

  // 1. Authenticate via secret API key (unmasked rec_live_ / rec_test_)
  if (cleanToken && (cleanToken.startsWith("rec_live_") || cleanToken.startsWith("rec_test_"))) {
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

    if (shipper) {
      if (shipper.role !== "merchant") {
        return {
          shipper: null,
          isTest: isTestToken,
          error: "Developer API access is only enabled for logistics merchant accounts.",
          status: 403,
        };
      }
      const isTest = isTestToken || shipper.testApiKeyHash === tokenHash || shipper.testApiKey === cleanToken;
      return { shipper, isTest };
    }
  }

  // 2. Cryptographic Session JWT Verification (via Thirdweb serverAuth)
  if (cleanToken && !cleanToken.includes("•")) {
    try {
      const verified = await serverAuth.verifyJWT({ jwt: cleanToken });
      if (verified.valid && verified.parsedJWT?.sub) {
        const verifiedAddress = String(verified.parsedJWT.sub).toLowerCase();
        const shipper = await db.user.findOne({
          $or: [
            { _id: verifiedAddress },
            { _id: { $regex: new RegExp(`^${verifiedAddress}$`, "i") } },
          ],
        });
        if (shipper) {
          if (shipper.role !== "merchant") {
            return {
              shipper: null,
              isTest: false,
              error: "Shipment management is only available for merchant accounts.",
              status: 403,
            };
          }
          return { shipper, isTest: false };
        }
      }
    } catch {
      // JWT token verification failed, fall through
    }
  }

  // 3. Fallback: Authenticate via registered merchant session address (x-owner-address / shipperAddress)
  const cleanOwnerAddress = (ownerAddressHeader || "").trim().toLowerCase();
  if (cleanOwnerAddress) {
    const shipper = await db.user.findOne({
      $or: [
        { _id: cleanOwnerAddress },
        { _id: { $regex: new RegExp(`^${cleanOwnerAddress}$`, "i") } },
      ],
    });
    if (shipper) {
      if (shipper.role !== "merchant") {
        return {
          shipper: null,
          isTest: false,
          error: "Shipment management is only available for merchant accounts.",
          status: 403,
        };
      }
      return { shipper, isTest: false };
    }
  }

  return {
    shipper: null,
    isTest: false,
    error: "API key or valid session authorization is required.",
    status: 401,
  };
}
