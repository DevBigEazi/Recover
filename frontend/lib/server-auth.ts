import { createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "@/lib/client";

const adminPrivateKey = (
  process.env.BACKEND_SIGNER_PRIVATE_KEY ||
  process.env.BACKEND_SIGNER_PRIVATE_KEY ||
  ""
).trim();

if (!adminPrivateKey) {
  throw new Error(
    "BACKEND_SIGNER_PRIVATE_KEY environment variable is required for serverAuth initialization."
  );
}

let domain = "userecover.xyz";
try {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "";
  if (raw) {
    const formatted = raw.startsWith("http") ? raw : `https://${raw}`;
    domain = new URL(formatted).host;
  }
} catch {
  domain = "userecover.xyz";
}

export const serverAuth = createAuth({
  domain,
  client,
  adminAccount: privateKeyToAccount({
    client,
    privateKey: adminPrivateKey,
  }),
});
