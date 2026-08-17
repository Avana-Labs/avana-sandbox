"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { setCanonicalPrices } from "./canonical"
import { priceKey } from "./format"
import { PriceStatusContext, TokenPricesContext } from "./token-prices-context"
import { applyLiveRates } from "@/app/lib/currency/rates"
import { FX_RATES_UPDATED_EVENT } from "@/app/lib/currency/rates"
import type { CurrencyCode } from "@/app/components/display-preferences"

class TokenPricesErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackChildren: React.ReactNode },
  { errored: boolean }
> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  render() {
    if (this.state.errored) return this.props.fallbackChildren
    return this.props.children
  }
}

function ConvexTokenPricesQuery({ children, seed = {} }: { children: React.ReactNode; seed?: Record<string, number> }) {
  const snapshot = useQuery(api.prices.getPriceSnapshot, {})
  const rows = snapshot?.prices
  const status = snapshot?.status
  // Start from the server seed (live prices fetched during SSR) and overlay the realtime rows
  // on top when the subscription delivers them — so consumers stay live even while the query is
  // loading or when it never resolves (no realtime client on this route).
  const map = React.useMemo(() => {
    const next: Record<string, number> = { ...seed }
    for (const row of rows ?? []) next[priceKey(row.symbol)] = row.priceUsd
    return next
  }, [rows, seed])
  // Overlay the same seed+live prices onto the module canonical store so the engine + any
  // non-reactive `canonicalPriceUsd` reader also sees the refreshed price (not just the
  // fixture). Effect, not render, to avoid a side-effect during render.
  React.useEffect(() => {
    const merged: Record<string, number> = { ...seed }
    for (const row of rows ?? []) merged[row.symbol] = row.priceUsd
    if (Object.keys(merged).length > 0) setCanonicalPrices(merged)
  }, [rows, seed])

  // Fiat FX rates from the validated Convex layer (convex/fx.ts). Apply them onto the currency
  // overlay so conversion flows through Convex rather than only the client poll, then notify the
  // preferences provider to re-render currency consumers. Falls back to the /api/fx-rates client
  // path when Convex has no rows yet.
  const fx = useQuery(api.fx.getFxRates, {})
  const fxRows = fx?.rates
  React.useEffect(() => {
    if (fxRows && fxRows.length > 0) {
      applyLiveRates(
        Object.fromEntries(fxRows.map((r) => [r.currency, r.usdPerUnit])) as Partial<Record<CurrencyCode, number>>,
      )
      window.dispatchEvent(new Event(FX_RATES_UPDATED_EVENT))
    }
  }, [fxRows])

  return (
    <TokenPricesContext.Provider value={map}>
      <PriceStatusContext.Provider value={status}>{children}</PriceStatusContext.Provider>
    </TokenPricesContext.Provider>
  )
}

export default function ConvexTokenPrices({
  children,
  seed,
}: {
  children: React.ReactNode
  seed?: Record<string, number>
}) {
  return (
    <TokenPricesErrorBoundary fallbackChildren={children}>
      <ConvexTokenPricesQuery seed={seed}>{children}</ConvexTokenPricesQuery>
    </TokenPricesErrorBoundary>
  )
}
