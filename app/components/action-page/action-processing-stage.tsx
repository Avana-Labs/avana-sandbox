"use client"

import Link from "next/link"
import { Check, LoaderCircle } from "lucide-react"
import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import { ProcessingNarration } from "@/app/components/action-page/processing-narration"
import { getProcessingTitle } from "@/app/lib/action-system/action-page-labels"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function ActionProcessingStage({
  verb,
  preview,
  closeHref,
  onClose,
  stage = "processing",
}: {
  verb: string
  preview: ActionPreviewUi | null
  closeHref?: string
  onClose?: () => void
  stage?: ActionStage
}) {
  const { t } = useTranslation()
  const symbol = preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <div className="space-y-4" data-testid="action-processing-stage">
      <ActionCard className="overflow-hidden">
        <div className="relative px-4 pb-2 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
            <LoaderCircle className="size-3.5 animate-spin" />
            {t(
              stage === "submitted"
                ? "Submitted"
                : stage === "confirmed"
                  ? "Confirmed"
                  : stage === "refreshing_position"
                    ? "Refreshing position"
                    : stage === "reconciled"
                      ? "Reconciled"
                      : "Pending",
            )}
          </div>

          <div className="flex flex-col items-center py-6 text-center">
            <ActionTokenIcon symbol={symbol} className="size-14" />
            <h2 className="mt-4 text-[1.25rem] font-medium tracking-[-0.03em]">{t(getProcessingTitle(verb, symbol))}</h2>
          </div>

          <ProcessingNarration verb={verb} />

          {preview?.executionSteps?.length ? (
            <ol className="mt-5 space-y-2" aria-label={t("Execution steps")}>
              {preview.executionSteps.map((step, index) => {
                const completed = stage === "confirmed" || stage === "refreshing_position" || stage === "reconciled"
                const active = !completed && index === 0
                return (
                  <li key={step.id} className="flex items-center gap-3 rounded-radius-md bg-surface-inset px-3 py-2 text-[13px]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px]">
                      {completed ? <Check className="size-3 text-success" /> : active ? <LoaderCircle className="size-3 animate-spin" /> : index + 1}
                    </span>
                    <span className={completed ? "text-foreground" : "text-muted-foreground"}>{t(step.label)}</span>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </div>
      </ActionCard>

      {closeHref ? (
        <Link
          href={closeHref}
          className="flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          {t("Close")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          {t("Close")}
        </button>
      )}
    </div>
  )
}
