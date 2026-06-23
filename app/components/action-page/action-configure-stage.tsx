"use client"

import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionAmountCard, ActionFooter, type ActionAssetOption } from "@/app/components/action-page/action-amount-card"
import { cn } from "@/lib/utils"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"
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
  amountVariant?: "card" | "inset"
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
>) {
  const pillLabel = assetSymbol ?? preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <ActionAmountCard
      label={verb}
      amount={amount}
      onAmountChange={onAmountChange}
      approxUsdLabel={preview?.amountUsdLabel ?? "≈ $0.00"}
      assetLabel={pillLabel}
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
}: ActionConfigureStageProps) {
  const configureStage = stage === "error" ? "configure" : stage
  const isValid = Boolean(preview?.allowed)
  const primaryLabel = primaryCtaLabel({
    stage: configureStage,
    verb,
    blockedReason: preview?.blockedReason ?? null,
    isValid,
    amountEntered: Boolean(amount.trim()),
  })
  const secondaryLabel = secondaryCtaLabel(stage, { canGoBack })
  const walletStage = stage === "approve_allowance" || stage === "wallet_sign" ? stage : null
  const showStackedAmount = amountPlacement === "stacked"
  const showInlineAmount = !hideAmountInput && !showStackedAmount
  const showHomeDetails = !homeLayout

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
    />
      ) : null}

      {onMultiplierChange ? (
        <ActionLeverageRuler
          value={multiplier ?? "3"}
          onChange={onMultiplierChange}
          min={multiplierMin}
          max={multiplierMax}
          step={multiplierStep}
        />
      ) : null}

      {preview && showHomeDetails && (preview.rateLabel || preview.marketValue || preview.marketBreakdown) ? (
        <ActionCard>
          {preview.rateLabel ? (
            <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="rate" />
          ) : null}
          {preview.marketBreakdown ? (
            <>
              <ActionInfoRow
                label="Collateral"
                value={`${preview.marketBreakdown.collateral.symbol} · ${preview.marketBreakdown.collateral.apy} APY`}
                tooltip="market"
              />
              <ActionInfoRow
                label="Borrow"
                value={`${preview.marketBreakdown.borrow.symbol} · ${preview.marketBreakdown.borrow.apy} APY`}
                tooltip="market"
              />
            </>
          ) : preview.marketValue ? (
            <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" />
          ) : null}
        </ActionCard>
      ) : null}

      {preview && showHomeDetails && preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}

      {preview?.risk?.title && preview.risk.message ? (
        <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
      ) : null}

      {preview?.blockedReason && !preview.allowed ? (
        <ActionOutcomeBanner tone="error" title="Action unavailable" message={preview.blockedReason} />
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
              "mt-2 flex h-14 w-full items-center justify-center rounded-[20px] bg-brand/15 text-[17px] font-semibold text-brand-readable transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
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
