"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { buildSiweMessage } from "./message"
import { clearSiweToken, getSiweToken, setSiweToken, subscribeSiwe, type SiweToken } from "./auth-store"
import { getJwtExpirySeconds, isJwtExpired } from "./token-expiry"
import { IS_DEV_SHORTCUT_MODE, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
 * Sign-in controller bound to the connected wagmi wallet. `signIn` runs the SIWE
 * nonce → sign → verify → store-JWT flow; `signOut` clears the token.
 */
export function useSiweAuth() {
  // Live token: an expired JWT reads as signed-out, so the gate shows the sign-in
  // recovery path rather than crashing into the generic error boundary.
  const token = useLiveSiweToken()
  const { address, chainId, isConnected, isConnecting, isReconnecting } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { t } = useTranslation()

  const authedWallet = token?.wallet ?? (IS_DEV_SHORTCUT_MODE ? TEST_MODE_WALLET_ADDRESS : null)
  const effectiveAddress = IS_DEV_SHORTCUT_MODE ? TEST_MODE_WALLET_ADDRESS : address
  const effectiveConnected = IS_DEV_SHORTCUT_MODE || isConnected
  // "Signed in" only counts when the SIWE wallet matches the connected wallet.
  const isSignedIn = effectiveConnected && authedWallet != null && effectiveAddress?.toLowerCase() === authedWallet
  // On reload wagmi restores the session asynchronously (status === "reconnecting"),
  // so a persisted SIWE token is present before the wallet is. Treat that window as
  // "restoring" so the gate can hold a neutral loading state instead of flashing the
  // signed-out/onboarding screen. No token means genuinely signed out — nothing to wait for.
  const isRestoring = !IS_DEV_SHORTCUT_MODE && token != null && !isSignedIn && (isReconnecting || isConnecting)

  const signIn = useCallback(async (): Promise<string> => {
    if (!address) throw new Error(t("Connect a wallet first."))
    const nonceRes = await fetch("/api/siwe/nonce", { cache: "no-store" })
    if (!nonceRes.ok) throw new Error(t("Could not get a sign-in nonce."))
    const { nonce } = (await nonceRes.json()) as { nonce: string }
    const message = buildSiweMessage({
      address,
      domain: window.location.host,
      uri: window.location.origin,
      nonce,
      issuedAt: new Date().toISOString(),
      chainId: chainId ?? 1,
    })
    const signature = await signMessageAsync({ message })
    const verifyRes = await fetch("/api/siwe/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature }),
    })
    if (!verifyRes.ok) {
      const err = (await verifyRes.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(err.error ?? t("Sign-in verification failed."))
    }
    const { token: jwt, wallet } = (await verifyRes.json()) as {
      token: string
      wallet: string
    }
    setSiweToken(jwt, wallet)
    return wallet
  }, [address, chainId, signMessageAsync, t])

  const signOut = useCallback(() => clearSiweToken(), [])

  return {
    authedWallet,
    isSignedIn,
    isRestoring,
    isConnected: effectiveConnected,
    address: effectiveAddress ?? null,
    signIn,
    signOut,
  }
}
