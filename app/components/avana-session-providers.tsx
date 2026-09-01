"use client"

import { lazy, Suspense, type ReactNode } from "react"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { PendingConvexSessionProvider } from "@/app/lib/avana-session/pending-convex-session-provider"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useConvexSiweAuth, useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { useOpenGateAuthBootstrap } from "@/app/lib/siwe/use-open-gate-auth-bootstrap"
import { isPlaywrightTestMode, shouldUseOpenGateSession, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"

const ConvexSessionProvider = lazy(async () => ({
  default: (await import("@/app/lib/avana-session/convex-session-provider")).ConvexSessionProvider,
}))

// Module-scope Convex client for the dev open-gate path. Mounted synchronously so the
// provider tree always has a Convex client before wallet queries fire.
//
// When NEXT_PUBLIC_CONVEX_URL is absent (Playwright CI / Lighthouse without backend),
// point at an unreachable local port so useQuery resolves to undefined (loading) instead
// of throwing "Could not find Convex client".
const OFFLINE_CONVEX_URL = "http://127.0.0.1:0"
const convexUrl = isPlaywrightTestMode() ? undefined : process.env.NEXT_PUBLIC_CONVEX_URL
const openGateConvexClient = new ConvexReactClient(
  convexUrl && /^https?:\/\//.test(convexUrl) ? convexUrl : OFFLINE_CONVEX_URL,
)

function OpenGateConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={openGateConvexClient} useAuth={useConvexSiweAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}

/** Instant Paint: always paint children; upgrade to Convex when JWT/chunk are ready. */
function LocalSessionFallback({ walletId, children }: { walletId: string; children: ReactNode }) {
  return <PendingConvexSessionProvider walletId={walletId}>{children}</PendingConvexSessionProvider>
}

function OpenGateSessionTree({ children }: { children: ReactNode }) {
  const { ready, error } = useOpenGateAuthBootstrap()
  const walletId = TEST_MODE_WALLET_ADDRESS

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Open-gate Convex auth failed</p>
        <p className="max-w-md text-xs text-muted-foreground">{error}</p>
        <LocalSessionFallback walletId={walletId}>{children}</LocalSessionFallback>
      </div>
    )
  }

  // Paint product chrome immediately with the local session while the JWT mints /
  // Convex session chunk loads. Soft-upgrade to ConvexSessionProvider when ready —
  // never return null (blank Instant Paint regression).
  if (!ready || !hasConvexClient) {
    return <LocalSessionFallback walletId={walletId}>{children}</LocalSessionFallback>
  }

  return (
    <Suspense fallback={<LocalSessionFallback walletId={walletId}>{children}</LocalSessionFallback>}>
      <ConvexSessionProvider walletId={walletId}>{children}</ConvexSessionProvider>
    </Suspense>
  )
}

export function AvanaSessionProviders({ walletId, children }: { walletId?: string; children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (isPlaywrightTestMode()) {
    return (
      <OpenGateConvexProvider>
        <MarketLiquidityProvider live={false}>
          <AvanaSessionsProvider walletId={TEST_MODE_WALLET_ADDRESS} persistLocalState persistUmbrellaState={false}>
            {children}
          </AvanaSessionsProvider>
        </MarketLiquidityProvider>
      </OpenGateConvexProvider>
    )
  }
  if (shouldUseOpenGateSession()) {
    return (
      <OpenGateConvexProvider>
        <MarketLiquidityProvider live={Boolean(hasConvexClient)}>
          <OpenGateSessionTree>{children}</OpenGateSessionTree>
        </MarketLiquidityProvider>
      </OpenGateConvexProvider>
    )
  }
  // A signed-in SIWE wallet drives the entire session (positions, seeds, Convex reads);
  // otherwise keep the explicit / default (demo) wallet so the public demo is unchanged.
  const effectiveWalletId = isSignedIn && authedWallet ? authedWallet : walletId
  return (
    <MarketLiquidityProvider live={Boolean(hasConvexClient && isSignedIn && authedWallet)}>
      {hasConvexClient && isSignedIn && authedWallet ? (
        <Suspense fallback={<LocalSessionFallback walletId={authedWallet}>{children}</LocalSessionFallback>}>
          <ConvexSessionProvider walletId={authedWallet}>{children}</ConvexSessionProvider>
        </Suspense>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>{children}</AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  )
}
