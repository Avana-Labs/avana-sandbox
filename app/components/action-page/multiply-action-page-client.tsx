"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapDeleveragePreviewToActionUi, mapMultiplyPreviewToActionUi } from "@/app/lib/action-system/adapters/multiply-preview-mapper"
import { formatMultiplyLoopMarketLabel } from "@/app/lib/multiply-system/market-labels"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage, ActionConfigureAmountSection } from "@/app/components/action-page/action-configure-stage"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { useActionNetworkGuard } from "@/app/lib/web3/use-action-network-guard"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { isConfigureVisibleStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"
import {
  MULTIPLY_ACTION_MIN_LEVERAGE,
  getDeleverageMultiplierMax,
  getDefaultDeleverageMultiplier,
  resolveMultiplyMarketMaxLeverage,
} from "@/app/lib/multiply-system/leverage-limits"
import { clampMultiplierToOptions, buildMultiplierOptions } from "@/app/components/action-page/multiplier-options"
import {
  buildMultiplyOverCapPreviewUi,
  exceedsMultiplyCollateralCap,
  maxMultiplyCollateralAmount,
  MULTIPLY_WALLET_COLLATERAL_BUDGET_USD,
} from "@/app/lib/multiply-system/collateral-limits"
import { formatActionAmount } from "@/app/lib/action-system/formatters"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { humanizeBlockedReason } from "@/app/lib/action-system/blocked-reason"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function MultiplyActionPageClient({
  kind,
  closeHref = "/multiply",
  embedded = false,
  sidebar = false,
  layout = "default",
  initialMarketId,
  initialAmount = "",
  initialMultiplier,
}: {
  kind: "multiply" | "deleverage"
  closeHref?: string
  embedded?: boolean
  sidebar?: boolean
  layout?: "default" | "home"
  initialMarketId?: string
  initialAmount?: string
  initialMultiplier?: string
}) {
  const descriptor = getActionDescriptor("multiply", kind)
  const { t } = useTranslation()
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useMultiplySessionContext()
  const priceFor = usePriceFor()
  const walletPositions = useMemo(
    () => Object.values(session.state.positions).filter((entry) => entry.walletId === walletId),
    [session.state.positions, walletId],
  )
  // Only honor an initial market id that actually exists in the catalog. An unknown
  // id (stale link) is treated as "no initial market" so the picker shows instead of
  // dead-ending — every multiply market is available.
  const validInitialMarketId = initialMarketId && session.state.markets[initialMarketId] ? initialMarketId : undefined
  const [selectedMarketId, setSelectedMarketId] = useState<string | undefined>(
    () => validInitialMarketId ?? (kind === "deleverage" ? walletPositions[0]?.marketId : undefined),
  )
  const market = useMemo(() => {
    const markets = Object.values(session.state.markets)
    const selected = selectedMarketId ? markets.find((entry) => entry.id === selectedMarketId) ?? null : null
    // Never dead-end: fall back to the first catalog market (the picker lets the
    // user switch). market is null only if the catalog itself is empty.
    return selected ?? markets[0] ?? null
  }, [selectedMarketId, session.state.markets])

  const marketOptions = useMemo(() => {
    if (kind !== "multiply") return undefined
    const options = Object.values(session.state.markets).map((entry) => ({
      id: entry.id,
      label: formatMultiplyLoopMarketLabel(entry.collateralAsset.symbol, entry.borrowAsset.symbol),
      symbol: entry.collateralAsset.symbol,
      borrowSymbol: entry.borrowAsset.symbol,
    }))
    return options.length > 1 ? options : undefined
  }, [kind, session.state.markets])
  const collateralPriceUsd = market
    ? (priceFor(market.collateralAsset.symbol) ?? market.collateralAsset.priceUsd)
    : 0
  // Cap a multiply position at the wallet's spendable balance (not the pool's
  // multi-million liquidity), still bounded by what the market can absorb. This
  // keeps Max affordable and rejects absurd inputs before the simulation engine.
  const maxCollateralAmount =
    kind === "multiply" && market
      ? maxMultiplyCollateralAmount(
          market.economics.availableLiquidityUsd,
          collateralPriceUsd,
          MULTIPLY_WALLET_COLLATERAL_BUDGET_USD,
        )
      : null

  const multiplierMin = MULTIPLY_ACTION_MIN_LEVERAGE
  const position = useMemo(() => {
    if (!market) return null
    return (
      session.state.positions[`${walletId}:${market.id}`] ??
      walletPositions.find((entry) => entry.marketId === market.id) ??
      null
    )
  }, [market, session.state.positions, walletId, walletPositions])
  const defaultMultiplyMultiplier = useMemo(() => {
    if (kind !== "multiply") return ""
    const marketCap = market ? resolveMultiplyMarketMaxLeverage(market.risk.publicMaxMultiplier) : 3
    const recommendedCap =
      market && Number.isFinite(market.risk.recommendedMaxMultiplier)
        ? Math.min(marketCap, market.risk.recommendedMaxMultiplier)
        : marketCap
    // Start at ~75% of the cap (a practical target, never pinned at max) so the
    // ruler is obviously draggable in both directions instead of feeling stuck.
    const practicalTarget = Math.max(MULTIPLY_ACTION_MIN_LEVERAGE + 0.5, Math.min(recommendedCap, marketCap * 0.75))
    const options = buildMultiplierOptions(marketCap)
    const clamped = clampMultiplierToOptions(practicalTarget, options)
    return String(Number(clamped.toFixed(2)))
  }, [kind, market])

  const [stage, setStage] = useState<ActionStage>("configure")
  const [amount, setAmount] = useState(initialAmount)
  // Input stays bound to `amount`; the engine preview below keys off the deferred value so
  // it runs on the settled input, not once per keystroke (the INP lever). See borrow client.
  const deferredAmount = useDeferredValue(amount)
  const [multiplier, setMultiplier] = useState(() => initialMultiplier ?? (kind === "deleverage" ? "" : defaultMultiplyMultiplier))
  const [hasUserInput, setHasUserInput] = useState(() => Boolean(initialAmount || initialMultiplier))

  useEffect(() => {
    if (kind !== "deleverage" || initialMarketId || selectedMarketId || walletPositions.length === 0) return
    setSelectedMarketId(walletPositions[0]!.marketId)
  }, [initialMarketId, kind, selectedMarketId, walletPositions])

  useEffect(() => {
    if (kind !== "deleverage" || !position) return
    // Seed the default target ONCE per position (deps deliberately exclude `multiplier`).
    // Bail if a value already exists — an explicit initial value or one the user has
    // dragged to wins, so the slider stays user-controlled across [min, current] instead
    // of snapping back to the default on every change.
    if (parsePositiveActionAmount(multiplier) != null) return
    setMultiplier(initialMultiplier ?? getDefaultDeleverageMultiplier(position.multiplier))
  }, [initialMultiplier, kind, position?.id])

  useEffect(() => {
    setHasUserInput(Boolean(initialAmount || initialMultiplier))
  }, [initialAmount, initialMultiplier, kind, market?.id])

  useEffect(() => {
    if (!market) return
    const parsed = parsePositiveActionAmount(multiplier)
    if (parsed == null) return
    const effectiveMax =
      kind === "deleverage"
        ? getDeleverageMultiplierMax(position?.multiplier ?? Number.NaN, 0.1)
        : resolveMultiplyMarketMaxLeverage(market.risk.publicMaxMultiplier)
    // Clamp to the valid RANGE only. Snapping to a handful of discrete presets made
    // the slider feel broken (e.g. a 1.8x-max market had just 1.5/1.8 reachable);
    // the ruler steps in 0.1 within [min, max] and stays continuous.
    const clamped = Math.min(effectiveMax, Math.max(multiplierMin, parsed))
    const next = String(Number(clamped.toFixed(2)))
    if (next !== multiplier) setMultiplier(next)
  }, [kind, market, multiplier, multiplierMin, position?.multiplier])
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  // Wrong-network submit gate (read via ref inside the submit handlers; see borrow client).
  const networkGuard = useActionNetworkGuard()
  const networkGuardRef = useRef(networkGuard)
  networkGuardRef.current = networkGuard
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!market) return
    let cancelled = false
    const parsedAmount = parsePositiveActionAmount(deferredAmount)
    const parsedMultiplier = parsePositiveActionAmount(multiplier)
    if (parsedMultiplier == null) {
      setPreviewUi(null)
      return
    }

    if (kind === "deleverage" && !position) {
      setPreviewUi(null)
      return
    }

    if (kind === "deleverage" && !hasUserInput) {
      setPreviewUi(null)
      return
    }

    const multiplyCollateralAmount = kind === "multiply" ? parsedAmount : null
    if (kind === "multiply") {
      if (multiplyCollateralAmount == null) {
        setPreviewUi(null)
        return
      }

      if (exceedsMultiplyCollateralCap(multiplyCollateralAmount, maxCollateralAmount)) {
        setPreviewUi(
          buildMultiplyOverCapPreviewUi({
            collateralSymbol: market.collateralAsset.symbol,
            borrowSymbol: market.borrowAsset.symbol,
            collateralAmount: multiplyCollateralAmount,
            collateralPriceUsd,
            marketLabel: formatMultiplyLoopMarketLabel(market.collateralAsset.symbol, market.borrowAsset.symbol),
            multiplier: parsedMultiplier,
            maxCollateralAmount: maxCollateralAmount!,
          }),
        )
        return
      }

      const action = {
        type: "multiply" as const,
        walletId,
        marketId: market.id,
        collateralAmount: multiplyCollateralAmount,
        selectedMultiplier: parsedMultiplier,
        collateralPriceUsd,
      }

      setPreviewUi(null)
      void session
        .previewTransaction(session.createIntent(action))
        .then((preview) => {
          if (cancelled) return
          setPreviewUi(
            mapMultiplyPreviewToActionUi(preview, {
              collateralSymbol: market.collateralAsset.symbol,
              borrowSymbol: market.borrowAsset.symbol,
              collateralAmount: multiplyCollateralAmount,
              collateralPriceUsd,
              // The engine now values the position at the same live price (threaded via
              // action.collateralPriceUsd), so the simulation figures are already live-
              // priced — no further display rescale (scale === 1). This keeps the preview
              // exactly equal to the persisted/dashboard position.
              catalogCollateralPriceUsd: collateralPriceUsd,
              marketLabel: formatMultiplyLoopMarketLabel(market.collateralAsset.symbol, market.borrowAsset.symbol),
              collateralApy: market.collateralAsset.apy,
              borrowApy: market.borrowAsset.borrowApy,
              multiplier: parsedMultiplier,
              maxLtv: market.risk.maxLtv,
            }),
          )
        })
        .catch(() => {
          if (!cancelled) setPreviewUi(null)
        })
      return () => {
        cancelled = true
      }
    }

    if (!position) {
      setPreviewUi(null)
      return
    }

    const action = {
      type: "deleverage" as const,
      walletId,
      positionId: position.id,
      targetMultiplier: parsedMultiplier,
      repayAmountUsd: parsedAmount ?? undefined,
    }

    void session
      .previewTransaction(session.createIntent(action))
      .then((preview) => {
        if (cancelled) return
        setPreviewUi(
          mapDeleveragePreviewToActionUi(preview, {
            marketLabel: formatMultiplyLoopMarketLabel(market.collateralAsset.symbol, market.borrowAsset.symbol),
            targetMultiplier: parsedMultiplier,
            collateralSymbol: market.collateralAsset.symbol,
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setPreviewUi(null)
      })
    return () => {
      cancelled = true
    }
  }, [deferredAmount, collateralPriceUsd, kind, market, maxCollateralAmount, multiplier, position, session, walletId])

  useEffect(() => {
    // Editing inputs after a failed submit clears the stale error banner and returns to
    // configure so the CTA is actionable again instead of stuck showing the old error.
    setOutcome(null)
    setStage((prev) => (prev === "error" ? "configure" : prev))
  }, [amount, kind, market?.id, multiplier])

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("configure")
      setOutcome(null)
      return
    }
    router.push(closeHref)
  }, [closeHref, router, stage])

  // Fill the collateral input with the max affordable amount. Floor to 6 decimals
  // (not round) so the filled value can never round *up* past the cap and trip the
  // over-cap guard — a real risk now that the cap is the smaller wallet balance.
  const handleMaxCollateral = useCallback(() => {
    if (maxCollateralAmount == null || maxCollateralAmount <= 0) return
    setHasUserInput(true)
    setAmount(String(Math.floor(maxCollateralAmount * 1e6) / 1e6))
  }, [maxCollateralAmount])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(successUi?.primaryCtaHref ?? dashboardHrefForProduct("multiply"))
      return
    }
    if (stage === "configure") {
      if (!market || !previewUi?.allowed) return
      setStage("review")
      return
    }
    if (stage !== "review" && stage !== "error") return // allow in-place retry from error
    if (!market || !previewUi?.allowed) return
    if (isPending) return // guard against double-submit (rapid double-click)
    if (networkGuardRef.current.isWrongNetwork) {
      setOutcome({
        tone: "error",
        title: "Wrong network",
        message: networkGuardRef.current.blockedReason ?? "Switch networks to continue.",
      })
      return
    }

    setIsPending(true)
    setOutcome(null)

    try {
      const parsedAmount = parsePositiveActionAmount(amount)
      const parsedMultiplier = parsePositiveActionAmount(multiplier)
      if ((kind === "multiply" && parsedAmount == null) || parsedMultiplier == null) throw new Error("Enter a valid amount")
      const position =
        session.state.positions[`${walletId}:${market.id}`] ??
        Object.values(session.state.positions).find((entry) => entry.walletId === walletId && entry.marketId === market.id)
      if (kind === "deleverage" && !position) throw new Error("No position selected")

      const action =
        kind === "multiply"
          ? {
              type: "multiply" as const,
              walletId,
              marketId: market.id,
              collateralAmount: parsedAmount!,
              selectedMultiplier: parsedMultiplier,
              collateralPriceUsd,
            }
          : {
              type: "deleverage" as const,
              walletId,
              positionId: position!.id,
              targetMultiplier: parsedMultiplier,
              repayAmountUsd: parsedAmount ?? undefined,
            }

      const intent = session.createIntent(action)
      const preview = await session.previewTransaction(intent)
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? "Action unavailable")

      const simulated = session.readAdapter.mode === "sandbox"
      const result = await runActionSubmitFlow({
        simulated,
        needsAllowance: false,
        onStage: setStage,
        execute: async () => session.executeTransaction(preview.intent),
      })

      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${parsedMultiplier.toFixed(2)}x on ${market.collateralAsset.symbol} processed.`,
          receiptHash: result.receipt.hash ?? null,
          metrics: previewUi.metrics,
          href: dashboardHrefForProduct("multiply"),
          primaryCtaLabel: successDashboardCtaLabel("multiply"),
          preview: previewUi,
          verb: descriptor.primaryVerb,
        }),
      )
      setStage("success")
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Transaction was cancelled"
      // Raw backend codes stay in logs; users see plain-language copy (issue #143).
      if (process.env.NODE_ENV !== "production") console.error(rawMessage)
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: humanizeBlockedReason(rawMessage) ?? "Transaction was cancelled",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, collateralPriceUsd, descriptor.primaryVerb, hasUserInput, isPending, kind, market, multiplier, previewUi, router, session, stage, successUi, walletId, position])

  const handleClose = useCallback(async () => {
    if (!market || isPending) return
    const closingPosition =
      session.state.positions[`${walletId}:${market.id}`] ??
      Object.values(session.state.positions).find(
        (entry) => entry.walletId === walletId && entry.marketId === market.id,
      )
    if (!closingPosition) return
    if (networkGuardRef.current.isWrongNetwork) {
      setOutcome({
        tone: "error",
        title: "Wrong network",
        message: networkGuardRef.current.blockedReason ?? "Switch networks to continue.",
      })
      return
    }

    setIsPending(true)
    setOutcome(null)

    try {
      const action = {
        type: "close" as const,
        walletId,
        positionId: closingPosition.id,
      }
      const intent = session.createIntent(action)
      const preview = await session.previewTransaction(intent)
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? "Action unavailable")

      const simulated = session.readAdapter.mode === "sandbox"
      const result = await runActionSubmitFlow({
        simulated,
        needsAllowance: false,
        onStage: setStage,
        execute: async () => session.executeTransaction(preview.intent),
      })

      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: t("Position closed"),
          description: t("Your {symbol} position was fully unwound and collateral withdrawn.").replace(
            "{symbol}",
            market.collateralAsset.symbol,
          ),
          receiptHash: result.receipt.hash ?? null,
          metrics: previewUi?.metrics ?? [],
          href: dashboardHrefForProduct("multiply"),
          primaryCtaLabel: successDashboardCtaLabel("multiply"),
          preview: previewUi ?? undefined,
          verb: "Close",
        }),
      )
      setStage("success")
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Transaction was cancelled"
      // Raw backend codes stay in logs; users see plain-language copy (issue #143).
      if (process.env.NODE_ENV !== "production") console.error(rawMessage)
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: humanizeBlockedReason(rawMessage) ?? "Transaction was cancelled",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [isPending, market, previewUi, session, walletId])

  // The catalog always has markets, so `market` is non-null in practice; this only
  // guards the impossible empty-catalog case (and never shows a dead-end card).
  if (!market) return null

  // Deleverage is the exit surface: whenever the wallet holds a position in this
  // market, offer a full Close/Withdraw so collateral can always be reclaimed —
  // including a fully-unwound 1.0x/$0 position that deleverage itself can no longer act on.
  const canClosePosition = kind === "deleverage" && position != null

  const hideTitle = embedded || stage === "success" || stage === "processing" || stage === "review"
  const isHomeLayout = embedded && layout === "home"
  const shellDensity = sidebar ? "sidebar" : isHomeLayout ? "home" : "default"
  // The loop mechanics are documented in the market's "About" section — no inline
  // explainer filler in the action widget.
  const loopHint = null
  const effectiveMultiplierMax =
    kind === "deleverage"
      ? getDeleverageMultiplierMax(position?.multiplier ?? Number.NaN, 0.1)
      : resolveMultiplyMarketMaxLeverage(market.risk.publicMaxMultiplier)
  const useWorkspaceFields =
    embedded && isHomeLayout && isConfigureVisibleStage(stage)
  // Surface the market-liquidity cap as the collateral input balance, with a Max button.
  const showCollateralBalance = kind === "multiply" && maxCollateralAmount != null && maxCollateralAmount > 0
  const collateralBalanceLabel = showCollateralBalance ? "Balance" : undefined
  const collateralBalanceValue = showCollateralBalance
    ? formatActionAmount(maxCollateralAmount!, market.collateralAsset.symbol, 6)
    : undefined
  // Position value at 1.0x (multiply: the collateral being supplied; deleverage: the
  // position's net equity). The ruler scales this by leverage to label its two ends
  // with the resulting exposure range. Undefined ⇒ ends fall back to leverage bounds.
  const leverageExposureBaseUsd =
    kind === "multiply"
      ? (parsePositiveActionAmount(amount) ?? 0) * collateralPriceUsd
      : position
        ? Math.max(0, position.collateralValueUsd - position.debtValueUsd)
        : undefined
  const stackedAmountField = useWorkspaceFields ? (
    <ActionConfigureAmountSection
      verb={descriptor.primaryVerb}
      inputLabel={kind === "multiply" ? "Collateral" : undefined}
      amount={amount}
      onAmountChange={(value) => {
        setHasUserInput(true)
        setAmount(value)
      }}
      preview={previewUi}
      assetSymbol={market.collateralAsset.symbol}
      assetLabel={market.collateralAsset.symbol}
      assetOptions={!validInitialMarketId ? marketOptions : undefined}
      selectedAssetId={market.id}
      onAssetSelect={(id) => {
        setHasUserInput(true)
        setSelectedMarketId(id)
        setAmount("")
      }}
      showBalance={showCollateralBalance}
      onMax={handleMaxCollateral}
      balanceLabel={collateralBalanceLabel}
      balanceValue={collateralBalanceValue}
      amountVariant="raised"
      amountFooter={
        <>
          {loopHint ? <p className="mb-3 text-[12px] leading-5 text-muted-foreground">{loopHint}</p> : null}
          <ActionLeverageRuler
            variant="embedded"
            value={multiplier}
            onChange={(value) => {
              setHasUserInput(true)
              setMultiplier(value)
            }}
            min={multiplierMin}
            max={effectiveMultiplierMax}
            step={0.1}
            label="Target leverage"
            exposureBaseUsd={leverageExposureBaseUsd}
          />
        </>
      }
    />
  ) : null

  return (
    <ActionPageShell
      mode={embedded ? "embedded" : "page"}
      density={shellDensity}
      title={descriptor.title}
      subtitle={descriptor.subtitle}
      hideTitle={hideTitle}
      hideClose={embedded}
      closeHref={closeHref}
      simulated={session.readAdapter.mode === "sandbox"}
    >
      {useWorkspaceFields ? stackedAmountField : null}

      {stage === "processing" ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} />
      ) : null}

      {stage === "review" && previewUi ? (
        <ActionReviewStage
          title={reviewStageTitle(descriptor.primaryVerb)}
          subtitle="Confirm the details below before signing."
          hideHeader={embedded}
          preview={previewUi}
          primaryLabel={descriptor.primaryVerb}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          primaryPending={isPending}
          blockedReason={networkGuard.blockedReason}
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          inputLabel={kind === "multiply" ? "Collateral" : undefined}
          amount={amount}
          onAmountChange={(value) => {
            setHasUserInput(true)
            setAmount(value)
          }}
          preview={previewUi}
          assetSymbol={market.collateralAsset.symbol}
          assetOptions={marketOptions}
          selectedAssetId={market.id}
          onAssetSelect={(id) => {
            setHasUserInput(true)
            setSelectedMarketId(id)
            setAmount("")
          }}
          leverageHint={loopHint}
          multiplier={multiplier}
          onMultiplierChange={(value) => {
            setHasUserInput(true)
            setMultiplier(value)
          }}
          multiplierMin={multiplierMin}
          multiplierMax={effectiveMultiplierMax}
          multiplierLabel="Target leverage"
          multiplierExposureBaseUsd={leverageExposureBaseUsd}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          secondaryHref={closeHref}
          isPending={isPending}
          outcome={outcome}
          showBalance={showCollateralBalance}
          onMax={handleMaxCollateral}
          balanceLabel={collateralBalanceLabel}
          balanceValue={collateralBalanceValue}
          hideAmountInput={useWorkspaceFields}
          amountPlacement={useWorkspaceFields ? "stacked" : "inline"}
          homeLayout={isHomeLayout}
          singlePrimaryCta={sidebar}
          hideAssetSelector={isHomeLayout && Boolean(initialMarketId)}
        />
      ) : null}

      {canClosePosition && isConfigureVisibleStage(stage) ? (
        <button
          type="button"
          onClick={() => void handleClose()}
          disabled={isPending}
          className="mt-3 w-full rounded-radius-lg border border-border/70 px-4 py-3 text-[15px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="multiply-close-position"
        >
          {t("Close position and withdraw collateral")}
        </button>
      ) : null}
    </ActionPageShell>
  )
}
