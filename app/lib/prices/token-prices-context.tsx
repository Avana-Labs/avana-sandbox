"use client"

import * as React from "react"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { isLighthouseAuditMode, shouldUseOpenGateSession } from "@/app/lib/test-mode"
import { priceKey } from "./format"
import { PRICE_FIXTURE } from "./price-fixture"

/**
 * Live token prices (base symbol → USD) from the Convex oracle, provided once and
 * read by the borrow-list cells (pair exchange rate / asset price under the logos).
 * Reading once here avoids a useQuery subscription per row. Degrades to an empty
 * map when no Convex client is mounted, so cells fall back to their static labels.
 */
export const TokenPricesContext = React.createContext<Record<string, number>>({})

/**
 * Price freshness, surfaced so the UI can warn when the refresh cron has stalled instead
 * of presenting last-known values as live. `stale` is false until the status query
 * resolves (don't flash a warning during the initial load) and when no Convex client is
 * mounted (static-label fallback, nothing to be stale about).
 */
export type PriceFreshness = {
  stale: boolean
  updatedAt: number | null
  ageMs: number | null
}
export type PriceStatus = {
  updatedAt: number | null
  staleAfterMs: number
  count: number
}

export const PriceStatusContext = React.createContext<PriceStatus | undefined>(undefined)
const ConvexTokenPrices = React.lazy(() => import("./convex-token-prices"))

/** A stable lookup: symbol → USD price (undefined when unpriced). */
export function usePriceFor(): (symbol: string) => number | undefined {
  const map = React.useContext(TokenPricesContext)
  return React.useCallback((symbol: string) => map[priceKey(symbol)], [map])
}

/**
 * REACTIVE canonical price lookup for client components: the live oracle price from
 * context (re-renders when the overlay lands) with the deterministic PRICE_FIXTURE as a
 * fallback. Use this instead of the non-reactive `canonicalPriceUsd` module read — that
 * one is captured once at first render and never updates when the live prices arrive, so
 * a token stays pinned to the fixture (e.g. AAVE $105) even after the oracle refreshes.
 * The fixture fallback keeps SSR and the first client paint identical (no hydration
 * mismatch) and always resolves a known token to a price rather than its bare symbol.
 */
export function useCanonicalPriceFor(): (symbol: string) => number | undefined {
  const live = usePriceFor()
  return React.useCallback((symbol: string) => live(symbol) ?? PRICE_FIXTURE[symbol.trim().toUpperCase()], [live])
}

/** Freshness of the oracle prices — read this to show a "prices may be stale" indicator. */
export function usePriceFreshness(): PriceFreshness {
  const status = React.useContext(PriceStatusContext)
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (status === undefined) return undefined
    const tick = () => {
      if (document.visibilityState === "visible") setNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [status])

  if (status === undefined) return { stale: false, updatedAt: null, ageMs: null }
  if (status.updatedAt == null) return { stale: true, updatedAt: null, ageMs: null }
  if (now == null) return { stale: false, updatedAt: status.updatedAt, ageMs: null }
  const ageMs = Math.max(0, now - status.updatedAt)
  return {
    stale: ageMs > status.staleAfterMs,
    updatedAt: status.updatedAt,
    ageMs,
  }
}

/**
 * Prices are decorative — a label under the pair logos plus a "may be stale" hint — so a
 * failing Convex prices query must never take down the whole app. `useQuery` re-throws
 * server errors during render (e.g. `getPriceStatus` missing on a stale Convex deploy, or
 * the backend offline), and this provider sits ABOVE the onboarding gate in the root
 * layout, so an uncaught throw here escalates to the global error boundary ("Something
 * went wrong"). Catch it and fall back to the neutral defaults instead — cells show their
 * static labels, no staleness banner. Mirrors `MarketLiquidityErrorBoundary`.
 */
const EMPTY_PRICES: Record<string, number> = {}

export function TokenPricesProvider({
  children,
  initialPrices,
}: {
  children: React.ReactNode
  initialPrices?: Record<string, number>
}) {
  // Base context = the server-seeded live oracle prices (fetched once during SSR, keys in
  // `priceKey` form). This is what makes CLIENT-rendered prices live even though the realtime
  // Convex subscription only mounts on authenticated product routes — the client no longer
  // depends on that subscription to escape the fixture. Token prices are PUBLIC data.
  const seed = initialPrices ?? EMPTY_PRICES

  // Skip the realtime subscription when there's no Convex client (nothing to query) and on the
  // open-gate/Lighthouse test surfaces (deterministic static catalog). The seed still flows, so
  // prices stay live from SSR; the subscription, when present, only layers fresher values on top.
  if (!hasConvexClient || shouldUseOpenGateSession() || isLighthouseAuditMode()) {
    return <TokenPricesContext.Provider value={seed}>{children}</TokenPricesContext.Provider>
  }
  return (
    <TokenPricesContext.Provider value={seed}>
      <React.Suspense fallback={children}>
        <ConvexTokenPrices seed={seed}>{children}</ConvexTokenPrices>
      </React.Suspense>
    </TokenPricesContext.Provider>
  )
}
