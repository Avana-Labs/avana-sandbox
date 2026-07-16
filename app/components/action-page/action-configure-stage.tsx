"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { ActionPreviewUi, ActionStage } from "@/app/lib/action-system/contracts"
import { ActionAmountCard, ActionFooter, type ActionAssetOption } from "@/app/components/action-page/action-amount-card"
import { primaryCtaClass } from "@/app/components/action-page/action-cta"
import { cn } from "@/lib/utils"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"
import { ActionOutcomeBanner, ActionRiskBanner, ActionWalletToast } from "@/app/components/action-page/action-banners"
import { ActionCard, ActionInfoRow, ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionHealthFactorBar } from "@/app/components/action-page/action-health-factor-bar"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { isHealthFactorMetric, parseHealthFactorValue } from "@/app/lib/action-system/health-factor-ui"
import {
  isConfigureVisibleStage,
  primaryCtaLabel,
  secondaryCtaLabel,
  shouldDisablePrimaryCta,
  shouldShowWalletToast,
  walletToastMessage,
} from "@/app/lib/action-system/stage-machine"
import { blockedCtaLabel } from "@/app/lib/action-system/blocked-ui"

type ActionConfigureStageProps = {
  stage: ActionStage
  verb: string
  amount: string
  onAmountChange: (value: string) => void
  inputLabel?: string
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
  multiplierRecommendedMax?: number
  multiplierStep?: number
  multiplierLabel?: string
  /** USD value of the position at 1.0x, forwarded to the leverage ruler so its ends
   *  show the exposure range in the active currency. */
  multiplierExposureBaseUsd?: number
  /** Short explanation rendered above the standalone leverage ruler. */
  leverageHint?: ReactNode
  canGoBack?: boolean
  hideAmountInput?: boolean
  amountReadOnly?: boolean
  amountVariant?: "card" | "inset" | "raised"
  amountFooter?: ReactNode
  showBalance?: boolean
  onMax?: () => void
  /** Explicit balance line; falls back to the preview's balance when omitted. */
  balanceLabel?: string
  balanceValue?: string
  assetLabel?: string
  amountUnitLabel?: string
  hideAssetSelector?: boolean
  homeLayout?: boolean
  /** Render a single primary CTA (no Cancel/secondary) without adopting the rest
   *  of the compact home layout. Used by the detail-page sidebar rail, which is a
   *  pre-loaded full-page action and has no select stage to cancel back to. */
  singlePrimaryCta?: boolean
  /** Claim flow: surface the claimable total + market + token breakdown on the
   *  home/sidebar configure screen (which otherwise hides preview detail cards). */
  claimSummary?: boolean
  amountPlacement?: "inline" | "stacked"
  assetPickerVariant?: "menu" | "dialog"
  pickerTokens?: import("@/app/lib/borrow-system/home-contracts").HomeBorrowToken[]
  assetPickerDisabled?: boolean
  assetPickerHint?: string
  onAssetPickerBlocked?: () => void
  /** When the current block should route the user elsewhere (e.g. pledge
   *  collateral before borrowing), the primary CTA stays active and navigates
   *  here instead of sitting disabled. */
  blockedRedirectHref?: string | null
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
  assetPickerDisabled,
  assetPickerHint,
  onAssetPickerBlocked,
  amountFooter,
  showBalance = false,
  onMax,
  balanceLabel,
  balanceValue,
  assetLabel,
  amountUnitLabel,
  inputLabel,
}: Pick<
  ActionConfigureStageProps,
  | "verb"
  | "amount"
  | "onAmountChange"
  | "inputLabel"
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
  | "assetPickerDisabled"
  | "assetPickerHint"
  | "onAssetPickerBlocked"
  | "amountFooter"
  | "showBalance"
  | "onMax"
  | "balanceLabel"
  | "balanceValue"
  | "assetLabel"
  | "amountUnitLabel"
>) {
  const { exact } = useCurrency()
  const pillLabel = assetLabel ?? assetSymbol ?? preview?.amountLabel.split(" ").slice(-1)[0] ?? "Asset"

  return (
    <ActionAmountCard
      label={inputLabel ?? verb}
      amount={amount}
      onAmountChange={onAmountChange}
      approxUsdLabel={preview?.amountUsdLabel ?? exact(0)}
      assetLabel={pillLabel}
      unitLabel={amountUnitLabel}
      footer={amountFooter}
      balanceLabel={showBalance ? (balanceLabel ?? preview?.balanceLabel) : undefined}
      balanceValue={showBalance ? (balanceValue ?? preview?.balanceValue) : undefined}
      onMax={showBalance ? onMax : undefined}
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
      assetPickerDisabled={assetPickerDisabled}
      assetPickerHint={assetPickerHint}
      onAssetPickerBlocked={onAssetPickerBlocked}
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
  multiplierRecommendedMax,
  multiplierStep = 0.1,
  multiplierLabel = "Leverage",
  multiplierExposureBaseUsd,
  leverageHint,
  canGoBack = false,
  hideAmountInput = false,
  amountReadOnly = false,
  amountVariant = "card",
  hideAssetSelector = false,
  homeLayout = false,
  singlePrimaryCta = false,
  claimSummary = false,
  amountPlacement = "inline",
  assetPickerVariant = "menu",
  pickerTokens,
  amountFooter,
  showBalance = false,
  onMax,
  balanceLabel,
  balanceValue,
  assetLabel,
  amountUnitLabel,
  inputLabel,
  blockedRedirectHref,
}: ActionConfigureStageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const configureStage = stage === "error" ? "configure" : stage
  const isValid = Boolean(preview?.allowed)
  const blockedReason = preview?.blockedReason ?? null
  // Only reasons the label mapper flags as "redirect" (e.g. no collateral) turn
  // the CTA into an active navigation; every other block leaves it disabled.
  const blockedRedirects = blockedReason
    ? Boolean(blockedCtaLabel(blockedReason, { symbol: assetSymbol }).redirect)
    : false
  const isRedirectBlock = Boolean(blockedReason && blockedRedirectHref && blockedRedirects)
  const primaryLabel = primaryCtaLabel({
    stage: configureStage,
    verb,
    blockedReason,
    isValid,
    amountEntered: parsePositiveActionAmount(amount) != null,
    blockedSymbol: assetSymbol,
  })
  const primaryDisabled = shouldDisablePrimaryCta({
    stage: configureStage,
    isValid,
    isPending,
    blockedReason,
    blockedRedirect: isRedirectBlock,
  })
  // A redirect block (e.g. "Deposit collateral first") sends the tap to the flow
  // that unblocks the user instead of running the normal submit handler.
  const handlePrimary = () => {
    if (isRedirectBlock && blockedRedirectHref) {
      router.push(blockedRedirectHref)
      return
    }
    onPrimary?.()
  }
  const secondaryLabel = secondaryCtaLabel(stage, { canGoBack })
  const walletStage = stage === "approve_allowance" || stage === "wallet_sign" ? stage : null
  const showStackedAmount = amountPlacement === "stacked"
  const showInlineAmount = !hideAmountInput && !showStackedAmount
  const showHomeDetails = !homeLayout
  const showStandaloneLeverage = Boolean(onMultiplierChange) && !(homeLayout && showStackedAmount)
  // A blocked/invalid action has no valid projection — the engine returns
  // after === before, so showing the metrics would misrepresent a SAFE, unchanged
  // position. Hide the projected metrics and let the block reason speak instead.
  const previewBlocked = Boolean(preview && !preview.allowed && preview.blockedReason)
  const healthFactorRow = previewBlocked
    ? undefined
    : preview?.metrics.find((row) => isHealthFactorMetric(row.label, row.id))
  const healthFactorValue = parseHealthFactorValue(healthFactorRow?.after ?? healthFactorRow?.value)
  const showConfigureHealthFactor = homeLayout && isConfigureVisibleStage(configureStage) && healthFactorRow != null
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
          showBalance={showBalance}
          onMax={onMax}
          balanceLabel={balanceLabel}
          balanceValue={balanceValue}
          assetLabel={assetLabel}
          amountUnitLabel={amountUnitLabel}
          inputLabel={inputLabel}
        />
      ) : null}

      {showStandaloneLeverage ? (
        <div>
          {leverageHint ? (
            <p className="mb-3 text-[12px] leading-5 text-muted-foreground">{t(String(leverageHint))}</p>
          ) : null}
          <ActionLeverageRuler
            value={multiplier ?? "3"}
            onChange={onMultiplierChange!}
            min={multiplierMin}
            max={multiplierMax}
            recommendedMax={multiplierRecommendedMax}
            step={multiplierStep}
            label={multiplierLabel}
            exposureBaseUsd={multiplierExposureBaseUsd}
          />
        </div>
      ) : null}

      {showConfigureHealthFactor ? (
        <div className={previewMotionClassName}>
          <ActionCard className="p-4" data-testid="action-health-factor-card">
            <ActionHealthFactorBar value={healthFactorValue} label={healthFactorRow?.label ?? "Health factor"} />
          </ActionCard>
        </div>
      ) : null}

      {/* Claim: the compact home/sidebar layout hides the generic preview cards, so
          surface the claim total + market + per-token breakdown here directly. */}
      {homeLayout && claimSummary && preview ? (
        <div className={cn(previewMotionClassName, "space-y-3")} data-testid="action-claim-summary">
          <ActionCard>
            {preview.rateLabel ? (
              <ActionInfoRow label={preview.rateLabel} value={preview.rateValue} tooltip="fee" />
            ) : null}
            {preview.marketValue ? <ActionInfoRow label="Market" value={preview.marketValue} tooltip="market" /> : null}
          </ActionCard>
          {preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}
        </div>
      ) : null}

      {preview && showHomeDetails ? (
        <div className={cn(previewMotionClassName, "space-y-3")}>
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

          {!previewBlocked && preview.metrics.length > 0 ? <ActionMetricsBlock rows={preview.metrics} /> : null}

          {preview?.risk?.title && preview.risk.message ? (
            <ActionRiskBanner level={preview.risk.level} title={preview.risk.title} message={preview.risk.message} />
          ) : null}
        </div>
      ) : null}

      {preview && showHomeDetails ? (
        <ActionCard>
          <ActionInfoRow label="Avana Fee" value={preview.networkFeeLabel} tooltip="fee" />
        </ActionCard>
      ) : null}

      {outcome ? <ActionOutcomeBanner tone={outcome.tone} title={outcome.title} message={outcome.message} /> : null}

      {!outcome && previewBlocked && blockedReason ? (
        <ActionOutcomeBanner tone="error" title="Action unavailable" message={blockedReason} />
      ) : null}

      {isConfigureVisibleStage(stage) ? (
        homeLayout || singlePrimaryCta ? (
          <button
            type="button"
            onClick={handlePrimary}
            disabled={primaryDisabled}
            className={primaryCtaClass({
              disabled: primaryDisabled,
              pending: isPending || stage === "wallet_sign" || stage === "approve_allowance",
              className: "mt-1",
            })}
            data-testid="action-footer-primary"
          >
            {isPending || stage === "wallet_sign" || stage === "approve_allowance"
              ? t("Processing…")
              : t(primaryLabel).replace("{symbol}", assetSymbol ?? "")}
          </button>
        ) : (
          <ActionFooter
            primaryLabel={primaryLabel}
            primaryLabelSymbol={assetSymbol}
            secondaryLabel={secondaryLabel}
            onPrimary={handlePrimary}
            onSecondary={onSecondary}
            secondaryHref={secondaryHref}
            primaryDisabled={primaryDisabled}
            primaryPending={isPending || stage === "wallet_sign" || stage === "approve_allowance"}
            sticky
          />
        )
      ) : null}

      {preview && walletStage && shouldShowWalletToast(walletStage) ? (
        <ActionWalletToast message={walletToastMessage(walletStage, preview.amountLabel)} />
      ) : null}
    </>
  )
}
