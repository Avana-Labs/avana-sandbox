"use client"

import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { ActionRiskBanner } from "@/app/components/action-page/action-banners"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"

export function ActionReviewStage({
  title,
  subtitle,
  preview,
  primaryLabel = "Confirm",
  onPrimary,
  secondaryLabel = "Back",
  onSecondary,
  secondaryHref,
}: {
  title: string
  subtitle?: string
  preview: ActionPreviewUi
  primaryLabel?: string
  onPrimary?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  secondaryHref?: string
}) {
  return (
    <div className="space-y-4" data-testid="action-review-stage">
      <div className="pb-1">
        <h2 className="text-[1.25rem] font-medium tracking-[-0.03em]">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-[14px] text-muted-foreground">{subtitle}</p> : null}
      </div>

      <ActionCard>
        <ActionInfoRow label="Amount" value={preview.amountLabel} tooltip="amount" />
        <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="rate" />
        <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" />
      </ActionCard>

      {preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}

      {preview.risk?.title && preview.risk.message ? (
        <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
      ) : null}

      {preview.warnings[0] ? (
        <ActionCard>
          <ActionInfoRow label="Note" value={preview.warnings[0]} />
        </ActionCard>
      ) : null}

      <ActionCard>
        <ActionInfoRow label="Network Fee" value={preview.networkFeeLabel} tooltip="fee" />
      </ActionCard>

      <ActionFooter
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        secondaryHref={secondaryHref}
        primaryDisabled={!preview.allowed && Boolean(preview.blockedReason)}
      />
    </div>
  )
}
