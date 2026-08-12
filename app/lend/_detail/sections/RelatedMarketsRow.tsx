"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
import { TokenSingleCell } from "@/app/borrow/components/atoms"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: LendMarketDetail }

export function RelatedMarketsRow({ detail }: Props) {
  return (
    <RelatedItemsRow
      sectionId="related-markets"
      heading="Related markets"
      items={detail.related.map((rel) => ({
        key: rel.id,
        href: `/lend/markets/${rel.id}`,
        identity: (
          <div className="flex items-start gap-3">
            <TokenSingleCell visual={rel.visual} name={rel.name} subtitle={rel.symbol} size="md" />
          </div>
        ),
        metrics: [
          { label: "Total APY", value: rel.apyLabel },
          { label: "Available", value: rel.availableLabel },
        ],
      }))}
    />
  )
}
