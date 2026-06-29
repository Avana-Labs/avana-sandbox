"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi, ActionBlockedUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapDeleveragePreviewToActionUi, mapMultiplyPreviewToActionUi } from "@/app/lib/action-system/adapters/multiply-preview-mapper"
import { formatMultiplyLoopMarketLabel } from "@/app/lib/multiply-system/market-labels"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionNotFound } from "@/app/components/action-page/action-not-found"
import { ActionConfigureStage, ActionConfigureAmountSection } from "@/app/components/action-page/action-configure-stage"
import { ActionLeverageRuler } from "@/app/components/action-page/action-leverage-ruler"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { mapPreviewToBlockedUi } from "@/app/lib/action-system/blocked-ui"
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

export function MultiplyActionPageClient({
  kind,
  closeHref = "/multiply",
  embedded = false,
  sidebar: _sidebar = false,
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
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useMultiplySessionContext()
  const walletPositions = useMemo(
    () => Object.values(session.state.positions).filter((entry) => entry.walletId === walletId),
    [session.state.positions, walletId],
  )
  const [selectedMarketId, setSelectedMarketId] = useState<string | undefined>(
    () => initialMarketId ?? (kind === "deleverage" ? walletPositions[0]?.marketId : undefined),
  )
  const market = useMemo(() => {
    const markets = Object.values(session.state.markets)
    const selected = selectedMarketId ? markets.find((entry) => entry.id === selectedMarketId) ?? null : null
    if (selected) return selected
    if (selectedMarketId || initialMarketId) return null
    return markets[0] ?? null
  }, [initialMarketId, selectedMarketId, session.state.markets])

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
  const [multiplier, setMultiplier] = useState(() => initialMultiplier ?? (kind === "deleverage" ? "" : defaultMultiplyMultiplier))
  const [blockedUi, setBlockedUi] = useState<ActionBlockedUi | null>(null)
  const [dismissedBlockedReason, setDismissedBlockedReason] = useState<string | null>(null)
  const [hasUserInput, setHasUserInput] = useState(() => Boolean(initialAmount || initialMultiplier))

  useEffect(() => {
    if (kind !== "deleverage" || initialMarketId || selectedMarketId || walletPositions.length === 0) return
    setSelectedMarketId(walletPositions[0]!.marketId)
  }, [initialMarketId, kind, selectedMarketId, walletPositions])

  useEffect(() => {
    if (kind !== "deleverage" || !position) return
    const parsed = parsePositiveActionAmount(multiplier)
    if (initialMultiplier && parsed != null) return
    const next = getDefaultDeleverageMultiplier(position.multiplier)
    if (multiplier !== next) setMultiplier(next)
  }, [initialMultiplier, kind, multiplier, position])

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
    const options = buildMultiplierOptions(effectiveMax)
    const clamped = clampMultiplierToOptions(
      Math.min(effectiveMax, Math.max(multiplierMin, parsed)),
      options,
    )
    const next = String(Number(clamped.toFixed(2)))
    if (next !== multiplier) setMultiplier(next)
  }, [kind, market, multiplier, multiplierMin, position?.multiplier])
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!market) return
    let cancelled = false
    const parsedAmount = kind === "deleverage" ? parsePositiveActionAmount(amount) : parsePositiveActionAmount(amount)
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

      const action = {
        type: "multiply" as const,
        walletId,
        marketId: market.id,
        collateralAmount: multiplyCollateralAmount,
        selectedMultiplier: parsedMultiplier,
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
              collateralPriceUsd: market.collateralAsset.priceUsd,
              marketLabel: formatMultiplyLoopMarketLabel(market.collateralAsset.symbol, market.borrowAsset.symbol),
              collateralApy: market.collateralAsset.apy,
              borrowApy: market.borrowAsset.borrowApy,
              multiplier: parsedMultiplier,
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
  }, [amount, kind, market, multiplier, position, session, walletId])

  useEffect(() => {
    if (kind === "multiply") return
    if (!previewUi || previewUi.allowed || stage !== "configure") return
    if (!previewUi.blockedReason) return
    if (previewUi.blockedReason === dismissedBlockedReason) return
    const blocked = mapPreviewToBlockedUi({ product: "multiply", kind, blockedReason: previewUi.blockedReason })
    if (blocked) {
      setBlockedUi(blocked)
      if (!embedded) setStage("blocked")
    }
  }, [dismissedBlockedReason, kind, previewUi, stage])

  useEffect(() => {
    setDismissedBlockedReason(null)
  }, [amount, kind, market?.id, multiplier])

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("configure")
      setOutcome(null)
      return
    }
    router.push(closeHref)
  }, [closeHref, router, stage])

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
    if (stage !== "review") return
    if (!market || !previewUi?.allowed) return
    if (isPending) return // guard against double-submit (rapid double-click)

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
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Transaction was cancelled",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, descriptor.primaryVerb, hasUserInput, isPending, kind, market, multiplier, previewUi, router, session, stage, successUi, walletId, position])

  if (!market) {
    return (
      <ActionNotFound
        closeHref={closeHref}
        title="Market unavailable"
        message="We couldn't find that multiply market. Pick one from the multiply page to continue."
      />
    )
  }

  const hideTitle = embedded || stage === "success" || stage === "processing" || stage === "blocked" || stage === "review"
  const isHomeLayout = embedded && layout === "home"
  const shellDensity = isHomeLayout ? "home" : "default"
  const showInlineBlocked = embedded && Boolean(blockedUi) && isConfigureVisibleStage(stage)
  const marketLabel = formatMultiplyLoopMarketLabel(market.collateralAsset.symbol, market.borrowAsset.symbol)
  const effectiveMultiplierMax =
    kind === "deleverage"
      ? getDeleverageMultiplierMax(position?.multiplier ?? Number.NaN, 0.1)
      : resolveMultiplyMarketMaxLeverage(market.risk.publicMaxMultiplier)
  const useWorkspaceFields =
    embedded && isHomeLayout && market != null && isConfigureVisibleStage(stage) && !showInlineBlocked
  const stackedAmountField = useWorkspaceFields ? (
    <ActionConfigureAmountSection
      verb={descriptor.primaryVerb}
      amount={amount}
      onAmountChange={(value) => {
        setHasUserInput(true)
        setAmount(value)
      }}
      preview={previewUi}
      assetSymbol={market.collateralAsset.symbol}
      borrowSymbol={market.borrowAsset.symbol}
      assetLabel={marketLabel}
      assetOptions={!initialMarketId ? marketOptions : undefined}
      selectedAssetId={market.id}
      onAssetSelect={(id) => {
        setHasUserInput(true)
        setSelectedMarketId(id)
        setAmount("")
      }}
      amountVariant="raised"
      amountFooter={
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
        />
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
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {showInlineBlocked && blockedUi ? (
        <ActionBlockedDialog
          variant="inline"
          blocked={blockedUi}
          open
          onClose={() => {
            setDismissedBlockedReason(previewUi?.blockedReason ?? null)
            setBlockedUi(null)
          }}
        />
      ) : null}

      {isConfigureVisibleStage(stage) && !showInlineBlocked ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={(value) => {
            setHasUserInput(true)
            setAmount(value)
          }}
          preview={previewUi}
          assetSymbol={market.collateralAsset.symbol}
          borrowSymbol={market.borrowAsset.symbol}
          assetOptions={marketOptions}
          selectedAssetId={market.id}
          onAssetSelect={(id) => {
            setHasUserInput(true)
            setSelectedMarketId(id)
            setAmount("")
          }}
          multiplier={multiplier}
          onMultiplierChange={(value) => {
            setHasUserInput(true)
            setMultiplier(value)
          }}
          multiplierMin={multiplierMin}
          multiplierMax={effectiveMultiplierMax}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          secondaryHref={closeHref}
          isPending={isPending}
          outcome={outcome}
          hideAmountInput={useWorkspaceFields}
          amountPlacement={useWorkspaceFields ? "stacked" : "inline"}
          homeLayout={isHomeLayout}
          hideAssetSelector={isHomeLayout && Boolean(initialMarketId)}
        />
      ) : null}

      {blockedUi && !embedded ? (
        <ActionBlockedDialog
          blocked={blockedUi}
          open={stage === "blocked"}
          onClose={() => {
            setDismissedBlockedReason(previewUi?.blockedReason ?? null)
            setStage("configure")
          }}
        />
      ) : null}
    </ActionPageShell>
  )
}
