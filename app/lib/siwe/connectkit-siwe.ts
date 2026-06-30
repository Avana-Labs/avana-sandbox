"use client"

import type { SIWEConfig } from "connectkit"
import { buildSiweMessage } from "./message"
import { clearSiweToken, getSiweToken, setSiweToken } from "./auth-store"

/**
 * ConnectKit SIWE configuration. This unifies wallet connection and Sign-In With
 * Ethereum into a single ConnectKit flow: the modal connects the wallet, prompts the
 * SIWE signature, and only then reports "signed in". It is wired to the app's existing
 * SIWE endpoints (/api/siwe/nonce + /api/siwe/verify) and the shared token store, so
 * Convex auth (useConvexSiweAuth reads the same store) keeps working unchanged.
 */
export const siweConfig: SIWEConfig = {
  getNonce: async () => {
    const res = await fetch("/api/siwe/nonce", { cache: "no-store" })
    if (!res.ok) throw new Error("Could not get a sign-in nonce.")
    const { nonce } = (await res.json()) as { nonce: string }
    return nonce
  },

  createMessage: ({ nonce, address, chainId }) =>
    buildSiweMessage({
      address,
      domain: window.location.host,
      uri: window.location.origin,
      nonce,
      issuedAt: new Date().toISOString(),
      chainId,
    }),

  verifyMessage: async ({ message, signature }) => {
    const res = await fetch("/api/siwe/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature }),
    })
    if (!res.ok) return false
    const { token, wallet } = (await res.json()) as { token: string; wallet: string }
    // Persist the JWT so Convex (useConvexSiweAuth) authenticates as this wallet.
    setSiweToken(token, wallet)
    return true
  },

  // ConnectKit polls this to know whether the wallet is already signed in. We back it
  // with the locally-stored JWT so a signed-in wallet survives reloads.
  getSession: async () => {
    const token = getSiweToken()
    if (!token?.wallet) return null
    return { address: token.wallet as `0x${string}`, chainId: 1 }
  },

  signOut: async () => {
    clearSiweToken()
    return true
  },
}
