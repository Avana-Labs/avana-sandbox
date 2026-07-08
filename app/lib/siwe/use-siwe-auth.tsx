"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { clearSiweToken, getSiweToken, subscribeSiwe, type SiweToken } from "./auth-store"
import { getJwtExpirySeconds, isJwtExpired } from "./token-expiry"
import { IS_DEV_SHORTCUT_MODE, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"

/** Reactively read the current SIWE token (null when signed out). */
export function useSiweToken(): SiweToken | null {
  return useSyncExternalStore(subscribeSiwe, getSiweToken, () => null)
}

/**
 * A valid (unexpired) SIWE token, or null. React re-renders when the token changes AND
 * when it crosses its own expiry boundary, so a tab left open past the JWT TTL flips to
 * the signed-out recovery UI instead of silently failing every Convex query behind the
 * generic error boundary. The expired token is cleared so a reload recovers cleanly.
 */
export function useLiveSiweToken(): SiweToken | null {
  const token = useSiweToken()
  const [now, setNow] = useState(() => Date.now())
  const expired = token != null && isJwtExpired(token.jwt, now)

  useEffect(() => {
    const exp = getJwtExpirySeconds(token?.jwt)
    if (exp == null) return
    // Wake exactly when the token lapses (accounting for the skew isJwtExpired uses) so
    // we don't poll — a single timer is enough per token.
    const fireAtMs = (exp - 30) * 1000
    const delay = fireAtMs - Date.now()
    if (delay <= 0) {
      setNow(Date.now())
      return
    }
    const id = window.setTimeout(() => setNow(Date.now()), delay)
    return () => window.clearTimeout(id)
  }, [token?.jwt])

  useEffect(() => {
    // Drop the dead token (in an effect, not during render) so the app stops attaching
    // it and a reload starts from the clean signed-out state.
    if (expired) clearSiweToken()
  }, [expired])

  return expired ? null : token
}

/**
 * The `useAuth` hook for `ConvexProviderWithAuth`. Convex calls `fetchAccessToken`
 * to attach the JWT to authed function calls; public queries still work when null.
 */
export function useConvexSiweAuth() {
  const token = useLiveSiweToken()
  const jwt = token?.jwt ?? null
  const fetchAccessToken = useCallback(
    async (_args: { forceRefreshToken: boolean }) => {
      // Never hand Convex an expired token — that authenticates as nobody and trips the
      // error branch instead of falling back to public/unauthenticated behaviour.
      const stored = getSiweToken()
      return stored && !isJwtExpired(stored.jwt) ? stored.jwt : null
    },
    // Re-create when the JWT changes so Convex re-authenticates on sign-in/out.
    [jwt],
  )
  return { isLoading: false, isAuthenticated: jwt != null, fetchAccessToken }
}

export type SiweAuthStatus = "signed-out" | "signing" | "signed-in"

/**
 * Read-only auth state, derived purely from the persisted SIWE token — NO wagmi. This is
 * what keeps the wallet SDK off the critical path: the app can answer "who is signed in?"
 * from the JWT alone, which is exactly the token `ConvexProviderWithAuth` verifies on every
 * authed call (see `useConvexSiweAuth`). Signing in / connecting a wallet goes through
 * ConnectKit's own flow in `WalletControl`, so this hook has no wagmi dependency.
 *
 * The wallet-match check that previously gated `isSignedIn` on a live wagmi connection was
 * UI-only defense in depth; Convex is the real authority and rejects a token whose wallet
 * doesn't match. Dropping it lets a returning user's session read as signed-in immediately
 * from storage, with no wallet-reconnect flash.
 */
export function useSiweAuth() {
  // Live token: an expired JWT reads as signed-out, so the gate shows the sign-in
  // recovery path rather than crashing into the generic error boundary.
  const token = useLiveSiweToken()

  const authedWallet = token?.wallet ?? (IS_DEV_SHORTCUT_MODE ? TEST_MODE_WALLET_ADDRESS : null)
  const isSignedIn = IS_DEV_SHORTCUT_MODE || (token != null && authedWallet != null)

  return {
    authedWallet,
    isSignedIn,
  }
}
