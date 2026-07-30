/**
 * useAuthReady
 *
 * Wraps thirdweb's `useActiveAccount` + `useConnectionStatus` to expose a
 * single `isAuthLoading` flag.  While thirdweb is re-hydrating a persisted
 * session the status is "connecting", meaning `account` is temporarily
 * `undefined` even though the user *is* logged in.  Checking `isAuthLoading`
 * before rendering any "not signed in" UI eliminates the brief flash of
 * unauthenticated content that happens on every hard navigation.
 */

import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";

export function useAuthReady() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();

  // Only block the UI while we have NO account yet AND thirdweb hasn't finished
  // resolving the persisted session. If account is already defined the user IS
  // logged in — skip loading entirely so we don't re-flash spinners on navigation.
  const isAuthLoading = !account && (status === "connecting" || status === "unknown");

  return { account, isAuthLoading };
}
