import { NextResponse } from "next/server";

/**
 * POST /api/workspace/logout
 * Clears the workspace_session cookie.
 * Also called by the main app's onConnect handler when a personal wallet session is established,
 * so that wallet login and workspace login cannot co-exist in the same browser.
 */
export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("workspace_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
