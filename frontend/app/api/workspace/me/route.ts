import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB, db } from "@/lib/db";

function getJwtSecret(): Uint8Array {
  const secret = process.env.WORKSPACE_JWT_SECRET;
  if (!secret) throw new Error("WORKSPACE_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface WorkspaceSessionPayload {
  memberId: string;
  merchantAddress: string;
  merchantName?: string;
  businessLogo?: string | null;
  role: "manager" | "sales_rep";
  branchId: string;
  branchName: string;
  memberName: string;
  memberEmail: string;
}

/**
 * GET /api/workspace/me
 * Verifies the workspace_session JWT cookie and returns the decoded payload.
 * Returns 401 if the cookie is absent, invalid, or expired.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  let token: string | undefined = undefined;

  // 1. Try next/headers cookies()
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("workspace_session")?.value;
  } catch {
    // ignore
  }

  // 2. Try req.cookies
  if (!token) {
    token = req.cookies.get("workspace_session")?.value;
  }

  // 3. Try Authorization: Bearer <token> or x-workspace-token header
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (req.headers.get("x-workspace-token")) {
      token = req.headers.get("x-workspace-token")?.trim();
    }
  }

  if (!token) {
    return NextResponse.json({ error: "No workspace session." }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const session = payload as unknown as WorkspaceSessionPayload;

    if (session.merchantAddress) {
      await connectDB();
      const merchant = await db.user
        .findOne({
          $or: [
            { _id: session.merchantAddress.toLowerCase() },
            { address: session.merchantAddress.toLowerCase() },
          ],
        })
        .select("businessLogo companyName fullName")
        .lean();

      if (merchant) {
        session.businessLogo = merchant.businessLogo || null;
        if (!session.merchantName) {
          session.merchantName = merchant.companyName || merchant.fullName || "Business";
        }
      }
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("[Workspace Me] JWT verification error:", err);
    return NextResponse.json({ error: "Session expired or invalid." }, { status: 401 });
  }
}
