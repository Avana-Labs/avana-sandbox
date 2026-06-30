"use client"

import { useCallback, useSyncExternalStore } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { buildSiweMessage } from "./message"
import { clearSiweToken, getSiweToken, setSiweToken, subscribeSiwe, type SiweToken } from "./auth-store"

/** Reactively read the current SIWE token (null when signed out). */
export function useSiweToken(): SiweToken | null {
  return useSyncExternalStore(subscribeSiwe, getSiweToken, () => null)
}

/**
 * The `useAuth` hook for `ConvexProviderWithAuth`. Convex calls `fetchAccessToken`
 * to attach the JWT to authed function calls; public queries still work when null.
 */
export function useConvexSiweAuth() {
  const token = useSiweToken()
  const jwt = token?.jwt ?? null
  const fetchAccessToken = useCallback(
    async (_args: { forceRefreshToken: boolean }) => getSiweToken()?.jwt ?? null,
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
  const token = useSiweToken()
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const authedWallet = token?.wallet ?? null
  const testSession = process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1" && authedWallet != null
  const effectiveAddress = testSession ? authedWallet : address
  const effectiveConnected = testSession || isConnected
  // "Signed in" only counts when the SIWE wallet matches the connected wallet.
  const isSignedIn =
    effectiveConnected && authedWallet != null && effectiveAddress?.toLowerCase() === authedWallet

  const signIn = useCallback(async (): Promise<string> => {
    if (!address) throw new Error("Connect a wallet first.")
    const nonceRes = await fetch("/api/siwe/nonce", { cache: "no-store" })
    if (!nonceRes.ok) throw new Error("Could not get a sign-in nonce.")
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
      const err = (await verifyRes.json().catch(() => ({}))) as { error?: string }
      throw new Error(err.error ?? "Sign-in verification failed.")
    }
    const { token: jwt, wallet } = (await verifyRes.json()) as { token: string; wallet: string }
    setSiweToken(jwt, wallet)
    return wallet
  }, [address, chainId, signMessageAsync])

  const signOut = useCallback(() => clearSiweToken(), [])

  return {
    authedWallet,
    isSignedIn,
    isConnected: effectiveConnected,
    address: effectiveAddress ?? null,
    signIn,
    signOut,
  }
}
