"use client"

import type { ActionKind, ActionPageMode, ActionProduct } from "@/app/lib/action-system/contracts"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { LendActionPageClient } from "@/app/components/action-page/lend-action-page-client"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"
import { RewardsActionPageClient } from "@/app/components/action-page/rewards-action-page-client"

export function ActionPageClient({
  product,
  kind,
  mode = "page",
  closeHref,
  initialAssetId,
  initialMarketId,
  initialAmount,
  initialMultiplier,
}: {
  product: ActionProduct
  kind: ActionKind
  mode?: ActionPageMode
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
        mode={mode}
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
        mode={mode}
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
        mode={mode}
        closeHref={closeHref ?? "/multiply"}
        initialMarketId={initialMarketId}
        initialAmount={initialAmount}
        initialMultiplier={initialMultiplier}
      />
    )
  }

  return <RewardsActionPageClient mode={mode} closeHref={closeHref ?? "/rewards"} />
}
