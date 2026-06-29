"use client"

import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import { resolveActionAmountCardProps } from "@/app/lib/action-system/action-amount-display"
import { ActionRiskBanner } from "@/app/components/action-page/action-banners"
import { ActionAmountCard } from "@/app/components/action-page/action-amount-card"
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
  hideHeader = false,
  primaryPending = false,
}: {
  title: string
  subtitle?: string
  preview: ActionPreviewUi
  primaryLabel?: string
  onPrimary?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  secondaryHref?: string
  hideHeader?: boolean
  primaryPending?: boolean
}) {
  const amountDisplay = resolveActionAmountCardProps(preview)
  const isClaimReview = preview.rateLabel === "Claim total"

  return (
    <div className="space-y-4" data-testid="action-review-stage">
      {!hideHeader ? (
        <div className="pb-1">
          <h2 className="text-[1.375rem] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}

      {isClaimReview ? (
        <ActionCard>
          <ActionInfoRow label="Claim total" value={preview.rateValue} tooltip="fee" />
          <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" />
        </ActionCard>
      ) : (
        <ActionAmountCard
          label="Amount"
          amount={amountDisplay.amount}
          onAmountChange={() => undefined}
          approxUsdLabel={preview.amountUsdLabel}
          assetLabel={amountDisplay.assetLabel}
          assetSymbol={amountDisplay.assetSymbol}
          borrowSymbol={amountDisplay.borrowSymbol}
          readOnly
        />
      )}

      {isClaimReview ? null : (preview.rateLabel && preview.rateValue) || preview.marketBreakdown || preview.marketValue ? (
        <ActionCard>
          {preview.rateLabel && preview.rateValue ? (
            <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="rate" />
          ) : null}
          {preview.marketBreakdown ? (
            <>
              <ActionInfoRow
                label="Collateral APY"
                value={`${preview.marketBreakdown.collateral.symbol} · ${preview.marketBreakdown.collateral.apy}`}
                tooltip="market"
              />
              <ActionInfoRow
                label="Borrow APY"
                value={`${preview.marketBreakdown.borrow.symbol} · ${preview.marketBreakdown.borrow.apy}`}
                tooltip="market"
              />
            </>
          ) : preview.marketValue ? (
            <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" />
          ) : null}
        </ActionCard>
      ) : null}

      {preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}

      {!isClaimReview && preview.risk?.title && preview.risk.message ? (
        <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
      ) : null}

      {preview.warnings[0] ? (
        <ActionCard>
          <ActionInfoRow label="Note" value={preview.warnings[0]} />
        </ActionCard>
      ) : null}

      <ActionCard>
        <ActionInfoRow label="Avana Fee" value={preview.networkFeeLabel} tooltip="fee" />
      </ActionCard>

      <ActionFooter
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        secondaryHref={secondaryHref}
        primaryDisabled={!preview.allowed && Boolean(preview.blockedReason)}
        primaryPending={primaryPending}
      />
    </div>
  )
}
