"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"
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
type PriceStatus = { updatedAt: number | null; staleAfterMs: number; count: number }

const PriceStatusContext = React.createContext<PriceStatus | undefined>(undefined)

/** A stable lookup: symbol → USD price (undefined when unpriced). */
export function usePriceFor(): (symbol: string) => number | undefined {
  const map = React.useContext(TokenPricesContext)
  return React.useCallback((symbol: string) => map[priceKey(symbol)], [map])
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
  return { stale: ageMs > status.staleAfterMs, updatedAt: status.updatedAt, ageMs }
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
          <PriceStatusContext.Provider value={undefined}>
            {this.props.fallbackChildren}
          </PriceStatusContext.Provider>
        </TokenPricesContext.Provider>
      )
    }
    return this.props.children
  }
}

export function TokenPricesProvider({ children }: { children: React.ReactNode }) {
  // Lighthouse's isolated artifact uses the static catalog intentionally. Do not
  // open a live oracle subscription there: it adds no audited UI data and a stale
  // remote Convex deployment turns the expected fallback into console errors and
  // retry work. Production and normal local sessions keep the live subscription.
  if (!hasConvexClient || isLighthouseAuditMode()) return <>{children}</>
  return (
    <TokenPricesErrorBoundary fallbackChildren={children}>
      <ConvexTokenPrices>{children}</ConvexTokenPrices>
    </TokenPricesErrorBoundary>
  )
}

function ConvexTokenPrices({ children }: { children: React.ReactNode }) {
  const snapshot = useQuery(api.prices.getPriceSnapshot, {})
  const rows = snapshot?.prices
  const status = snapshot?.status
  const map = React.useMemo(() => {
    const next: Record<string, number> = {}
    for (const row of rows ?? []) next[priceKey(row.symbol)] = row.priceUsd
    return next
  }, [rows])
  return (
    <TokenPricesContext.Provider value={map}>
      <PriceStatusContext.Provider value={status}>{children}</PriceStatusContext.Provider>
    </TokenPricesContext.Provider>
  )
}
