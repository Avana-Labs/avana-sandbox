"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import type { ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { ActionCard, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"

export function ActionSuccessStage({
  success,
  onSecondary,
}: {
  success: ActionSuccessUi
  onSecondary?: () => void
}) {
  return (
    <div data-testid="action-success-stage" className="space-y-4">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-[24px] font-medium">{success.title}</h2>
        <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">{success.description}</p>
        {success.receiptHash ? (
          <p className="mt-3 font-data text-[12px] text-muted-foreground">
            Receipt: <span className="text-foreground">{success.receiptHash}</span>
          </p>
        ) : null}
      </div>

      {success.metrics.length > 0 ? <ActionMetricsBlock rows={success.metrics} /> : null}

      <ActionCard>
        <div className="px-4 py-3 text-[13px] text-muted-foreground">Your transaction completed successfully.</div>
      </ActionCard>

      <ActionFooter
        primaryLabel={success.primaryCtaLabel}
        secondaryLabel={success.secondaryCtaLabel}
        onPrimary={() => {
          window.location.href = success.primaryCtaHref
        }}
        onSecondary={onSecondary}
      />

      <div className="text-center">
        <Link href={success.primaryCtaHref} className="text-[13px] text-muted-foreground underline-offset-4 hover:underline">
          Open dashboard
        </Link>
      </div>
    </div>
  )
}
