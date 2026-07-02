"use client"

import { useState } from "react"
import type { ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"
import { TransactionReceipt, type TransactionReceiptData } from "@/app/components/action-page/transaction-receipt"
import { syntheticBlockFromHash, syntheticNetworkFeeUsdFromHash } from "@/app/lib/action-system/synthetic-receipt"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"

export function ActionSuccessStage({
  success,
  closeHref,
  onPrimary,
  onSecondary,
  secondaryLabel,
}: {
  success: ActionSuccessUi
  closeHref?: string
  onPrimary?: () => void
  onSecondary?: () => void
  secondaryLabel?: string
}) {
  const receipt = success.receiptContext
  const hash = success.receiptHash
  // Stable per mount so re-renders (e.g. switching currency) don't bump the timestamp.
  const [dateMs] = useState(() => Date.now())

  const symbol = receipt?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  // Only link the hash to its permalink when that page can actually resolve it (live
  // Convex). In dev-shortcut mode the synthetic hash isn't persisted, so it renders as
  // plain text instead of dead-ending — same guard the receipt page relies on.
  const hashHref = hash && !IS_DEV_SHORTCUT_MODE ? `/sandbox/transactions/${encodeURIComponent(hash)}` : null

  const data: TransactionReceiptData = {
    title: success.title,
    description: success.description,
    symbol,
    amountRowLabel: receipt?.verb,
    amountLabel: receipt?.amountLabel,
    amountUsd: receipt?.amountUsd ?? null,
    rateLabel: receipt?.rateLabel ?? null,
    rateValue: receipt?.rateValue ?? null,
    marketValue: receipt?.marketValue ?? null,
    networkFeeUsd: hash ? syntheticNetworkFeeUsdFromHash(hash) : null,
    block: hash ? syntheticBlockFromHash(hash) : null,
    dateMs,
    hash,
    hashHref,
    metrics: success.metrics,
  }

  return (
    <div data-testid="action-success-stage" className="space-y-4">
      <TransactionReceipt data={data} />

      <ActionFooter
        primaryLabel={success.primaryCtaLabel}
        secondaryLabel={secondaryLabel ?? success.secondaryCtaLabel}
        primaryHref={onPrimary ? undefined : success.primaryCtaHref}
        secondaryHref={onSecondary ? undefined : closeHref}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />
    </div>
  )
}
