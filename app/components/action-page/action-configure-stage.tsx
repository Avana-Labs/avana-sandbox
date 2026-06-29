"use client"

import { useEffect, useState, type ReactNode } from "react"
import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionAmountCard, ActionFooter, type ActionAssetOption } from "@/app/components/action-page/action-amount-card"
import { cn } from "@/lib/utils"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"
import { ActionOutcomeBanner, ActionRiskBanner, ActionWalletToast } from "@/app/components/action-page/action-banners"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionHealthFactorBar } from "@/app/components/action-page/action-health-factor-bar"
import { isHealthFactorMetric, parseHealthFactorValue } from "@/app/lib/action-system/health-factor-ui"
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
  borrowSymbol?: string
  onPrimary?: () => void
  onSecondary?: () => void
  secondaryHref?: string
  showReceiveWethToggle?: boolean
  receiveWeth?: boolean
  onReceiveWethChange?: (value: boolean) => void
  isPending?: boolean
  outcome?: { tone: "error" | "success"; title: string; message: string } | null
  assetOptions?: ActionAssetOption[]
  selectedAssetId?: string
  onAssetSelect?: (id: string) => void
  multiplier?: string
  onMultiplierChange?: (value: string) => void
  multiplierMin?: number
  multiplierMax?: number
  multiplierStep?: number
  canGoBack?: boolean
  hideAmountInput?: boolean
  amountReadOnly?: boolean
  amountVariant?: "card" | "inset" | "raised"
  amountFooter?: ReactNode
  assetLabel?: string
  amountUnitLabel?: string
  hideAssetSelector?: boolean
  homeLayout?: boolean
  amountPlacement?: "inline" | "stacked"
  assetPickerVariant?: "menu" | "dialog"
  pickerTokens?: import("@/app/lib/home-sim").HomeBorrowToken[]
}

export function ActionConfigureAmountSection({
  verb,
  amount,
  onAmountChange,
  preview,
  assetSymbol,
  borrowSymbol,
  showReceiveWethToggle = false,
  receiveWeth = false,
  onReceiveWethChange,
  assetOptions,
  selectedAssetId,
  onAssetSelect,
  amountReadOnly = false,
  amountVariant = "card",
  hideAssetSelector = false,
  assetPickerVariant = "menu",
  pickerTokens,
  amountFooter,
  assetLabel,
  amountUnitLabel,
}: Pick<
  ActionConfigureStageProps,
  | "verb"
  | "amount"
  | "onAmountChange"
  | "preview"
  | "assetSymbol"
  | "borrowSymbol"
  | "showReceiveWethToggle"
  | "receiveWeth"
  | "onReceiveWethChange"
  | "assetOptions"
  | "selectedAssetId"
  | "onAssetSelect"
  | "amountReadOnly"
  | "amountVariant"
  | "hideAssetSelector"
  | "assetPickerVariant"
  | "pickerTokens"
  | "amountFooter"
  | "assetLabel"
  | "amountUnitLabel"
>) {
  const pillLabel = assetLabel ?? assetSymbol ?? preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <ActionAmountCard
      label={verb}
      amount={amount}
      onAmountChange={onAmountChange}
      approxUsdLabel={preview?.amountUsdLabel ?? "≈ $0.00"}
      assetLabel={pillLabel}
      unitLabel={amountUnitLabel}
      footer={amountFooter}
      assetSymbol={assetSymbol ?? pillLabel}
      borrowSymbol={borrowSymbol}
      readOnly={amountReadOnly}
      variant={amountVariant}
      hideAssetSelector={hideAssetSelector}
      showReceiveWethToggle={showReceiveWethToggle}
      receiveWeth={receiveWeth}
      onReceiveWethChange={onReceiveWethChange}
      assetOptions={assetOptions}
      selectedAssetId={selectedAssetId}
      onAssetSelect={onAssetSelect}
      assetPickerVariant={assetPickerVariant}
      pickerTokens={pickerTokens}
    />
  )
}

export function ActionConfigureStage({
  stage,
  verb,
  amount,
  onAmountChange,
  preview,
  assetSymbol,
  borrowSymbol,
  onPrimary,
  onSecondary,
  secondaryHref,
  showReceiveWethToggle = false,
  receiveWeth = false,
  onReceiveWethChange,
  isPending = false,
  outcome = null,
  assetOptions,
  selectedAssetId,
  onAssetSelect,
  multiplier,
  onMultiplierChange,
  multiplierMin = 1,
  multiplierMax = 20,
  multiplierStep = 0.1,
  canGoBack = false,
  hideAmountInput = false,
  amountReadOnly = false,
  amountVariant = "card",
  hideAssetSelector = false,
  homeLayout = false,
  amountPlacement = "inline",
  assetPickerVariant = "menu",
  pickerTokens,
  amountFooter,
  assetLabel,
  amountUnitLabel,
}: ActionConfigureStageProps) {
  const configureStage = stage === "error" ? "configure" : stage
  const isValid = Boolean(preview?.allowed)
  const primaryLabel = primaryCtaLabel({
    stage: configureStage,
    verb,
    blockedReason: preview?.blockedReason ?? null,
    isValid,
    amountEntered: parsePositiveActionAmount(amount) != null,
  })
  const secondaryLabel = secondaryCtaLabel(stage, { canGoBack })
  const walletStage = stage === "approve_allowance" || stage === "wallet_sign" ? stage : null
  const showStackedAmount = amountPlacement === "stacked"
  const showInlineAmount = !hideAmountInput && !showStackedAmount
  const showHomeDetails = !homeLayout
  const showStandaloneLeverage = Boolean(onMultiplierChange) && !(homeLayout && showStackedAmount)
  const healthFactorRow = preview?.metrics.find((row) => isHealthFactorMetric(row.label, row.id))
  const healthFactorValue = parseHealthFactorValue(healthFactorRow?.after ?? healthFactorRow?.value)
  const showConfigureHealthFactor =
    homeLayout && isConfigureVisibleStage(configureStage) && healthFactorRow != null
  const [previewMounted, setPreviewMounted] = useState(false)

  useEffect(() => {
    if (!preview) {
      setPreviewMounted(false)
      return undefined
    }
    if (previewMounted) return undefined

    const frame = window.requestAnimationFrame(() => {
      setPreviewMounted(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [preview, previewMounted])

  const previewMotionClassName = cn(
    "transition-all duration-500 ease-out",
    previewMounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
  )

  return (
    <>
      {showInlineAmount ? (
        <ActionConfigureAmountSection
          verb={verb}
          amount={amount}
          onAmountChange={onAmountChange}
          preview={preview}
          assetSymbol={assetSymbol}
          borrowSymbol={borrowSymbol}
          showReceiveWethToggle={showReceiveWethToggle}
          receiveWeth={receiveWeth}
          onReceiveWethChange={onReceiveWethChange}
          assetOptions={assetOptions}
          selectedAssetId={selectedAssetId}
          onAssetSelect={onAssetSelect}
          amountReadOnly={amountReadOnly}
          amountVariant={amountVariant}
          hideAssetSelector={hideAssetSelector}
          assetPickerVariant={assetPickerVariant}
          pickerTokens={pickerTokens}
          amountFooter={amountFooter}
          assetLabel={assetLabel}
          amountUnitLabel={amountUnitLabel}
        />
      ) : null}

      {showStandaloneLeverage ? (
        <ActionLeverageRuler
          value={multiplier ?? "3"}
          onChange={onMultiplierChange!}
          min={multiplierMin}
          max={multiplierMax}
          step={multiplierStep}
        />
      ) : null}

      {showConfigureHealthFactor ? (
        <div className={previewMotionClassName}>
          <ActionCard className="p-4" data-testid="action-health-factor-card">
            <ActionHealthFactorBar value={healthFactorValue} />
          </ActionCard>
        </div>
      ) : null}

      {preview && showHomeDetails ? (
        <div className={previewMotionClassName}>
          {preview.rateLabel || preview.marketValue || preview.marketBreakdown ? (
            <ActionCard>
              {preview.rateLabel ? (
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

          {preview?.risk?.title && preview.risk.message ? (
            <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
          ) : null}

          {preview?.blockedReason && !preview.allowed ? (
            <ActionOutcomeBanner tone="error" title="Action unavailable" message={preview.blockedReason} />
          ) : null}
        </div>
      ) : null}

      {preview && showHomeDetails ? (
        <ActionCard>
          <ActionInfoRow label="Avana Fee" value={preview.networkFeeLabel} tooltip="fee" />
        </ActionCard>
      ) : null}

      {outcome ? <ActionOutcomeBanner tone={outcome.tone} title={outcome.title} message={outcome.message} /> : null}

      {isConfigureVisibleStage(stage) ? (
        homeLayout ? (
          <button
            type="button"
            onClick={onPrimary}
            disabled={shouldDisablePrimaryCta({
              stage: configureStage,
              isValid,
              isPending,
              blockedReason: preview?.blockedReason ?? null,
            })}
            className={cn(
              "mt-1 flex h-14 w-full items-center justify-center rounded-[20px] text-[17px] font-semibold transition-opacity disabled:cursor-not-allowed",
              shouldDisablePrimaryCta({
                stage: configureStage,
                isValid,
                isPending,
                blockedReason: preview?.blockedReason ?? null,
              })
                ? "border border-brand/25 bg-brand/20 text-brand-readable"
                : "bg-brand text-brand-foreground hover:opacity-90",
              (isPending || stage === "wallet_sign" || stage === "approve_allowance") && "opacity-70",
            )}
            data-testid="action-footer-primary"
          >
            {isPending || stage === "wallet_sign" || stage === "approve_allowance" ? "Processing…" : primaryLabel}
          </button>
        ) : (
          <ActionFooter
            primaryLabel={primaryLabel}
            secondaryLabel={secondaryLabel}
            onPrimary={onPrimary}
            onSecondary={onSecondary}
            secondaryHref={secondaryHref}
            primaryDisabled={shouldDisablePrimaryCta({
              stage: configureStage,
              isValid,
              isPending,
              blockedReason: preview?.blockedReason ?? null,
            })}
            primaryPending={isPending || stage === "wallet_sign" || stage === "approve_allowance"}
          />
        )
      ) : null}

      {preview && walletStage && shouldShowWalletToast(walletStage) ? (
        <ActionWalletToast message={walletToastMessage(walletStage, preview.amountLabel)} />
      ) : null}
    </>
  )
}
