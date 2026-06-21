"use client"

import type { ActionKind, ActionProduct } from "@/app/lib/action-system/contracts"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { LendActionPageClient } from "@/app/components/action-page/lend-action-page-client"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"
import { RewardsActionPageClient } from "@/app/components/action-page/rewards-action-page-client"

export function ActionPageClient({
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
  if (product === "borrow") {
    return (
      <BorrowActionPageClient
        kind={kind as "borrow" | "repay" | "supply" | "remove" | "claim"}
        closeHref={closeHref}
        initialAssetId={initialAssetId}
        initialMarketId={initialMarketId}
        initialAmount={initialAmount}
      />
    )
  }

  if (product === "lend") {
    return (
      <LendActionPageClient
        kind={kind as "deposit" | "withdraw"}
        closeHref={closeHref ?? "/lend"}
        initialMarketId={initialMarketId}
        initialAmount={initialAmount}
      />
    )
  }

  if (product === "multiply") {
    return (
      <MultiplyActionPageClient
        kind={kind as "multiply" | "deleverage"}
        closeHref={closeHref ?? "/multiply"}
        initialMarketId={initialMarketId}
        initialAmount={initialAmount}
        initialMultiplier={initialMultiplier}
      />
    )
  }

  return <RewardsActionPageClient closeHref={closeHref ?? "/rewards"} />
}
