/**
 * Helper to ensure a cryptographic JWT session token is created and cached in sessionStorage.
 * Signs a challenge proof via the active connected wallet if not already present.
 */

let sessionPromise: Promise<string | null> | null = null;

export async function ensureSessionAuth(account?: {
  address: string;
  signMessage: (args: { message: string }) => Promise<string>;
} | null): Promise<string | null> {
  if (typeof window === "undefined" || !account?.address) return null;

  const storageKey = `recover_session_jwt_${account.address.toLowerCase()}`;
  const existingToken = sessionStorage.getItem(storageKey);
  if (existingToken) {
    return existingToken;
  }

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const challenge = `Sign in to Recover\nAddress: ${account.address.toLowerCase()}\nTimestamp: ${Date.now()}`;
      const signature = await account.signMessage({ message: challenge });
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          signature,
          challenge,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          sessionStorage.setItem(storageKey, data.token);
          return data.token as string;
        }
      }
    } catch (err) {
      console.warn("Could not acquire session token:", err);
    } finally {
      sessionPromise = null;
    }
    return null;
  })();

  return sessionPromise;
}
