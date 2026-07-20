"use client"

import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenSingleCell } from "@/app/borrow/components/atoms"
import { hasImageSrc } from "@/lib/image-src"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: AssetDetail }

export function RelatedAssetsRow({ detail }: Props) {
  const { t } = useTranslation()
  return (
    <RelatedItemsRow
      sectionId="related-markets"
      heading={t("Related markets")}
      items={detail.related.map((rel) => ({
        key: rel.id,
        href: borrowAssetDetailPath(rel.id),
        background: (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.14)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1.15px)]" />
            <div className="pointer-events-none absolute inset-0 z-0 rounded-radius-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.004))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.003))]" />
            {hasImageSrc(rel.visual.iconUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                aria-hidden="true"
                width="274"
                height="274"
                className="pointer-events-none absolute -left-5 -top-5 size-[274px] rounded-full object-cover opacity-10 blur-2xl saturate-150"
                loading="lazy"
                decoding="async"
                src={rel.visual.iconUrl}
              />
            ) : null}
          </>
        ),
        identity: (
          <div className="flex items-start gap-3">
            <TokenSingleCell visual={rel.visual} name={rel.name} subtitle={rel.symbol} size="md" />
          </div>
        ),
        metrics: [
          { label: t("Borrow APY"), value: rel.aprLabel },
          { label: t("Available"), value: rel.availableLabel },
        ],
      }))}
    />
  )
}
