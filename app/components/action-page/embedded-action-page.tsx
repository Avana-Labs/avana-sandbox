"use client"

import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"
import { ActionPageClient } from "@/app/components/action-page/action-page-client"

export function EmbeddedActionPage({
  product,
  kind,
  closeHref,
  initialAssetId,
  initialMarketId,
  initialAmount,
  initialMultiplier,
}: {
  product: ActionProduct
  kind: ActionKind
  closeHref?: string
  initialAssetId?: string
  initialMarketId?: string
  initialAmount?: string
  initialMultiplier?: string
}) {
  return (
    <ActionPageClient
      product={product}
      kind={kind}
      mode="embedded"
      closeHref={closeHref}
      initialAssetId={initialAssetId}
      initialMarketId={initialMarketId}
      initialAmount={initialAmount}
      initialMultiplier={initialMultiplier}
    />
  )
}
