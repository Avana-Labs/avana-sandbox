"use client"

import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: MultiplyMarketDetail }

export function RelatedMarketsRow({ detail }: Props) {
  return (
    <RelatedItemsRow
      sectionId="related-markets"
      heading="Related markets"
      items={detail.related.map((rel) => ({
        key: rel.id,
        href: `/multiply/markets/${rel.id}`,
        identity: (
          <div className="flex items-start gap-3">
            <TokenPairCell visuals={rel.visuals} name={rel.name} size="md" />
          </div>
        ),
        metrics: [
          { label: "APY at max leverage", value: rel.maxApyLabel },
          { label: "Available", value: rel.availableLabel },
        ],
      }))}
    />
  )
}
