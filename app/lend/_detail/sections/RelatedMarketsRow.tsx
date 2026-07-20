"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
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
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center" aria-hidden="true">
              {rel.visual.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rel.visual.iconUrl}
                  alt=""
                  className="size-8 object-contain"
                  width={32}
                  height={32}
                  loading="lazy"
                />
              ) : (
                <span className="text-[11px] font-medium text-muted-foreground">{rel.visual.shortLabel}</span>
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">{rel.name}</div>
              <div className="text-[11px] text-muted-foreground">{rel.symbol}</div>
            </div>
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
