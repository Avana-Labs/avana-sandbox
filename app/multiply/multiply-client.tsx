"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { getMultiplyMarketById, MULTIPLY_MARKET_CATALOG } from "@/app/lib/multiply-system/catalog"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { ExploreLoopsMarketsTable } from "./components/explore-loops-markets-table"
import { MultiplyHero } from "./components/multiply-hero"

function resolveMarketFromRowHref(href: string): MultiplyMarketRecord | null {
  const marketId = href.split("/").pop()
  if (!marketId) return null
  return getMultiplyMarketById(marketId.toLowerCase())
}

export function MultiplyClient({ pageData }: { pageData: MultiplyPageData }) {
  const router = useRouter()
  const session = useMultiplySessionContext()
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  // After hydration, render the live session-backed catalog so market liquidity
  // reflects the wallet's own multiply actions: opening a loop consumes available
  // liquidity and deleveraging returns it (see applyMultiplyAction). The server and
  // first client render keep the static page data so static generation is preserved
  // and there is no hydration mismatch.
  const livePageData = React.useMemo(
    () => (hasMounted ? buildMultiplyPageData(session.walletId, session.state) : pageData),
    [hasMounted, pageData, session.state, session.walletId],
  )

  const handleOpenMultiply = React.useCallback(
    (marketId: string) => {
      const market = getMultiplyMarketById(marketId.toLowerCase())
      if (!market) return
      router.push(actionPagePath("multiply", "multiply", { market: market.id }))
    },
    [router],
  )

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
        <MultiplyHero markets={livePageData.markets} />
        <ExploreLoopsMarketsTable
          rows={livePageData.lendRows}
          trendingSnapshots={livePageData.trendingSnapshots}
          pageSize={livePageData.pageSize}
          tokenBorrowApys={livePageData.tokenBorrowApys}
          tokenLogos={livePageData.tokenLogos}
          tokenSupplyApys={livePageData.tokenSupplyApys}
          onOpenMultiply={(href) => {
            const market = resolveMarketFromRowHref(href)
            if (market) handleOpenMultiply(market.id)
          }}
        />
        <p className="mt-3 text-[12px] text-muted-foreground">
          Showing {livePageData.lendRows.length} sandbox multiply markets from the unified catalog.
        </p>
      </div>
    </main>
  )
}

export { MULTIPLY_MARKET_CATALOG }
