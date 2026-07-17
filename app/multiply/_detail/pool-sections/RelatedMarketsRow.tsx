"use client"

import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { resolveImageSrc } from "@/lib/image-src"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: MultiplyMarketDetail }

export function RelatedMarketsRow({ detail }: Props) {
  return (
    <RelatedItemsRow
      sectionId="related-markets"
      heading="Related markets"
      items={detail.related.map((rel) => {
        const backgroundSrc = resolveImageSrc(rel.visuals[0].iconUrl, rel.visuals[1].iconUrl)
        return {
          key: rel.id,
          href: `/multiply/markets/${rel.id}`,
          background: backgroundSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden="true"
              width="160"
              height="160"
              className="pointer-events-none absolute -left-12 -top-12 size-[320px] rounded-full object-cover opacity-20 blur-2xl saturate-150"
              loading="lazy"
              decoding="async"
              src={backgroundSrc}
            />
          ) : null,
          identity: (
            <div className="flex items-start gap-3">
              <TokenPairCell visuals={rel.visuals} name={rel.name} size="md" />
            </div>
          ),
          metrics: [
            { label: "APY at max leverage", value: rel.maxApyLabel },
            { label: "Available", value: rel.availableLabel },
          ],
        }
      })}
    />
  )
}
