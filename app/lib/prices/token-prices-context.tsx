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

/** A stable lookup: symbol → USD price (undefined when unpriced). */
export function usePriceFor(): (symbol: string) => number | undefined {
  const map = React.useContext(TokenPricesContext)
  return React.useCallback((symbol: string) => map[priceKey(symbol)], [map])
}

export function TokenPricesProvider({ children }: { children: React.ReactNode }) {
  if (!hasConvexClient) return <>{children}</>
  return <ConvexTokenPrices>{children}</ConvexTokenPrices>
}

function ConvexTokenPrices({ children }: { children: React.ReactNode }) {
  const rows = useQuery(api.prices.getPrices, {})
  const map = React.useMemo(() => {
    const next: Record<string, number> = {}
    for (const row of rows ?? []) next[priceKey(row.symbol)] = row.priceUsd
    return next
  }, [rows])
  return <TokenPricesContext.Provider value={map}>{children}</TokenPricesContext.Provider>
}
