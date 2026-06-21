"use client"

import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionAmountCard, ActionFooter } from "@/app/components/action-page/action-amount-card"
import { ActionOutcomeBanner, ActionRiskBanner, ActionWalletToast } from "@/app/components/action-page/action-banners"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { primaryCtaLabel, secondaryCtaLabel, shouldShowWalletToast } from "@/app/lib/action-system/stage-machine"
import { formatActionWalletConfirmMessage } from "@/app/lib/action-system/formatters"

type ActionConfigureStageProps = {
  stage: ActionStage
  verb: string
  amount: string
  onAmountChange: (value: string) => void
  preview: ActionPreviewUi | null
  onPrimary?: () => void
  onSecondary?: () => void
  onMax?: () => void
  isPending?: boolean
  outcome?: { tone: "error" | "success"; title: string; message: string } | null
}

export function ActionConfigureStage({
  stage,
  verb,
  amount,
  onAmountChange,
  preview,
  onPrimary,
  onSecondary,
  onMax,
  isPending = false,
  outcome = null,
}: ActionConfigureStageProps) {
  const isValid = Boolean(preview?.allowed)
  const primaryLabel = primaryCtaLabel({
    stage,
    verb,
    blockedReason: preview?.blockedReason ?? null,
    isValid,
  })
  const secondaryLabel = secondaryCtaLabel(stage)

  return (
    <>
      <ActionAmountCard
        label={verb}
        amount={amount}
        onAmountChange={onAmountChange}
        approxUsdLabel={preview?.amountUsdLabel ?? "≈ $0.00"}
        assetLabel={preview?.amountLabel ?? "Asset"}
        balanceLabel={preview?.balanceLabel ?? "Balance"}
        balanceValue={preview?.balanceValue ?? "0.00"}
        onMax={onMax}
        footer={
          preview ? (
            <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="rate" />
          ) : null
        }
      />

      {preview ? (
        <ActionCard>
          <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" />
        </ActionCard>
      ) : null}

      {preview && preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}

      {preview?.risk?.title && preview.risk.message ? (
        <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
      ) : null}

      {preview ? (
        <ActionCard>
          <ActionInfoRow label="Network Fee" value={preview.networkFeeLabel} tooltip="fee" />
        </ActionCard>
      ) : null}

      {outcome ? <ActionOutcomeBanner tone={outcome.tone} title={outcome.title} message={outcome.message} /> : null}

      <ActionFooter
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        primaryDisabled={stage === "configure" && !isValid}
        primaryPending={isPending || stage === "submitting"}
      />

      {preview && shouldShowWalletToast(stage) ? (
        <ActionWalletToast message={formatActionWalletConfirmMessage(preview.amountLabel, preview.amountLabel)} />
      ) : null}
    </>
  )
}
