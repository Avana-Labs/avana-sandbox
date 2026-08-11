"use client"

import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenSingleCell } from "@/app/borrow/components/atoms"
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
        identity: (
          <div className="flex items-start gap-3">
            <TokenSingleCell visual={rel.visual} name={rel.name} subtitle={rel.symbol} size="md" />
          </div>
        ),
        metrics: [
          { label: t("Borrow APR"), value: rel.aprLabel },
          { label: t("Available"), value: rel.availableLabel },
        ],
      }))}
    />
  )
}
