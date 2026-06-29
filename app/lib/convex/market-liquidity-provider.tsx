"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export type MarketLiquidityDelta = { borrowedDeltaUsd: number; suppliedDeltaUsd: number }

export type MarketLiquidityValue = {
  /** Per-market aggregate deltas from ALL users, keyed by catalog market id. */
  deltas: Map<string, MarketLiquidityDelta>
  /** True once the shared ledger query has resolved (Convex reachable). */
  connected: boolean
  /** Fold a borrow/repay/supply/withdraw into the shared ledger. No-op when offline. */
  recordDelta: (input: { marketSlug: string; borrowedDeltaUsd?: number; suppliedDeltaUsd?: number }) => void
}

const EMPTY_VALUE: MarketLiquidityValue = {
  deltas: new Map(),
  connected: false,
  recordDelta: () => undefined,
}

const MarketLiquidityContext = createContext<MarketLiquidityValue>(EMPTY_VALUE)

// Created once at module load. NEXT_PUBLIC_ vars are inlined, so this resolves
// identically on server and client (no hydration mismatch). The client connects
// lazily on the first subscription; if the URL is unreachable, useQuery simply
// stays undefined and the whole layer degrades to base catalog numbers.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convexClient =
  convexUrl && /^https?:\/\//.test(convexUrl)
    ? (() => {
        try {
          return new ConvexReactClient(convexUrl)
        } catch {
          return null
        }
      })()
    : null

function MarketLiquidityBridge({ children }: { children: ReactNode }) {
  const rows = useQuery(api.liquidity.listDeltas)
  const mutate = useMutation(api.liquidity.recordDelta)

  const value = useMemo<MarketLiquidityValue>(() => {
    const deltas = new Map<string, MarketLiquidityDelta>()
    for (const row of rows ?? []) {
      deltas.set(row.marketSlug, {
        borrowedDeltaUsd: row.borrowedDeltaUsd,
        suppliedDeltaUsd: row.suppliedDeltaUsd,
      })
    }
    return {
      deltas,
      connected: rows !== undefined,
      recordDelta: (input) => {
        void Promise.resolve(mutate(input)).catch(() => undefined)
      },
    }
  }, [rows, mutate])

  return <MarketLiquidityContext.Provider value={value}>{children}</MarketLiquidityContext.Provider>
}

export function MarketLiquidityProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return <MarketLiquidityContext.Provider value={EMPTY_VALUE}>{children}</MarketLiquidityContext.Provider>
  }
  return (
    <ConvexProvider client={convexClient}>
      <MarketLiquidityBridge>{children}</MarketLiquidityBridge>
    </ConvexProvider>
  )
}

/** Live shared-ledger deltas + recorder. Returns an empty/no-op value when Convex is absent. */
export function useMarketLiquidity() {
  return useContext(MarketLiquidityContext)
}
