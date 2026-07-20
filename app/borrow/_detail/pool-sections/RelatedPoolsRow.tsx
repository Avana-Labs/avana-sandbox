"use client"

import type { PoolDetail } from "@/app/lib/borrow-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { resolveImageSrc } from "@/lib/image-src"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: PoolDetail }

export function RelatedPoolsRow({ detail }: Props) {
  const { t } = useTranslation()
  return (
    <RelatedItemsRow
      sectionId="related-pools"
      heading={t("Related pools")}
      metricLabelClassName="text-[12px]"
      items={detail.related.map((rel) => {
        const backgroundSrc = resolveImageSrc(rel.visuals[0].iconUrl, rel.visuals[1].iconUrl)
        return {
          key: rel.id,
          href: `/borrow/markets/${rel.id}`,
          background: (
            <>
              <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.14)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1.15px)]" />
              <div className="pointer-events-none absolute inset-0 z-0 rounded-radius-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.004))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.003))]" />
              {backgroundSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  aria-hidden="true"
                  width="320"
                  height="320"
                  className="pointer-events-none absolute -left-12 -top-12 size-[320px] rounded-full object-cover opacity-20 blur-2xl saturate-150"
                  loading="lazy"
                  decoding="async"
                  src={backgroundSrc}
                />
              ) : null}
            </>
          ),
          identity: (
            <div className="flex items-start gap-3">
              <TokenPairCell visuals={rel.visuals} name={rel.name} size="md" />
            </div>
          ),
          metrics: [
            { label: t("Supply APY"), value: rel.aprLabel },
            { label: t("Available"), value: rel.availableLabel },
          ],
        }
      })}
    />
  )
}
