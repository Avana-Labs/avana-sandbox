"use client"

import type { ReactNode } from "react"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { MarketLiquidityProvider } from "@/app/lib/convex/market-liquidity-provider"

export function AvanaSessionProviders({
  walletId,
  children,
}: {
  walletId?: string
  children: ReactNode
}) {
  return (
    <MarketLiquidityProvider>
      <AvanaSessionsProvider walletId={walletId}>{children}</AvanaSessionsProvider>
    </MarketLiquidityProvider>
  )
}
