"use client"

import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionAmountCard, ActionFooter } from "@/app/components/action-page/action-amount-card"
import { ActionOutcomeBanner, ActionRiskBanner, ActionWalletToast } from "@/app/components/action-page/action-banners"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import {
  isConfigureVisibleStage,
  primaryCtaLabel,
  secondaryCtaLabel,
  shouldDisablePrimaryCta,
  shouldShowWalletToast,
  walletToastMessage,
} from "@/app/lib/action-system/stage-machine"

type ActionConfigureStageProps = {
  stage: ActionStage
  verb: string
  amount: string
  onAmountChange: (value: string) => void
  preview: ActionPreviewUi | null
  assetSymbol?: string
  onPrimary?: () => void
  onSecondary?: () => void
  secondaryHref?: string
  onMax?: () => void
  onPercent?: (percent: number) => void
  showPercentShortcuts?: boolean
  showReceiveWethToggle?: boolean
  receiveWeth?: boolean
  onReceiveWethChange?: (value: boolean) => void
  isPending?: boolean
  outcome?: { tone: "error" | "success"; title: string; message: string } | null
}

export function ActionConfigureStage({
  stage,
  verb,
  amount,
  onAmountChange,
  preview,
  assetSymbol,
  onPrimary,
  onSecondary,
  secondaryHref,
  onMax,
  onPercent,
  showPercentShortcuts = false,
  showReceiveWethToggle = false,
  receiveWeth = false,
  onReceiveWethChange,
  isPending = false,
  outcome = null,
}: ActionConfigureStageProps) {
  const configureStage = stage === "error" ? "configure" : stage
  const isValid = Boolean(preview?.allowed)
  const primaryLabel = primaryCtaLabel({
    stage: configureStage,
    verb,
    blockedReason: preview?.blockedReason ?? null,
    isValid,
  })
  const secondaryLabel = secondaryCtaLabel(stage)
  const walletStage = stage === "approve_allowance" || stage === "wallet_sign" ? stage : null

  const pillLabel = assetSymbol ?? preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <>
      <ActionAmountCard
        label={verb}
        amount={amount}
        onAmountChange={onAmountChange}
        approxUsdLabel={preview?.amountUsdLabel ?? "≈ $0.00"}
        assetLabel={pillLabel}
        assetSymbol={assetSymbol ?? pillLabel}
        balanceLabel={preview?.balanceLabel ?? "Balance"}
        balanceValue={preview?.balanceValue ?? "0.00"}
        onMax={onMax}
        onPercent={onPercent}
        showPercentShortcuts={showPercentShortcuts}
        showReceiveWethToggle={showReceiveWethToggle}
        receiveWeth={receiveWeth}
        onReceiveWethChange={onReceiveWethChange}
        footer={preview ? <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="rate" /> : null}
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

      {isConfigureVisibleStage(stage) ? (
        <ActionFooter
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
          secondaryHref={secondaryHref}
          primaryDisabled={shouldDisablePrimaryCta({ stage: configureStage, isValid, isPending })}
          primaryPending={isPending || stage === "wallet_sign" || stage === "approve_allowance"}
        />
      ) : null}

      {preview && walletStage && shouldShowWalletToast(walletStage) ? (
        <ActionWalletToast message={walletToastMessage(walletStage, preview.amountLabel)} />
      ) : null}
    </>
  )
}
