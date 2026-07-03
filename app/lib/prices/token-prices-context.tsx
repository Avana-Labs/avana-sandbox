"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { priceKey } from "./format"

/**
 * Live token prices (base symbol → USD) from the Convex oracle, provided once and
 * read by the borrow-list cells (pair exchange rate / asset price under the logos).
 * Reading once here avoids a useQuery subscription per row. Degrades to an empty
 * map when no Convex client is mounted, so cells fall back to their static labels.
 */
const TokenPricesContext = React.createContext<Record<string, number>>({})

/**
 * Price freshness, surfaced so the UI can warn when the refresh cron has stalled instead
 * of presenting last-known values as live. `stale` is false until the status query
 * resolves (don't flash a warning during the initial load) and when no Convex client is
 * mounted (static-label fallback, nothing to be stale about).
 */
export type PriceFreshness = { stale: boolean; updatedAt: number | null; ageMs: number | null }

const PriceFreshnessContext = React.createContext<PriceFreshness>({ stale: false, updatedAt: null, ageMs: null })

/** A stable lookup: symbol → USD price (undefined when unpriced). */
export function usePriceFor(): (symbol: string) => number | undefined {
  const map = React.useContext(TokenPricesContext)
  return React.useCallback((symbol: string) => map[priceKey(symbol)], [map])
}

/** Freshness of the oracle prices — read this to show a "prices may be stale" indicator. */
export function usePriceFreshness(): PriceFreshness {
  return React.useContext(PriceFreshnessContext)
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
class TokenPricesErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackChildren: React.ReactNode },
  { errored: boolean }
> {
  state = { errored: false }

  static getDerivedStateFromError() {
    return { errored: true }
  }

  render() {
    if (this.state.errored) {
      // Render the app children directly (NOT the throwing Convex subtree) with neutral
      // defaults, so the failed prices query can't re-throw in a loop.
      return (
        <TokenPricesContext.Provider value={{}}>
          <PriceFreshnessContext.Provider value={{ stale: false, updatedAt: null, ageMs: null }}>
            {this.props.fallbackChildren}
          </PriceFreshnessContext.Provider>
        </TokenPricesContext.Provider>
      )
    }
    return this.props.children
  }
}

export function TokenPricesProvider({ children }: { children: React.ReactNode }) {
  if (!hasConvexClient) return <>{children}</>
  return (
    <TokenPricesErrorBoundary fallbackChildren={children}>
      <ConvexTokenPrices>{children}</ConvexTokenPrices>
    </TokenPricesErrorBoundary>
  )
}

function ConvexTokenPrices({ children }: { children: React.ReactNode }) {
  const rows = useQuery(api.prices.getPrices, {})
  const status = useQuery(api.prices.getPriceStatus, {})
  const map = React.useMemo(() => {
    const next: Record<string, number> = {}
    for (const row of rows ?? []) next[priceKey(row.symbol)] = row.priceUsd
    return next
  }, [rows])
  // Derive staleness from a CLIENT-side ticking clock, not the reactive query (which returns
  // only updatedAt). getPriceStatus is cached until tokenPrices changes, so if freshness were
  // computed server-side it would freeze; ticking `now` here lets fresh→stale flip in real time
  // even while the cron is wedged. Initialised in an effect (null first) to avoid an SSR/client
  // hydration mismatch on Date.now().
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const freshness = React.useMemo<PriceFreshness>(() => {
    if (status === undefined) return { stale: false, updatedAt: null, ageMs: null } // still loading
    if (status.updatedAt == null) return { stale: true, updatedAt: null, ageMs: null } // never refreshed
    if (now == null) return { stale: false, updatedAt: status.updatedAt, ageMs: null } // pre-first-tick
    const ageMs = Math.max(0, now - status.updatedAt)
    return { stale: ageMs > status.staleAfterMs, updatedAt: status.updatedAt, ageMs }
  }, [status, now])
  return (
    <TokenPricesContext.Provider value={map}>
      <PriceFreshnessContext.Provider value={freshness}>{children}</PriceFreshnessContext.Provider>
    </TokenPricesContext.Provider>
  )
}
