"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import { getMultiplyMarketById, MULTIPLY_MARKET_CATALOG } from "@/app/lib/multiply-system/catalog"
import { MultiplyActionModal } from "./components/multiply-action-modal"
import { MultiplyHero } from "./components/multiply-hero"

const ExploreLoopsMarketsTable = dynamic(
  () => import("./components/explore-loops-markets-table").then((mod) => mod.ExploreLoopsMarketsTable),
  {
    loading: () => <div className="mt-8 h-[880px] rounded-radius-md border border-border bg-surface-raised/60" />,
  },
)

function resolveMarketFromRowHref(href: string): MultiplyMarketRecord | null {
  const marketId = href.split("/").pop()
  if (!marketId) return null
  return getMultiplyMarketById(marketId.toLowerCase())
}

export function MultiplyClient({ pageData }: { pageData: MultiplyPageData }) {
  const [selectedMarket, setSelectedMarket] = React.useState<MultiplyMarketRecord | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)

  const handleOpenMultiply = React.useCallback((marketId: string) => {
    const market = getMultiplyMarketById(marketId.toLowerCase())
    if (!market) return
    setSelectedMarket(market)
    setModalOpen(true)
  }, [])

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
        <MultiplyHero markets={pageData.markets} />
        <ExploreLoopsMarketsTable
          rows={pageData.lendRows}
          pageSize={pageData.pageSize}
          tokenBorrowApys={pageData.tokenBorrowApys}
          tokenLogos={pageData.tokenLogos}
          tokenSupplyApys={pageData.tokenSupplyApys}
          onOpenMultiply={(href) => {
            const market = resolveMarketFromRowHref(href)
            if (market) handleOpenMultiply(market.id)
          }}
        />
        <p className="mt-3 text-[12px] text-muted-foreground">
          Showing {pageData.lendRows.length} sandbox multiply markets from the unified catalog.
        </p>
      </div>

      <MultiplyActionModal open={modalOpen} onOpenChange={setModalOpen} market={selectedMarket} />
    </main>
  )
}

export { MULTIPLY_MARKET_CATALOG }
