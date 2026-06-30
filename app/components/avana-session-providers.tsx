"use client"

import { type ReactNode } from "react"
import {
  AvanaSessionsProvider,
  ConvexAvanaSessionsProvider,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

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
  // No auto-prompt: the user signs the SIWE message once via the explicit "Sign in"
  // control (ConnectKit's flow), so the signature is never requested repeatedly.
  const effectiveWalletId = isSignedIn && authedWallet ? authedWallet : walletId
  return (
    <MarketLiquidityProvider>
      {hasConvexClient && isSignedIn && authedWallet ? (
        <ConvexAvanaSessionsProvider walletId={authedWallet}>{children}</ConvexAvanaSessionsProvider>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>{children}</AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  )
}
