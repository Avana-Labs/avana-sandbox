"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatFixed, parseFixed } from "@/app/lib/credit-engine"
import {
  buildHomeBorrowPreview,
  buildHomeRepayPreview,
  buildHomeRemovePreview,
  buildHomeSupplyPreview,
  buildClaimBorrowAction,
  buildHomeClaimPreview,
} from "@/app/lib/borrow-system/action-preview-runtime"
import { HOME_CLAIM_POSITIONS } from "@/app/lib/home-sim"
import { useAvanaSessions, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionKind, ActionPageMode, ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import {
  mapBorrowSuccessToActionUi,
  mapBorrowSupplyPreviewToActionUi,
  mapBorrowTransactionPreviewToActionUi,
} from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSelectStage } from "@/app/components/action-page/action-select-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { mapRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"
import { formatActionUsd } from "@/app/lib/action-system/formatters"

function resolveClaimPositions(marketId: string) {
  const scoped = HOME_CLAIM_POSITIONS.filter((position) => position.poolId === marketId)
  return scoped.length > 0 ? scoped : HOME_CLAIM_POSITIONS
}

function truncateWallet(id: string) {
  if (id.length <= 10) return id
  return `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function BorrowActionPageClient({
  kind,
  mode = "page",
  closeHref = "/borrow",
  initialAssetId,
  initialMarketId,
  initialAmount = "",
}: {
  kind: Extract<ActionKind, "borrow" | "repay" | "supply" | "remove" | "claim">
  mode?: ActionPageMode
  closeHref?: string
  initialAssetId?: string
  initialMarketId?: string
  initialAmount?: string
}) {
  const descriptor = getActionDescriptor("borrow", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useBorrowSessionContext()
  const [stage, setStage] = useState<ActionStage>(kind === "borrow" && !initialAssetId ? "select" : "configure")
  const [assetId, setAssetId] = useState(initialAssetId ?? "")
  const [marketId, setMarketId] = useState(initialMarketId ?? session.collateralPools[0]?.id ?? "")
  const [amount, setAmount] = useState(initialAmount)
  const [percent, setPercent] = useState("25")
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const debtPosition = useMemo(() => {
    const account = session.state.accounts[walletId]
    if (!account) return null
    if (kind === "repay" && marketId) {
      return (
        account.debtPositions.find((position) => position.marketId === marketId) ??
        account.debtPositions.find((position) => {
          const spokeId = session.state.markets[marketId]?.spokeId
          if (!spokeId || !position.marketId) return false
          return session.state.markets[position.marketId]?.spokeId === spokeId
        }) ??
        null
      )
    }
    return account.debtPositions[0] ?? null
  }, [kind, marketId, session.state, walletId])

  const selectItems = useMemo(
    () =>
      session.borrowableAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        trailingLabel: `${asset.borrowApr.toFixed(2)}% APY`,
      })),
    [session.borrowableAssets],
  )

  const marketLabel = useMemo(() => {
    const market = session.marketSummaries.find((entry) => entry.id === marketId)
    return market ? `${market.venue} · ${market.name}` : "Main · Core"
  }, [marketId, session.marketSummaries])

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
      const supplyPreview = buildHomeSupplyPreview(session.state, walletId, marketId, safeAmount)
      const market = session.state.markets[marketId]
      const collateralFactorPct = market ? Number.parseFloat(formatFixed(market.riskConfig.collateralFactorWad, 18)) * 100 : 0
      setPreviewUi(
        mapBorrowSupplyPreviewToActionUi({
          allowed: supplyPreview.isValid,
          amountUsd: safeAmount,
          symbol: market?.display.visuals[0]?.symbol ?? "LP",
          marketLabel,
          borrowPowerUsd: supplyPreview.borrowPowerUsd,
          collateralFactorPct,
          validationError: supplyPreview.warningMessage,
        }),
      )
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
            mapBorrowTransactionPreviewToActionUi(preview, {
              symbol: token?.symbol ?? "Asset",
              amountUsd: safeAmount,
              marketLabel,
              ratePct: 0,
              balanceLabel: "Remaining debt",
              balanceUsd: repayPreview.remainingDebtUsd,
              rateLabel: "Repay amount",
            }),
          )
        })
      return
    }

    if (kind === "remove") {
      const pct = Number.parseFloat(percent) || 0
      const removePreview = buildHomeRemovePreview(session.state, walletId, marketId, pct)
      if (pct <= 0) {
        setPreviewUi(null)
        return
      }
      setPreviewUi(
        mapBorrowSupplyPreviewToActionUi({
          allowed: !removePreview.isUnsafe,
          amountUsd: removePreview.removeUsd,
          symbol: "%",
          marketLabel,
          borrowPowerUsd: removePreview.afterCollateralUsd,
          collateralFactorPct: pct,
          validationError: removePreview.isUnsafe ? "This removal would be unsafe." : null,
        }),
      )
      return
    }

    if (kind === "claim") {
      const positions = resolveClaimPositions(marketId)
      const selections = Object.fromEntries(positions.map((position) => [position.id, true]))
      const claimPreview = buildHomeClaimPreview(session.state, walletId, positions, selections, safeAmount || null)
      setPreviewUi(
        mapRewardsClaimPreviewToActionUi({
          allowed: claimPreview.hasSelection && claimPreview.effectiveClaimUsd > 0,
          claimUsd: claimPreview.effectiveClaimUsd,
          tokenLabel: "Rewards",
          marketLabel,
          blockedReason: claimPreview.hasSelection ? null : "Select rewards to claim",
        }),
      )
    }
  }, [amount, assetId, debtPosition, kind, marketId, marketLabel, percent, session, walletId])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!previewUi?.allowed) return

    setStage("submitting")
    setIsPending(true)
    setOutcome(null)

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
      const result = await session.executeTransaction(preview.intent)
      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${formatActionUsd(safeAmount || previewUi.maxAmount || 0)} processed.`,
          receiptHash: result.receipt.hash,
          metrics: previewUi.metrics,
          href: "/borrow",
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

  return (
    <ActionPageShell mode={mode} title={descriptor.title} subtitle={descriptor.subtitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref} simulated={session.readAdapter.mode === "sandbox"}>
      {stage === "select" ? (
        <ActionSelectStage
          title={descriptor.title}
          subtitle="Choose the asset to borrow."
          items={selectItems}
          onSelect={(id) => {
            setAssetId(id)
            setStage("configure")
          }}
        />
      ) : null}

      {stage === "configure" || stage === "submitting" || stage === "error" ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={kind === "remove" ? percent : amount}
          onAmountChange={kind === "remove" ? setPercent : setAmount}
          preview={previewUi}
          onPrimary={() => void handlePrimary()}
          onSecondary={() => router.push(closeHref)}
          onMax={() => {
            if (previewUi?.maxAmount != null) setAmount(String(previewUi.maxAmount))
          }}
          isPending={isPending}
          outcome={outcome}
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} onSecondary={() => router.push(closeHref)} /> : null}
    </ActionPageShell>
  )
}
