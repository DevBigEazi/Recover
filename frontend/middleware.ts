import { NextResponse } from "next/server";

/**
 * Middleware
 * Next.js edge middleware. Route protection is handled gracefully per context:
 * - Merchant owners authenticate via their connected wallet session.
 * - Staff members authenticate at /workspace/login via email + 6-digit PIN (workspace_session).
 */
export async function middleware(): Promise<NextResponse> {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
