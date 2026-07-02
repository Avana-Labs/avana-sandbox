"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import type { ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  const { t } = useTranslation()
  const symbol = success.receiptContext?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"
  const receipt = success.receiptContext

  // Link the receipt hash to its sandbox receipt page so the flow can reach it.
  const receiptLine = success.receiptHash ? (
    <p className="mt-2 font-data text-[12px] text-muted-foreground">
      {t("Receipt")}:{" "}
      <Link
        href={`/sandbox/transactions/${encodeURIComponent(success.receiptHash)}`}
        className="text-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-brand-readable"
      >
        {success.receiptHash}
      </Link>
    </p>
  ) : null

  return (
    <div data-testid="action-success-stage" className="space-y-4">
      {receipt ? (
        <ActionCard className="overflow-hidden">
          <div className="relative px-4 pb-2 pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              {t("Confirmed")}
            </div>

            <div className="flex flex-col items-center py-6 text-center">
              <ActionTokenIcon symbol={symbol} className="size-14" />
              <h2 className="mt-4 text-[1.25rem] font-medium tracking-[-0.03em]">{t(success.title)}</h2>
              <p className="mt-1.5 max-w-sm text-[14px] text-muted-foreground">{t(success.description)}</p>
              {receiptLine}
            </div>

            <div className="divide-y divide-border border-t border-border">
              <ActionInfoRow label={receipt.verb} value={receipt.amountLabel} tooltip="amount" />
              <ActionInfoRow label={receipt.rateLabel} value={receipt.rateValue} tooltip="rate" />
              <ActionInfoRow label={t("Market")} value={receipt.marketValue} tooltip="market" />
            </div>
          </div>
        </ActionCard>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-7 text-emerald-500" />
          </div>
          <h2 className="mt-3 text-[18px] font-medium tracking-[-0.02em]">{t(success.title)}</h2>
          <p className="mt-1.5 max-w-sm text-[14px] text-muted-foreground">{t(success.description)}</p>
          {receiptLine}
        </div>
      )}

      {success.metrics.length > 0 ? <ActionMetricsBlock rows={success.metrics} /> : null}

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
