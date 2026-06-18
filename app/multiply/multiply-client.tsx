"use client"

import dynamic from "next/dynamic"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { MultiplyHero } from "./components/multiply-hero"

const ExploreLoopsMarketsTable = dynamic(
  () => import("./components/explore-loops-markets-table").then((mod) => mod.ExploreLoopsMarketsTable),
  {
    loading: () => <div className="mt-8 h-[880px] rounded-radius-md border border-border bg-surface-raised/60" />,
  },
)

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
