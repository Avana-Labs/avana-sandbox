"use client"

import { useEffect, useRef, type ReactNode } from "react"
import {
  AvanaSessionsProvider,
  ConvexAvanaSessionsProvider,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

/**
 * Auto-prompt SIWE once per newly connected address. If the user rejects, the manual
 * "Sign in" control (SandboxSignInButton) remains. The attempted-set lives here — NOT
 * inside the session provider — so it survives the session re-scope on identity change
 * and never re-prompts after an explicit sign-out.
 */
function AutoSiwe() {
  const { isConnected, isSignedIn, address, signIn } = useSiweAuth()
  const attempted = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!isConnected || isSignedIn || !address) return
    const key = address.toLowerCase()
    if (attempted.current.has(key)) return
    attempted.current.add(key)
    // Swallow rejection/failure — the user can still sign in via the header button.
    void signIn().catch(() => {})
  }, [isConnected, isSignedIn, address, signIn])
  return null
}

export function AvanaSessionProviders({
  walletId,
  children,
}: {
  walletId?: string
  children: ReactNode
}) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  // A signed-in SIWE wallet drives the entire session (positions, seeds, Convex reads);
  // otherwise keep the explicit / default (demo) wallet so the public demo is unchanged.
  const effectiveWalletId = isSignedIn && authedWallet ? authedWallet : walletId
  return (
    <MarketLiquidityProvider>
      <AutoSiwe />
      {hasConvexClient && isSignedIn && authedWallet ? (
        <ConvexAvanaSessionsProvider walletId={authedWallet}>{children}</ConvexAvanaSessionsProvider>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>{children}</AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  )
}
