"use client"

import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { MultiplyHero } from "./components/multiply-hero"
import { ExploreLoopsMarketsTable } from "./components/explore-loops-markets-table"

export function MultiplyClient({ pageData }: { pageData: MultiplyPageData }) {
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
        />
      </div>
    </main>
  )
}
