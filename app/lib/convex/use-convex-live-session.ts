"use client"

import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { shouldUseOpenGateSession } from "@/app/lib/test-mode"

/**
 * True when a `ConvexProvider` is mounted above the current subtree, so client
 * `useQuery`/`usePreloadedQuery` are safe to call.
 *
 * This MUST mirror the provider tree in `AvanaSessionProviders`:
 *   - open-gate (dev/test): `OpenGateConvexProvider` is always mounted (even when
 *     `NEXT_PUBLIC_CONVEX_URL` is absent it points at an unreachable client so
 *     queries resolve to `undefined`, never throw) → always live.
 *   - signed-in production: `MarketLiquidityProvider` mounts its
 *     `ConvexProviderWithAuth` only when `hasConvexClient && isSignedIn && authedWallet`.
 *   - signed-out production: NO ConvexProvider → NOT live (a `useQuery` there throws
 *     "Could not find Convex client"). Public detail pages stay statically rendered.
 *
 * Gate reactive components on this: render the live (subscribing) variant only when
 * this is true, and the static prop-driven variant otherwise. Because the variants
 * are separate components, the live variant's hooks only run when it is mounted.
 */
export function useConvexLiveSession(): boolean {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (shouldUseOpenGateSession()) return true
  return Boolean(hasConvexClient && isSignedIn && authedWallet)
}
