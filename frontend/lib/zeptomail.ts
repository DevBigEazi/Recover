/**
 * lib/zeptomail.ts
 *
 * Transactional email service using the official ZeptoMail SDK (SendMailClient).
 * https://www.npmjs.com/package/zeptomail
 *
 * Required env vars:
 *   ZEPTOMAIL_SEND_TOKEN  — "Zoho-enczapikey <your-key>" or raw key
 *   ZEPTOMAIL_FROM_EMAIL — verified sender address (default: "noreply@userecover.xyz")
 *   ZEPTOMAIL_FROM_NAME  — sender display name (default: "Recover")
 */

import { SendMailClient } from "zeptomail";

const ZEPTO_API_URL = "https://api.zeptomail.com/v1.1/email";

function getClient(): SendMailClient {
  const rawToken = process.env.ZEPTOMAIL_SEND_TOKEN;
  if (!rawToken) {
    throw new Error("ZEPTOMAIL_SEND_TOKEN is not set in environment");
  }

  let token = rawToken.trim();
  if (!token.startsWith("Zoho-enczapikey ") && !token.startsWith("Zoho-enczapikey")) {
    token = `Zoho-enczapikey ${token}`;
  } else if (token.startsWith("Zoho-enczapikey") && !token.startsWith("Zoho-enczapikey ")) {
    token = token.replace("Zoho-enczapikey", "Zoho-enczapikey ");
  }

  return new SendMailClient({ url: ZEPTO_API_URL, token });
}

function fromAddress(): { address: string; name: string } {
  return {
    address: process.env.ZEPTOMAIL_FROM_EMAIL ?? "noreply@userecover.xyz",
    name: process.env.ZEPTOMAIL_FROM_NAME ?? "Recover",
  };
}

function sanitizeLoginUrl(url?: string): string {
  if (!url) return "https://userecover.xyz/workspace/login";
  return url
    .replace("recoverprotocol.xyz", "userecover.xyz")
    .replace("recover.app", "userecover.xyz");
}

// ─────────────────────────────────────────────
// Invite email — sent when a staff member is added
// ─────────────────────────────────────────────

export interface TeamInviteEmailOptions {
  to: string;
  toName: string;
  merchantName: string;
  role: "manager" | "sales_rep";
  branchName: string;
  pin: string; // plaintext 6-digit PIN — only lives in memory and in this email
  loginUrl: string; // e.g. https://userecover.xyz/workspace/login
}

export async function sendTeamInviteEmail(opts: TeamInviteEmailOptions): Promise<void> {
  const roleName = opts.role === "manager" ? "Manager" : "Sales Representative";
  const client = getClient();
  const targetLoginUrl = sanitizeLoginUrl(opts.loginUrl);

  const htmlbody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to the ${opts.merchantName} workspace</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0f172a;padding:28px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Recover</p>
          <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Workspace Invitation</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:600;">Hi ${opts.toName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            You've been added to the <strong>${opts.merchantName}</strong> workspace as a <strong>${roleName}</strong> at <strong>${opts.branchName}</strong>.
            Use the credentials below to sign in.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Login Email</p>
              <p style="margin:0 0 20px;font-size:16px;color:#0f172a;font-weight:500;">${opts.to}</p>
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Your PIN</p>
              <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:10px;color:#0f172a;">${opts.pin}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${targetLoginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
              Sign in to Workspace &rarr;
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
            Keep your PIN private. You can change it from workspace settings after signing in.<br/>
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#cbd5e1;">Sent by Recover (userecover.xyz) — automated message, do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await client.sendMail({
    from: fromAddress(),
    to: [{ email_address: { address: opts.to, name: opts.toName } }],
    subject: `You've been invited to ${opts.merchantName} workspace`,
    htmlbody,
    textbody: `Hi ${opts.toName},\n\nYou've been added to the ${opts.merchantName} workspace as ${roleName} at ${opts.branchName}.\n\nLogin email: ${opts.to}\nYour PIN: ${opts.pin}\n\nSign in: ${targetLoginUrl}\n\nKeep your PIN private. Change it from workspace settings after signing in.`,
    track_opens: false,
    track_clicks: false,
  });
}

// ─────────────────────────────────────────────
// PIN reset email
// ─────────────────────────────────────────────

export interface PinResetEmailOptions {
  to: string;
  toName: string;
  merchantName: string;
  newPin: string;
  loginUrl: string;
}

export async function sendPinResetEmail(opts: PinResetEmailOptions): Promise<void> {
  const client = getClient();
  const targetLoginUrl = sanitizeLoginUrl(opts.loginUrl);

  const htmlbody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your workspace PIN has been reset</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0f172a;padding:28px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Recover</p>
          <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">PIN Reset</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:600;">Hi ${opts.toName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PIN for the <strong>${opts.merchantName}</strong> workspace has been reset by your manager. Use the new PIN below to sign in.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">New PIN</p>
              <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:10px;color:#0f172a;">${opts.newPin}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${targetLoginUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
              Sign in to Workspace &rarr;
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
            We recommend changing your PIN from workspace settings after signing in.<br/>
            If you did not expect this, contact your manager immediately.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#cbd5e1;">Sent by Recover (userecover.xyz) — automated message, do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await client.sendMail({
    from: fromAddress(),
    to: [{ email_address: { address: opts.to, name: opts.toName } }],
    subject: `Your ${opts.merchantName} workspace PIN has been reset`,
    htmlbody,
    textbody: `Hi ${opts.toName},\n\nYour PIN for the ${opts.merchantName} workspace has been reset.\n\nNew PIN: ${opts.newPin}\n\nSign in: ${targetLoginUrl}\n\nChange your PIN from workspace settings after signing in.`,
    track_opens: false,
    track_clicks: false,
  });
}
