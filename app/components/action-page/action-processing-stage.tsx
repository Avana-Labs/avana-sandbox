"use client"

import Link from "next/link"
import { LoaderCircle } from "lucide-react"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { ActionCard, ActionInfoRow } from "@/app/components/action-page/action-metrics"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import { getProcessingTitle } from "@/app/lib/action-system/action-page-labels"

export function ActionProcessingStage({
  verb,
  preview,
  closeHref,
  onClose,
}: {
  verb: string
  preview: ActionPreviewUi | null
  closeHref?: string
  onClose?: () => void
}) {
  const symbol = preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <div className="space-y-4" data-testid="action-processing-stage">
      <ActionCard className="overflow-hidden">
        <div className="relative px-4 pb-2 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
            <LoaderCircle className="size-3.5 animate-spin" />
            Pending
          </div>

          <div className="flex flex-col items-center py-6 text-center">
            <ActionTokenIcon symbol={symbol} className="size-14" />
            <h2 className="mt-4 text-[1.25rem] font-medium tracking-[-0.03em]">{getProcessingTitle(verb, symbol)}</h2>
          </div>

          <div className="divide-y divide-border border-t border-border">
            <ActionInfoRow label={verb} value={preview?.amountLabel ?? "—"} tooltip="amount" />
            <ActionInfoRow label="Your APY" value={preview?.rateValue ?? "—"} tooltip="apy" />
            <ActionInfoRow label="Market" value={preview?.marketValue ?? "—"} tooltip="market" />
          </div>
        </div>
      </ActionCard>

      {closeHref ? (
        <Link
          href={closeHref}
          className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Close
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Close
        </button>
      )}
    </div>
  )
}
