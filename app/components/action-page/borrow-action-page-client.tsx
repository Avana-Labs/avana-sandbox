"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatFixed, parseFixed } from "@/app/lib/credit-engine"
import {
  buildHomeBorrowPreview,
  buildHomeRepayPreview,
  buildHomeRemovePreview,
  buildClaimBorrowAction,
  buildHomeClaimPreview,
} from "@/app/lib/borrow-system/action-preview-runtime"
import { HOME_CLAIM_POSITIONS } from "@/app/lib/home-sim"
import { useAvanaSessions, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionKind, ActionPreviewUi, ActionStage, ActionSuccessUi, ActionBlockedUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import {
  mapBorrowSuccessToActionUi,
  mapBorrowRemovePreviewToActionUi,
  mapBorrowRepayPreviewToActionUi,
  mapBorrowSupplyPreviewToActionUi,
  mapBorrowTransactionPreviewToActionUi,
} from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { mapBorrowRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSelectStage } from "@/app/components/action-page/action-select-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"
import { formatActionUsd } from "@/app/lib/action-system/formatters"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { mapPreviewToBlockedUi } from "@/app/lib/action-system/blocked-ui"
import { borrowSelectItemsForMarket, repaySelectItemsForWallet, resolveBorrowMarketForAsset } from "@/app/lib/action-system/resolve-borrow-context"
import { isConfigureVisibleStage } from "@/app/lib/action-system/stage-machine"

function resolveClaimPositions(marketId: string) {
  const scoped = HOME_CLAIM_POSITIONS.filter((position) => position.poolId === marketId)
  return scoped.length > 0 ? scoped : HOME_CLAIM_POSITIONS
}

function truncateWallet(id: string) {
  if (id.length <= 10) return id
  return `${id.slice(0, 6)}...${id.slice(-4)}`
}

function isHardBlock(reason: string | null) {
  if (!reason) return false
  const lower = reason.toLowerCase()
  return lower.includes("insufficient") || lower.includes("deposit") || lower.includes("unavailable") || lower.includes("disabled")
}

export function BorrowActionPageClient({
  kind,
  closeHref = "/borrow",
  initialAssetId,
  initialMarketId,
  initialAmount = "",
}: {
  kind: Extract<ActionKind, "borrow" | "repay" | "supply" | "remove" | "claim">
  closeHref?: string
  initialAssetId?: string
  initialMarketId?: string
  initialAmount?: string
}) {
  const descriptor = getActionDescriptor("borrow", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useBorrowSessionContext()
  const resolvedInitialMarket = useMemo(
    () => (initialAssetId ? resolveBorrowMarketForAsset(session, initialAssetId, initialMarketId) : initialMarketId),
    [initialAssetId, initialMarketId, session],
  )
  const [stage, setStage] = useState<ActionStage>(() => {
    if (kind === "borrow" && !initialAssetId) return "select"
    return "configure"
  })
  const [assetId, setAssetId] = useState(initialAssetId ?? "")
  const [marketId, setMarketId] = useState(resolvedInitialMarket ?? session.collateralPools[0]?.id ?? "")
  const [amount, setAmount] = useState(initialAmount)
  const [percent, setPercent] = useState("25")
  const [receiveWeth, setReceiveWeth] = useState(false)
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [blockedUi, setBlockedUi] = useState<ActionBlockedUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const debtPositions = useMemo(() => session.state.accounts[walletId]?.debtPositions ?? [], [session.state.accounts, walletId])
  const [debtPositionId, setDebtPositionId] = useState("")

  const debtPosition = useMemo(() => {
    if (debtPositionId) {
      return debtPositions.find((position) => position.id === debtPositionId) ?? null
    }
    if (kind !== "repay") return null
    if (initialMarketId) {
      return (
        debtPositions.find((position) => position.marketId === initialMarketId) ??
        debtPositions.find((position) => {
          const spokeId = session.state.markets[initialMarketId]?.spokeId
          if (!spokeId || !position.marketId) return false
          return session.state.markets[position.marketId]?.spokeId === spokeId
        }) ??
        null
      )
    }
    return debtPositions.length === 1 ? (debtPositions[0] ?? null) : null
  }, [debtPositionId, debtPositions, initialMarketId, kind, session.state.markets])

  const selectMarketId = marketId || session.collateralPools[0]?.id || ""
  const selectItems = useMemo(() => {
    if (kind === "repay") return repaySelectItemsForWallet(session, walletId)
    return borrowSelectItemsForMarket(session, selectMarketId || undefined)
  }, [kind, selectMarketId, session, walletId])

  const marketLabel = useMemo(() => {
    const market = session.marketSummaries.find((entry) => entry.id === marketId)
    return market ? `${market.venue} · ${market.name}` : "Main · Core"
  }, [marketId, session.marketSummaries])

  const borrowAssetOptions = useMemo(() => {
    if (kind !== "borrow") return undefined
    const options = session.getBorrowableAssetsForMarket(marketId).map((asset) => ({
      id: asset.id,
      label: asset.symbol,
      symbol: asset.symbol,
    }))
    return options.length > 1 ? options : undefined
  }, [kind, marketId, session])

  const assetSymbol = useMemo(() => {
    if (kind === "remove") return "%"
    if (assetId) return session.state.assets[assetId]?.symbol ?? previewUi?.amountLabel.split(" ").slice(-1)[0]
    if (debtPosition) return session.state.assets[debtPosition.assetId]?.symbol
    const market = session.state.markets[marketId]
    return market?.display.visuals[0]?.symbol ?? "Asset"
  }, [assetId, debtPosition, kind, marketId, previewUi?.amountLabel, session.state.assets, session.state.markets])

  useEffect(() => {
    if (kind !== "repay" || initialMarketId || debtPositionId) return
    if (debtPositions.length === 1) {
      setDebtPositionId(debtPositions[0]!.id)
      if (debtPositions[0]!.marketId) setMarketId(debtPositions[0]!.marketId)
      return
    }
    if (debtPositions.length > 1) setStage("select")
  }, [debtPositionId, debtPositions, initialMarketId, kind])

  useEffect(() => {
    if (initialAssetId) {
      setAssetId(initialAssetId)
      setStage("configure")
    }
  }, [initialAssetId])

  useEffect(() => {
    if (initialAssetId && resolvedInitialMarket) {
      setMarketId(resolvedInitialMarket)
    }
  }, [initialAssetId, resolvedInitialMarket])

  useEffect(() => {
    if (debtPosition?.marketId) setMarketId(debtPosition.marketId)
  }, [debtPosition?.marketId])

  useEffect(() => {
    const parsedAmount = Number.parseFloat(amount)
    const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0

    if (kind === "borrow") {
      if (!assetId || safeAmount <= 0) {
        setPreviewUi(null)
        return
      }
      const homePreview = buildHomeBorrowPreview(session.state, walletId, marketId, assetId, safeAmount)
      void session
        .previewTransaction(
          session.createIntent({
            type: "borrow",
            walletId,
            marketId,
            assetId,
            amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
          }),
        )
        .then((preview) => {
          const token = session.getBorrowableAssetsForMarket(marketId).find((entry) => entry.id === assetId)
          setPreviewUi(
            mapBorrowTransactionPreviewToActionUi(preview, {
              symbol: token?.symbol ?? "Asset",
              amountUsd: safeAmount,
              marketLabel,
              ratePct: token?.borrowApr ?? 0,
              balanceLabel: "Available to Borrow",
              balanceUsd: homePreview.remainingBorrowPowerUsd,
            }),
          )
        })
        .catch(() => setPreviewUi(null))
      return
    }

    if (kind === "supply") {
      if (safeAmount <= 0) {
        setPreviewUi(null)
        return
      }
      const market = session.state.markets[marketId]
      const collateralFactorPct = market ? Number.parseFloat(formatFixed(market.riskConfig.collateralFactorWad, 18)) * 100 : 0
      const liquidationPct = market ? Number.parseFloat(formatFixed(market.riskConfig.liquidationThresholdWad, 18)) * 100 : 0
      const borrowableAssets = session.getBorrowableAssetsForMarket(marketId)
      void session
        .previewTransaction(
          session.createIntent({
            type: "supplyCollateral",
            walletId,
            marketId,
            amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
          }),
        )
        .then((preview) => {
          setPreviewUi(
            mapBorrowSupplyPreviewToActionUi(preview, {
              symbol: market?.display.visuals[0]?.symbol ?? "LP",
              amountUsd: safeAmount,
              marketLabel,
              collateralFactorPct,
              collateralRiskPct: Math.max(0, liquidationPct - collateralFactorPct),
              borrowableAssetsLabel: borrowableAssets.map((asset) => asset.symbol).join(", ") || "—",
              borrowableAssetSymbols: borrowableAssets.map((asset) => asset.symbol),
            }),
          )
        })
        .catch(() => setPreviewUi(null))
      return
    }

    if (kind === "repay") {
      if (safeAmount <= 0 || !debtPosition) {
        setPreviewUi(null)
        return
      }
      const repayPreview = buildHomeRepayPreview(session.state, walletId, debtPosition.id, safeAmount)
      void session
        .previewTransaction(
          session.createIntent({
            type: "repay",
            walletId,
            debtPositionId: debtPosition.id,
            amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
          }),
        )
        .then((preview) => {
          const token = session.state.assets[debtPosition.assetId]
          setPreviewUi(
            mapBorrowRepayPreviewToActionUi(preview, {
              symbol: token?.symbol ?? "Asset",
              amountUsd: safeAmount,
              marketLabel,
              remainingDebtUsd: repayPreview.remainingDebtUsd,
              yearlyInterestSavedUsd: repayPreview.yearlyInterestSavedUsd,
            }),
          )
        })
        .catch(() => setPreviewUi(null))
      return
    }

    if (kind === "remove") {
      const pct = Number.parseFloat(percent) || 0
      const removePreview = buildHomeRemovePreview(session.state, walletId, marketId, pct)
      const position = session.state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === marketId)
      if (pct <= 0 || !position) {
        setPreviewUi(null)
        return
      }
      const pool = session.collateralPools.find((entry) => entry.id === marketId)
      void session
        .previewTransaction(
          session.createIntent({
            type: "removeCollateral",
            walletId,
            positionId: position.id,
            percentBps: pct * 100,
          }),
        )
        .then((preview) => {
          setPreviewUi(
            mapBorrowRemovePreviewToActionUi(preview, {
              percent: pct,
              removeUsd: removePreview.removeUsd,
              marketLabel,
              positionApyPct: pool?.pairApr ?? 0,
            }),
          )
        })
        .catch(() => setPreviewUi(null))
      return
    }

    if (kind === "claim") {
      const positions = resolveClaimPositions(marketId)
      const selections = Object.fromEntries(positions.map((position) => [position.id, true]))
      const claimPreview = buildHomeClaimPreview(session.state, walletId, positions, selections, safeAmount || null)
      setPreviewUi(
        mapBorrowRewardsClaimPreviewToActionUi({
          allowed: claimPreview.hasSelection && claimPreview.effectiveClaimUsd > 0,
          claimUsd: claimPreview.effectiveClaimUsd,
          marketLabel,
          tokenTotals: claimPreview.tokenTotals,
          blockedReason: claimPreview.hasSelection ? null : "Select rewards to claim",
        }),
      )
    }
  }, [amount, assetId, debtPosition, kind, marketId, marketLabel, percent, session, walletId])

  useEffect(() => {
    if (!previewUi || previewUi.allowed || stage !== "configure") return
    if (!isHardBlock(previewUi.blockedReason)) return
    const blocked = mapPreviewToBlockedUi({ product: "borrow", kind, blockedReason: previewUi.blockedReason })
    if (blocked) {
      setBlockedUi(blocked)
      setStage("blocked")
    }
  }, [kind, previewUi, stage])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!previewUi?.allowed) return

    setOutcome(null)
    setIsPending(true)

    try {
      const parsedAmount = Number.parseFloat(amount)
      const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0
      let intent

      if (kind === "borrow") {
        intent = session.createIntent({
          type: "borrow",
          walletId,
          marketId,
          assetId,
          amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
        })
      } else if (kind === "supply") {
        intent = session.createIntent({
          type: "supplyCollateral",
          walletId,
          marketId,
          amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
        })
      } else if (kind === "repay") {
        if (!debtPosition) throw new Error("No debt selected")
        intent = session.createIntent({
          type: "repay",
          walletId,
          debtPositionId: debtPosition.id,
          amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
        })
      } else if (kind === "claim") {
        const positions = resolveClaimPositions(marketId)
        const selections = Object.fromEntries(positions.map((position) => [position.id, true]))
        const claimPreview = buildHomeClaimPreview(session.state, walletId, positions, selections, safeAmount || null)
        const action = buildClaimBorrowAction(walletId, claimPreview)
        if (!action) throw new Error("Nothing to claim")
        intent = session.createIntent(action)
      } else {
        const position = session.state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === marketId)
        if (!position) throw new Error("No collateral selected")
        intent = session.createIntent({
          type: "removeCollateral",
          walletId,
          positionId: position.id,
          percentBps: (Number.parseFloat(percent) || 0) * 100,
        })
      }

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
          description: `${formatActionUsd(safeAmount || previewUi.maxAmount || 0)} processed.`,
          receiptHash: result.receipt.hash ?? null,
          metrics: previewUi.metrics,
          href: "/borrow",
          primaryCtaLabel: "View borrow dashboard",
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
  }, [amount, assetId, closeHref, debtPosition, descriptor.primaryVerb, kind, marketId, percent, previewUi, router, session, stage, walletId])

  const applyPercent = useCallback(
    (pct: number) => {
      if (kind === "remove") {
        setPercent(String(pct))
        return
      }
      if (previewUi?.maxAmount != null) {
        setAmount(String((previewUi.maxAmount * pct) / 100))
      }
    },
    [kind, previewUi?.maxAmount],
  )

  const shellSubtitle =
    stage === "select"
      ? kind === "repay"
        ? "Choose the debt to repay."
        : "Choose the asset to borrow."
      : stage === "success" || stage === "processing"
        ? undefined
        : descriptor.subtitle
  const hideTitle = stage === "success" || stage === "processing" || stage === "blocked"

  return (
    <ActionPageShell
      title={descriptor.title}
      subtitle={shellSubtitle}
      hideTitle={hideTitle}
      walletLabel={truncateWallet(walletId)}
      closeHref={closeHref}
      simulated={session.readAdapter.mode === "sandbox"}
    >
      {stage === "select" ? (
        <ActionSelectStage
          items={selectItems}
          emptyTitle={kind === "repay" ? "No debt found" : "No assets found"}
          emptyDescription={kind === "repay" ? "Borrow first, then repay from here." : "Try adjusting your search"}
          onSelect={(id) => {
            if (kind === "repay") {
              const position = debtPositions.find((entry) => entry.id === id)
              if (!position) return
              setDebtPositionId(id)
              if (position.marketId) setMarketId(position.marketId)
              setStage("configure")
              return
            }
            setAssetId(id)
            setMarketId(resolveBorrowMarketForAsset(session, id, selectMarketId))
            setStage("configure")
          }}
        />
      ) : null}

      {stage === "processing" ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={kind === "remove" ? percent : amount}
          onAmountChange={kind === "remove" ? setPercent : setAmount}
          preview={previewUi}
          assetSymbol={assetSymbol}
          assetOptions={borrowAssetOptions}
          selectedAssetId={assetId}
          onAssetSelect={(id) => {
            setAssetId(id)
            setMarketId(resolveBorrowMarketForAsset(session, id, selectMarketId))
            setAmount("")
          }}
          onPrimary={() => void handlePrimary()}
          secondaryHref={closeHref}
          onMax={() => {
            if (kind === "remove") setPercent("100")
            else if (previewUi?.maxAmount != null) setAmount(String(previewUi.maxAmount))
          }}
          onPercent={applyPercent}
          showPercentShortcuts={kind === "borrow" || kind === "repay" || kind === "remove"}
          showReceiveWethToggle={kind === "remove"}
          receiveWeth={receiveWeth}
          onReceiveWethChange={setReceiveWeth}
          isPending={isPending}
          outcome={outcome}
        />
      ) : null}

      {blockedUi ? (
        <ActionBlockedDialog
          blocked={blockedUi}
          open={stage === "blocked"}
          onClose={() => setStage("configure")}
        />
      ) : null}
    </ActionPageShell>
  )
}
