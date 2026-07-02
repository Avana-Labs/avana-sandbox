"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { ConvexProviderWithAuth, ConvexReactClient, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useConvexSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

export type MarketLiquidityDelta = { borrowedDeltaUsd: number; suppliedDeltaUsd: number }

export type RecordDeltaInput = { marketSlug: string; borrowedDeltaUsd?: number; suppliedDeltaUsd?: number }

export type MarketLiquidityValue = {
  /**
   * Per-slug aggregate liquidity deltas layered on the static catalog base.
   * Keying convention (single source of truth for every surface):
   *   - borrowable-asset liquidity → keyed by ASSET id  (borrowedDeltaUsd)
   *   - pool / market supplied TVL  → keyed by MARKET id (suppliedDeltaUsd)
   * Use the helpers in `@/app/lib/market-liquidity/apply` rather than reading raw.
   */
  deltas: Map<string, MarketLiquidityDelta>
  /** True once the shared Convex ledger query has resolved (cross-user mode). */
  connected: boolean
  /** Fold a borrow/repay/supply/withdraw into the ledger (Convex when online, else local). */
  recordDelta: (input: RecordDeltaInput) => void
}

const EMPTY_DELTAS = new Map<string, MarketLiquidityDelta>()

const MarketLiquidityContext = createContext<MarketLiquidityValue>({
  deltas: EMPTY_DELTAS,
  connected: false,
  recordDelta: () => undefined,
})

// Created once at module load. NEXT_PUBLIC_ vars are inlined, so this resolves
// identically on server and client (no hydration mismatch). The client connects
// lazily on the first subscription; if the URL is unreachable, useQuery stays
// undefined and we fall back to the in-session local ledger below.
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

function mergeDelta(map: Map<string, MarketLiquidityDelta>, input: RecordDeltaInput) {
  const borrowedDeltaUsd = Number.isFinite(input.borrowedDeltaUsd) ? (input.borrowedDeltaUsd as number) : 0
  const suppliedDeltaUsd = Number.isFinite(input.suppliedDeltaUsd) ? (input.suppliedDeltaUsd as number) : 0
  if (borrowedDeltaUsd === 0 && suppliedDeltaUsd === 0) return map
  const next = new Map(map)
  const current = next.get(input.marketSlug) ?? { borrowedDeltaUsd: 0, suppliedDeltaUsd: 0 }
  next.set(input.marketSlug, {
    borrowedDeltaUsd: current.borrowedDeltaUsd + borrowedDeltaUsd,
    suppliedDeltaUsd: current.suppliedDeltaUsd + suppliedDeltaUsd,
  })
  return next
}

/**
 * Client-local fallback ledger. Whenever the shared Convex ledger is unreachable
 * (no `NEXT_PUBLIC_CONVEX_URL`, or configured but offline), the wallet's own
 * borrow/lend/supply/withdraw still move market liquidity in-session so every
 * surface stays stateful and consistent. When Convex connects, its cross-user
 * deltas take over and this local store is ignored.
 */
function useLocalLedger() {
  const [localDeltas, setLocalDeltas] = useState<Map<string, MarketLiquidityDelta>>(EMPTY_DELTAS)
  const recordLocal = useCallback((input: RecordDeltaInput) => {
    setLocalDeltas((current) => mergeDelta(current, input))
  }, [])
  return { localDeltas, recordLocal }
}

function MarketLiquidityBridge({
  localDeltas,
  recordLocal,
  children,
}: {
  localDeltas: Map<string, MarketLiquidityDelta>
  recordLocal: (input: RecordDeltaInput) => void
  children: ReactNode
}) {
  const rows = useQuery(api.liquidity.listDeltas)
  const connected = rows !== undefined

  const value = useMemo<MarketLiquidityValue>(() => {
    if (!connected) {
      // Convex configured but unreachable → keep the local fallback live.
      return { deltas: localDeltas, connected: false, recordDelta: recordLocal }
    }
    const deltas = new Map<string, MarketLiquidityDelta>()
    for (const row of rows ?? []) {
      deltas.set(row.marketSlug, {
        borrowedDeltaUsd: row.borrowedDeltaUsd,
        suppliedDeltaUsd: row.suppliedDeltaUsd,
      })
    }
    // In connected mode the shared ledger is written ONLY server-side inside the
    // idempotent `recordTransaction` (there is no public client recorder), so `recordDelta`
    // is a deliberate no-op here — a client can never fold an arbitrary delta into the
    // cross-user numbers. The demo bridge already skips folding when `connected`.
    return { deltas, connected: true, recordDelta: () => undefined }
  }, [connected, rows, localDeltas, recordLocal])

  return <MarketLiquidityContext.Provider value={value}>{children}</MarketLiquidityContext.Provider>
}

export function MarketLiquidityProvider({ children }: { children: ReactNode }) {
  const { localDeltas, recordLocal } = useLocalLedger()

  if (!convexClient) {
    // No Convex configured → the local ledger is the single source of truth.
    return (
      <MarketLiquidityContext.Provider value={{ deltas: localDeltas, connected: false, recordDelta: recordLocal }}>
        {children}
      </MarketLiquidityContext.Provider>
    )
  }
  return (
    // ConvexProviderWithAuth attaches the SIWE JWT (when signed in) to authed sandbox
    // calls; public market-data queries still resolve when signed out (identity null).
    <ConvexProviderWithAuth client={convexClient} useAuth={useConvexSiweAuth}>
      <MarketLiquidityBridge localDeltas={localDeltas} recordLocal={recordLocal}>
        {children}
      </MarketLiquidityBridge>
    </ConvexProviderWithAuth>
  )
}

/** Live shared-ledger deltas + recorder. Falls back to the in-session local ledger when Convex is absent. */
export function useMarketLiquidity() {
  return useContext(MarketLiquidityContext)
}

/**
 * True when a Convex client is configured (NEXT_PUBLIC_CONVEX_URL set). Stable for
 * the session (decided at module load). Use it to conditionally RENDER components
 * that call Convex's `useQuery` so they only mount when a ConvexProvider exists.
 */
export const hasConvexClient = convexClient != null
