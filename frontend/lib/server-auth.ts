import { createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "@/lib/client";

const adminPrivateKey =
  process.env.RELAYER_PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";

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
