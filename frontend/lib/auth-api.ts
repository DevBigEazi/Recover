import { db, connectDB, IUser } from "@/lib/db";
import { Actor } from "@/lib/permissions";
import crypto from "crypto";
import { serverAuth } from "@/lib/server-auth";
import { jwtVerify } from "jose";

export interface AuthApiResult {
  shipper: IUser | null;
  /**
   * The actor performing the action. If the authenticated wallet IS the merchant
   * owner, role = "owner" and memberDoc = null. If the wallet is a team member,
   * role reflects their team role and memberDoc is their ITeamMember document.
   */
  actor: Actor;
  isTest: boolean;
  error?: string;
  status?: number;
}

/** Default actor shape when auth fails — prevents callers from needing null checks */
const UNAUTHENTICATED_ACTOR: Actor = {
  address: "",
  name: "Unknown",
  role: "owner",
  branchId: null,
  branchName: null,
};

/**
 * Resolves both the merchant account (IUser) and the actor performing the request.
 * Supports three auth pathways:
 *   1. API key (rec_live_ / rec_test_)
 *   2. Thirdweb session JWT (Bearer token)
 *   3. x-owner-address header fallback
 *
 * After resolving the merchant, checks whether the authenticated address is:
 *   a) The merchant owner themselves → actor.role = "owner"
 *   b) An active team member of that merchant → actor.role = member.role
 *   c) Neither → 403
 */
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
          actor: UNAUTHENTICATED_ACTOR,
          isTest: isTestToken,
          error: "Developer API access is only enabled for logistics merchant accounts.",
          status: 403,
        };
      }
      const isTest = isTestToken || shipper.testApiKeyHash === tokenHash || shipper.testApiKey === cleanToken;
      // API key auth = owner-level access (used by developer integrations)
      const actor: Actor = {
        address: String(shipper._id),
        name: shipper.companyName || shipper.fullName,
        role: "owner",
        branchId: null,
        branchName: null,
      };
      return { shipper, actor, isTest };
    }
  }

  // 2. Cryptographic Session JWT Verification (via Thirdweb serverAuth)
  if (cleanToken && !cleanToken.includes("•")) {
    try {
      const verified = await serverAuth.verifyJWT({ jwt: cleanToken });
      if (verified.valid && verified.parsedJWT?.sub) {
        const verifiedAddress = String(verified.parsedJWT.sub).toLowerCase();
        const result = await resolveActorForAddress(verifiedAddress);
        if (result) return { ...result, isTest: false };
      }
    } catch {
      // JWT token verification failed, fall through
    }
  }

  // 3. Fallback: x-owner-address header
  const cleanOwnerAddress = (ownerAddressHeader || "").trim().toLowerCase();
  if (cleanOwnerAddress) {
    const result = await resolveActorForAddress(cleanOwnerAddress);
    if (result) return { ...result, isTest: false };
  }

  return {
    shipper: null,
    actor: UNAUTHENTICATED_ACTOR,
    isTest: false,
    error: "API key or valid session authorization is required.",
    status: 401,
  };
}

/**
 * Given an authenticated wallet address, resolves the merchant account (IUser)
 * and the actor shape. The wallet may be the owner themselves or an active team member.
 */
async function resolveActorForAddress(
  address: string
): Promise<Omit<AuthApiResult, "error" | "status"> | null> {
  // Case A: address is a merchant owner.
  // Note: Team members must authenticate through the dedicated workspace_session
  // cookie, never via personal wallet address. A personal wallet address only
  // resolves to a workspace if the user is the actual registered merchant owner.
  const ownerDoc = await db.user.findOne({
    $or: [{ _id: address }, { _id: { $regex: new RegExp(`^${address}$`, "i") } }],
    role: "merchant",
  });

  if (ownerDoc) {
    const actor: Actor = {
      address: String(ownerDoc._id),
      name: ownerDoc.companyName || ownerDoc.fullName,
      role: "owner",
      branchId: null,
      branchName: null,
    };
    return { shipper: ownerDoc, actor, isTest: false };
  }

  return null;
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getMerchantFromAuth(req: Request): Promise<AuthApiResult> {
  await connectDB();

  // 1. First, check if there is an authenticated staff workspace session
  const cookieHeader = req.headers.get("cookie");
  const bearerToken = req.headers.get("authorization")?.startsWith("Bearer ")
    ? req.headers.get("authorization")?.slice(7).trim()
    : null;
  const workspaceToken =
    parseCookie(cookieHeader, "workspace_session") ||
    req.headers.get("x-workspace-token") ||
    bearerToken;

  if (workspaceToken) {
    const secret = process.env.WORKSPACE_JWT_SECRET;
    if (secret) {
      try {
        const { payload } = await jwtVerify(workspaceToken, new TextEncoder().encode(secret));
        if (payload?.merchantAddress) {
          const merchantAddress = String(payload.merchantAddress).toLowerCase();
          const merchantDoc = await db.user.findOne({
            $or: [{ _id: merchantAddress }, { _id: { $regex: new RegExp(`^${merchantAddress}$`, "i") } }],
            role: "merchant",
          });

          if (merchantDoc) {
            const actor: Actor = {
              address: String(payload.memberId || merchantAddress),
              name: String(payload.memberName || "Staff Member"),
              role: (payload.role as "manager" | "sales_rep") || "sales_rep",
              branchId: payload.branchId ? String(payload.branchId) : null,
              branchName: payload.branchName ? String(payload.branchName) : null,
            };
            return { shipper: merchantDoc, actor, isTest: false };
          }
        }
      } catch {
        // Workspace JWT invalid/expired, fall through to token/API key checks
      }
    }
  }

  // 2. Standard API key or wallet session authorization
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");
  const ownerAddressHeader = req.headers.get("x-owner-address");

  let token = apiKeyHeader;
  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  return getShipperFromApiKey(token, ownerAddressHeader);
}
