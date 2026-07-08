"use client"

import { type ReactNode } from "react"
import { useConvexAuth } from "convex/react"
import { AvanaSessionsProvider, ConvexAvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { shouldUseOpenGateSession, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"
import { useTranslation } from "@/app/lib/i18n/use-translation"

function ConvexSessionProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const { t } = useTranslation()

  // A SIWE token is available before Convex has accepted it over the websocket.
  // Do not mount auth-gated wallet queries during that transition: they fail once with
  // UNAUTHENTICATED and leave the nearest error boundary stuck on its fallback screen.
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label={t("Authenticating wallet session")} />
      </div>
    )
  }

  return <ConvexAvanaSessionsProvider walletId={walletId}>{children}</ConvexAvanaSessionsProvider>
}

export function AvanaSessionProviders({ walletId, children }: { walletId?: string; children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (shouldUseOpenGateSession()) {
    return (
      <MarketLiquidityProvider>
        <AvanaSessionsProvider walletId={TEST_MODE_WALLET_ADDRESS}>{children}</AvanaSessionsProvider>
      </MarketLiquidityProvider>
    )
  }
  // A signed-in SIWE wallet drives the entire session (positions, seeds, Convex reads);
  // otherwise keep the explicit / default (demo) wallet so the public demo is unchanged.
  // No auto-prompt: the user signs the SIWE message once via the explicit "Sign in"
  // control (ConnectKit's flow), so the signature is never requested repeatedly.
  const effectiveWalletId = isSignedIn && authedWallet ? authedWallet : walletId
  return (
    <MarketLiquidityProvider>
      {hasConvexClient && isSignedIn && authedWallet ? (
        <ConvexSessionProvider walletId={authedWallet}>{children}</ConvexSessionProvider>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>{children}</AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  )
}
