"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useSIWE } from "connectkit"
import { useAccount } from "wagmi"
import {
  AvanaSessionsProvider,
  ConvexAvanaSessionsProvider,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

/**
 * Auto-prompt ConnectKit's SIWE once per newly connected address so the user goes
 * straight from connect → signed in. Routed through ConnectKit's useSIWE (the same flow
 * the header/onboarding "Sign in" button uses) so state stays consistent. If the user
 * rejects, the explicit "Sign in" control remains. The attempted-set survives the
 * session re-scope on identity change and never re-prompts after an explicit sign-out.
 */
function AutoSiwe() {
  const { address, isConnected } = useAccount()
  const siwe = useSIWE()
  const attempted = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!siwe?.isReady || !isConnected || siwe.isSignedIn || siwe.isLoading || !address) return
    const key = address.toLowerCase()
    if (attempted.current.has(key)) return
    attempted.current.add(key)
    // Swallow rejection/failure — the user can still sign in via the header button.
    void siwe.signIn?.().catch(() => {})
  }, [address, isConnected, siwe])
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
