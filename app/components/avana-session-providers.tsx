"use client"

import { lazy, Suspense, type ReactNode } from "react"
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { ConvexMarketSnapshotHydrators } from "@/app/lib/avana-session/convex-market-snapshot-hydrators"
import { hasConvexClient, MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"
import { useConvexSiweAuth, useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { shouldUseOpenGateSession, TEST_MODE_WALLET_ADDRESS } from "@/app/lib/test-mode"

const ConvexSessionProvider = lazy(async () => ({
  default: (await import("@/app/lib/avana-session/convex-session-provider")).ConvexSessionProvider,
}))

// Module-scope Convex client for the dev open-gate path. Mounted synchronously so the
// public-snapshot hydrators inside it can always find a ConvexProvider — the lazy
// MarketLiquidityProvider path has a Suspense fallback with no ConvexProvider, which
// crashed useQuery calls in open-gate mode.
//
// When NEXT_PUBLIC_CONVEX_URL is absent (Playwright test-mode CI: no .env.local shipped;
// Lighthouse audits with no backend), we mount a client pointing at an unreachable local
// port so every useQuery call anywhere in the tree resolves to `undefined` (loading)
// instead of throwing "Could not find Convex client". Consumers already tolerate the
// loading state via fallbacks — DashboardWalletTab in particular renders the mock
// balances when convex returns undefined.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const OFFLINE_CONVEX_URL = "http://127.0.0.1:0"
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

export function AvanaSessionProviders({ walletId, children }: { walletId?: string; children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (shouldUseOpenGateSession()) {
    // Open-gate skips SIWE / authed wallet queries, but the shared dev wallet still
    // reads (and, once onboarded, writes) real Convex — no mock overlay. The ConvexProvider
    // is mounted synchronously above the hydrator so useQuery never fires without a client.
    return (
      <OpenGateConvexProvider>
        <MarketLiquidityProvider live={Boolean(hasConvexClient)}>
          <AvanaSessionsProvider walletId={TEST_MODE_WALLET_ADDRESS}>
            {hasConvexClient ? <ConvexMarketSnapshotHydrators /> : null}
            {children}
          </AvanaSessionsProvider>
        </MarketLiquidityProvider>
      </OpenGateConvexProvider>
    )
  }
  // A signed-in SIWE wallet drives the entire session (positions, seeds, Convex reads);
  // otherwise keep the explicit / default (demo) wallet so the public demo is unchanged.
  // No auto-prompt: the user signs the SIWE message once via the explicit "Sign in"
  // control (ConnectKit's flow), so the signature is never requested repeatedly.
  const effectiveWalletId = isSignedIn && authedWallet ? authedWallet : walletId
  return (
    <MarketLiquidityProvider live={Boolean(hasConvexClient && isSignedIn && authedWallet)}>
      {hasConvexClient && isSignedIn && authedWallet ? (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <ConvexSessionProvider walletId={authedWallet}>{children}</ConvexSessionProvider>
        </Suspense>
      ) : (
        <AvanaSessionsProvider walletId={effectiveWalletId}>{children}</AvanaSessionsProvider>
      )}
    </MarketLiquidityProvider>
  )
}
