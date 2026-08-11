"use client"

import type { PoolDetail } from "@/app/lib/borrow-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { RelatedItemsRow } from "@/app/components/detail/related-items-row"

type Props = { detail: PoolDetail }

export function RelatedPoolsRow({ detail }: Props) {
  const { t } = useTranslation()
  return (
    <RelatedItemsRow
      sectionId="related-pools"
      heading={t("Related pools")}
      items={detail.related.map((rel) => ({
        key: rel.id,
        href: `/borrow/markets/${rel.id}`,
        identity: (
          <div className="flex items-start gap-3">
            <TokenPairCell visuals={rel.visuals} name={rel.name} size="md" />
          </div>
        ),
        metrics: [
          { label: t("Supply APY"), value: rel.aprLabel },
          { label: t("Available"), value: rel.availableLabel },
        ],
      }))}
    />
  )
}
