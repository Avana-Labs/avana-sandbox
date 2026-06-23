"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatFixed, parseFixed, currentDebtValueUsd6 } from "@/app/lib/credit-engine"
import {
  buildHomeBorrowPreview,
  buildHomeRepayPreview,
  buildHomeRemovePreview,
  buildClaimBorrowAction,
  buildHomeClaimPreview,
  selectHomeBorrowTokensForMarket,
  selectHomeDebtMap,
  selectHomeRepayTokensForMarket,
} from "@/app/lib/borrow-system/action-preview-runtime"
import { HOME_CLAIM_POSITIONS } from "@/app/lib/home-sim"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"
import { useAvanaSessions, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionKind, ActionPreviewUi, ActionStage, ActionSuccessUi, ActionBlockedUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor, actionPagePath } from "@/app/lib/action-system/contracts"
import {
  mapBorrowSuccessToActionUi,
  mapBorrowRemovePreviewToActionUi,
  mapBorrowRepayPreviewToActionUi,
  mapBorrowSupplyPreviewToActionUi,
  mapBorrowTransactionPreviewToActionUi,
} from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { mapBorrowRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"
import { ActionBorrowContextBar } from "@/app/components/action-page/action-borrow-context-bar"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSelectStage } from "@/app/components/action-page/action-select-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { formatActionUsd, formatActionInputAmount } from "@/app/lib/action-system/formatters"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { mapPreviewToBlockedUi, blockedUiForMissingWalletLp } from "@/app/lib/action-system/blocked-ui"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { formatBorrowMarketContext, formatBorrowMarketLabel } from "@/app/lib/borrow-system/market-labels"
import { getWalletLpBalanceUsd } from "@/app/lib/borrow-system/wallet-lp-balances"
import {
  borrowSelectItemsForMarket,
  claimSelectItemsForWallet,
  repaySelectItemsForWallet,
  resolveBorrowAssetId,
  resolveBorrowMarketForAsset,
  resolveClaimMarketId,
  supplySelectItemsForWallet,
} from "@/app/lib/action-system/resolve-borrow-context"
import { isConfigureVisibleStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"
import { parseActionPercentBps, parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"

function resolveClaimPositions(marketId: string, claimPositionId?: string) {
  if (claimPositionId) {
    const selected = HOME_CLAIM_POSITIONS.find((position) => position.id === claimPositionId)
    if (selected) return [selected]
  }
  const poolId = Object.entries(HOME_POOL_TO_MARKET_ID).find(([, id]) => id === marketId)?.[0] ?? marketId
  const scoped = HOME_CLAIM_POSITIONS.filter((position) => position.poolId === poolId || position.poolId === marketId)
  return scoped.length > 0 ? scoped : HOME_CLAIM_POSITIONS
}

function isHardBlock(reason: string | null) {
  if (!reason) return false
  const lower = reason.toLowerCase()
  return lower.includes("insufficient") || lower.includes("deposit") || lower.includes("unavailable") || lower.includes("disabled")
}

export function BorrowActionPageClient({
  kind,
  closeHref = "/borrow",
  embedded = false,
  initialAssetId,
  initialMarketId,
  initialAmount = "",
  initialPositionId,
  initialDebtId,
}: {
  kind: Extract<ActionKind, "borrow" | "repay" | "supply" | "remove" | "claim">
  closeHref?: string
  embedded?: boolean
  initialAssetId?: string
  initialMarketId?: string
  initialAmount?: string
  initialPositionId?: string
  initialDebtId?: string
}) {
  const descriptor = getActionDescriptor("borrow", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useBorrowSessionContext()
  const resolvedInitialMarket = useMemo(
    () =>
      initialMarketId ??
      (initialAssetId ? resolveBorrowMarketForAsset(session, initialAssetId, initialMarketId) : undefined),
    [initialAssetId, initialMarketId, session],
  )
  const resolvedInitialAsset = useMemo(
    () => (initialAssetId ? resolveBorrowAssetId(session.state, initialAssetId, resolvedInitialMarket) : ""),
    [initialAssetId, resolvedInitialMarket, session.state],
  )
  const [stage, setStage] = useState<ActionStage>(() => {
    if (embedded) return "configure"
    if (kind === "borrow" && !resolvedInitialAsset) return "select"
    if (kind === "supply" && !initialMarketId) return "select"
    if (kind === "claim" && !initialMarketId && !initialPositionId) return "select"
    if (kind === "repay" && !initialMarketId && !initialDebtId) return "select"
    return "configure"
  })
  const [assetId, setAssetId] = useState(resolvedInitialAsset)
  const [marketId, setMarketId] = useState(resolvedInitialMarket ?? session.collateralPools[0]?.id ?? "")
  const [amount, setAmount] = useState(initialAmount)
  const [percent, setPercent] = useState("25")
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [blockedUi, setBlockedUi] = useState<ActionBlockedUi | null>(null)
  const [dismissedBlockedReason, setDismissedBlockedReason] = useState<string | null>(null)
  const [claimPositionId, setClaimPositionId] = useState(initialPositionId ?? "")
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const debtPositions = useMemo(() => session.state.accounts[walletId]?.debtPositions ?? [], [session.state.accounts, walletId])
  const [debtPositionId, setDebtPositionId] = useState(initialDebtId ?? "")

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
  const debts = useMemo(() => selectHomeDebtMap(session.state, walletId), [session.state, walletId])
  const activePool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === marketId) ?? session.collateralPools[0] ?? null,
    [marketId, session.collateralPools],
  )
  const borrowTokens = useMemo(
    () => (marketId ? selectHomeBorrowTokensForMarket(session.state, walletId, marketId) : []),
    [marketId, session.state, walletId],
  )
  const repayTokens = useMemo(
    () => (marketId ? selectHomeRepayTokensForMarket(session.state, walletId, marketId) : []),
    [marketId, session.state, walletId],
  )
  const contextToken = useMemo(() => {
    if (kind === "borrow") {
      return borrowTokens.find((token) => token.id === assetId) ?? borrowTokens[0] ?? null
    }
    if (kind === "repay" && debtPosition) {
      return repayTokens.find((token) => token.id === debtPosition.assetId) ?? repayTokens[0] ?? null
    }
    return null
  }, [assetId, borrowTokens, debtPosition, kind, repayTokens])

  const usesCollateralContext = kind === "borrow" || kind === "repay" || kind === "remove" || kind === "claim"
  const showCollateralContextBar =
    usesCollateralContext && (isConfigureVisibleStage(stage) || stage === "review") && activePool != null

  const handlePoolChange = useCallback(
    (poolId: string) => {
      setMarketId(poolId)
      setAmount("")
      setPercent("25")
      if (kind === "borrow") {
        const tokens = selectHomeBorrowTokensForMarket(session.state, walletId, poolId)
        setAssetId(tokens[0]?.id ?? "")
        return
      }
      if (kind === "repay") {
        const position =
          debtPositions.find((entry) => entry.marketId === poolId) ??
          debtPositions.find((entry) => {
            const spokeId = session.state.markets[poolId]?.spokeId
            return spokeId ? entry.spokeId === spokeId : false
          }) ??
          null
        if (position) setDebtPositionId(position.id)
        return
      }
      if (kind === "claim") {
        setClaimPositionId("")
      }
    },
    [debtPositions, kind, session.state, walletId],
  )

  const handleContextTokenChange = useCallback(
    (tokenId: string) => {
      setAmount("")
      if (kind === "borrow") {
        setAssetId(resolveBorrowAssetId(session.state, tokenId, marketId))
        return
      }
      if (kind === "repay") {
        const position = debtPositions.find((entry) => entry.assetId === tokenId && entry.marketId === marketId)
        if (position) {
          setDebtPositionId(position.id)
        }
      }
    },
    [debtPositions, kind, marketId, session.state],
  )

  const selectItems = useMemo(() => {
    if (kind === "repay") return repaySelectItemsForWallet(session, walletId)
    if (kind === "claim") return claimSelectItemsForWallet(session, walletId)
    if (kind === "supply") return supplySelectItemsForWallet(session, walletId)
    return borrowSelectItemsForMarket(session, selectMarketId || undefined, walletId)
  }, [kind, selectMarketId, session, walletId])

  const borrowAssetOptions = useMemo(() => {
    if (kind !== "borrow") return undefined
    const options = session.getBorrowableAssetsForMarket(marketId).map((asset) => ({
      id: asset.id,
      label: asset.symbol,
      symbol: asset.symbol,
    }))
    return options.length > 1 ? options : undefined
  }, [kind, marketId, session])

  const marketLabel = useMemo(() => {
    const market = session.marketSummaries.find((entry) => entry.id === marketId)
    return market ? formatBorrowMarketLabel(market) : "Collateral pool"
  }, [marketId, session.marketSummaries])

  const repayAssetOptions = useMemo(() => {
    if (kind !== "repay" || !debtPosition) return undefined
    const options = debtPositions
      .filter((position) => position.marketId === debtPosition.marketId)
      .map((position) => {
        const asset = session.state.assets[position.assetId]
        const debtUsd = Number.parseFloat(formatFixed(currentDebtValueUsd6(position), 6))
        return {
          id: position.id,
          label: asset?.symbol ?? "Asset",
          symbol: asset?.symbol ?? "Asset",
          sublabel: formatActionUsd(debtUsd),
        }
      })
    return options.length > 1 ? options : undefined
  }, [debtPosition, debtPositions, kind, session.state.assets])

  const claimAssetOptions = useMemo(() => {
    if (kind !== "claim") return undefined
    const options = claimSelectItemsForWallet(session, walletId).map((item) => ({
      id: item.id,
      label: item.name,
      symbol: item.symbol,
      sublabel: item.trailingLabel,
    }))
    return options.length > 1 ? options : undefined
  }, [kind, session, walletId])

  const supplyPairSymbols = useMemo(() => {
    if (kind !== "supply" && kind !== "remove") return null
    const market = session.state.markets[marketId]
    const visuals = market?.display.visuals
    if (!visuals || visuals.length < 2) return null
    return [visuals[0]!.symbol, visuals[1]!.symbol] as const
  }, [kind, marketId, session.state.markets])

  const supplyAssetOptions = useMemo(() => {
    if (kind !== "supply") return undefined
    const options = supplySelectItemsForWallet(session, walletId).map((item) => {
      const market = session.state.markets[item.id]
      const visuals = market?.display.visuals ?? []
      return {
        id: item.id,
        label: item.name,
        symbol: visuals[0]?.symbol ?? item.symbol,
        borrowSymbol: visuals[1]?.symbol,
        sublabel: item.sublabel,
      }
    })
    return options.length > 1 ? options : undefined
  }, [kind, session, walletId])

  const assetSymbol = useMemo(() => {
    if (kind === "remove" || kind === "supply") {
      const market = session.state.markets[marketId]
      return market?.display.visuals.map((visual) => visual.symbol).join(" / ") ?? "LP"
    }
    const resolvedAssetId = assetId ? resolveBorrowAssetId(session.state, assetId, marketId) : ""
    if (resolvedAssetId) {
      return session.state.assets[resolvedAssetId]?.symbol ?? previewUi?.amountLabel.split(" ").slice(-1)[0]
    }
    if (debtPosition) return session.state.assets[debtPosition.assetId]?.symbol
    const market = session.state.markets[marketId]
    return market?.display.visuals[0]?.symbol ?? "Asset"
  }, [assetId, debtPosition, kind, marketId, previewUi?.amountLabel, session.state.assets, session.state.markets])

  useEffect(() => {
    if (initialPositionId) setClaimPositionId(initialPositionId)
  }, [initialPositionId])

  useEffect(() => {
    if (initialDebtId) setDebtPositionId(initialDebtId)
  }, [initialDebtId])

  useEffect(() => {
    if (embedded || kind !== "repay" || initialMarketId || initialDebtId || debtPositionId) return
    if (debtPositions.length === 1) {
      setDebtPositionId(debtPositions[0]!.id)
      if (debtPositions[0]!.marketId) setMarketId(debtPositions[0]!.marketId)
      return
    }
    if (debtPositions.length > 1) setStage("select")
  }, [debtPositionId, debtPositions, embedded, initialDebtId, initialMarketId, kind])

  useEffect(() => {
    if (embedded || kind !== "borrow" || !assetId) return
    const resolvedMarket = resolveBorrowMarketForAsset(session, assetId, marketId)
    if (resolvedMarket && resolvedMarket !== marketId) {
      setMarketId(resolvedMarket)
    }
  }, [assetId, embedded, kind, marketId, session])

  useEffect(() => {
    if (embedded) return
    if (!initialAssetId) return
    const resolved = resolveBorrowAssetId(session.state, initialAssetId, resolvedInitialMarket)
    setAssetId(resolved)
    setStage("configure")
  }, [embedded, initialAssetId, resolvedInitialMarket, session.state])

  useEffect(() => {
    if (kind !== "borrow" || !marketId || borrowTokens.length === 0) return
    if (assetId && borrowTokens.some((token) => token.id === assetId)) return
    setAssetId(borrowTokens[0]!.id)
  }, [assetId, borrowTokens, kind, marketId])

  useEffect(() => {
    if (embedded) return
    if (!initialMarketId) return
    setMarketId(initialMarketId)
    if (kind === "supply" || kind === "remove" || kind === "repay" || resolvedInitialAsset) {
      setStage("configure")
    }
  }, [embedded, initialMarketId, kind, resolvedInitialAsset])

  useEffect(() => {
    if (initialAssetId && resolvedInitialMarket) {
      setMarketId(resolvedInitialMarket)
    }
  }, [initialAssetId, resolvedInitialMarket])

  useEffect(() => {
    if (debtPosition?.marketId) setMarketId(debtPosition.marketId)
  }, [debtPosition?.marketId])

  useEffect(() => {
    if (embedded || kind !== "supply" || initialMarketId || marketId) return
    const items = supplySelectItemsForWallet(session, walletId)
    if (items.length === 1) {
      setMarketId(items[0]!.id)
    }
  }, [embedded, initialMarketId, kind, marketId, session, walletId])

  useEffect(() => {
    if (!embedded || usesCollateralContext === false || session.collateralPools.length === 0) return
    if (marketId && session.collateralPools.some((pool) => pool.id === marketId)) return
    setMarketId(session.collateralPools[0]!.id)
  }, [embedded, marketId, session.collateralPools, usesCollateralContext])

  useEffect(() => {
    if (kind !== "supply" || !marketId || stage !== "configure") return
    const walletLpUsd = getWalletLpBalanceUsd(walletId, marketId)
    if (walletLpUsd > 0) return
    const market = session.state.markets[marketId]
    const label = market ? formatBorrowMarketLabel({ name: market.display.name }) : "this pool"
    setBlockedUi(blockedUiForMissingWalletLp(label))
    setStage("blocked")
  }, [kind, marketId, session.state.markets, stage, walletId])

  useEffect(() => {
    let cancelled = false
    const safeAmount = parsePositiveActionAmount(amount) ?? 0

    if (kind === "borrow") {
      const resolvedAssetId = resolveBorrowAssetId(session.state, assetId, marketId)
      if (!resolvedAssetId || !session.state.assets[resolvedAssetId] || safeAmount <= 0) {
        setPreviewUi(null)
        return undefined
      }
      const homePreview = buildHomeBorrowPreview(session.state, walletId, marketId, resolvedAssetId, safeAmount)
      void session
        .previewTransaction(
          session.createIntent({
            type: "borrow",
            walletId,
            marketId,
            assetId: resolvedAssetId,
            amountUsd6: parseFixed(safeAmount.toFixed(6), 6),
          }),
        )
        .then((preview) => {
          if (cancelled) return
          const token = session.getBorrowableAssetsForMarket(marketId).find((entry) => entry.id === resolvedAssetId)
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
        .catch(() => {
          if (!cancelled) setPreviewUi(null)
        })
      return () => {
        cancelled = true
      }
    }

    if (kind === "supply") {
      if (safeAmount <= 0) {
        setPreviewUi(null)
        return undefined
      }
      const market = session.state.markets[marketId]
      const collateralFactorPct = market
        ? Math.round(Number.parseFloat(formatFixed(market.riskConfig.collateralFactorWad, 18)) * 1000) / 10
        : 0
      const liquidationPct = market
        ? Math.round(Number.parseFloat(formatFixed(market.riskConfig.liquidationThresholdWad, 18)) * 1000) / 10
        : 0
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
          if (cancelled) return
          setPreviewUi(
            mapBorrowSupplyPreviewToActionUi(preview, {
              symbol: market?.display.visuals.map((visual) => visual.symbol).join(" / ") ?? "LP",
              amountUsd: safeAmount,
              marketLabel,
              poolLabel: market?.display.name ?? marketLabel,
              collateralSymbol: market?.display.visuals[0]?.symbol ?? "LP",
              borrowSymbol: market?.display.visuals[1]?.symbol ?? "",
              collateralFactorPct,
              collateralRiskPct: Math.max(0, liquidationPct - collateralFactorPct),
              borrowableAssetsLabel: borrowableAssets.map((asset) => asset.symbol).join(", ") || "—",
              borrowableAssetSymbols: borrowableAssets.map((asset) => asset.symbol),
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

    if (kind === "repay") {
      if (safeAmount <= 0 || !debtPosition) {
        setPreviewUi(null)
        return undefined
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
          if (cancelled) return
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
        .catch(() => {
          if (!cancelled) setPreviewUi(null)
        })
      return () => {
        cancelled = true
      }
    }

    if (kind === "remove") {
      const percentBps = parseActionPercentBps(percent)
      const position = session.state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === marketId)
      if (percentBps == null || !position) {
        setPreviewUi(null)
        return undefined
      }
      const pct = percentBps / 100
      const removePreview = buildHomeRemovePreview(session.state, walletId, marketId, pct)
      const pool = session.collateralPools.find((entry) => entry.id === marketId)
      void session
        .previewTransaction(
          session.createIntent({
            type: "removeCollateral",
            walletId,
            positionId: position.id,
            percentBps,
          }),
        )
        .then((preview) => {
          if (cancelled) return
          setPreviewUi(
            mapBorrowRemovePreviewToActionUi(preview, {
              percent: pct,
              safePercent: removePreview.safePercent,
              removeUsd: removePreview.removeUsd,
              marketLabel,
              positionApyPct: pool?.pairApr ?? 0,
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

    if (kind === "claim") {
      const positions = resolveClaimPositions(marketId, claimPositionId)
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
    return undefined
  }, [amount, assetId, claimPositionId, debtPosition, kind, marketId, marketLabel, percent, session, walletId])

  useEffect(() => {
    if (!previewUi || previewUi.allowed || stage !== "configure") return
    if (!isHardBlock(previewUi.blockedReason)) return
    if (previewUi.blockedReason === dismissedBlockedReason) return
    const blocked = mapPreviewToBlockedUi({ product: "borrow", kind, blockedReason: previewUi.blockedReason })
    if (blocked) {
      setBlockedUi(blocked)
      setStage("blocked")
    }
  }, [dismissedBlockedReason, kind, previewUi, stage])

  useEffect(() => {
    setDismissedBlockedReason(null)
  }, [amount, assetId, claimPositionId, debtPositionId, marketId, percent])

  const canGoBackToSelect = useMemo(() => {
    if (embedded) return false
    if (kind === "borrow" && !resolvedInitialAsset) return true
    if (kind === "supply" && !initialMarketId && supplySelectItemsForWallet(session, walletId).length > 1) return true
    if (kind === "repay" && debtPositions.length > 1 && !initialMarketId && !initialDebtId) return true
    if (kind === "claim" && claimSelectItemsForWallet(session, walletId).length > 1 && !initialMarketId && !initialPositionId) return true
    return false
  }, [debtPositions.length, embedded, initialMarketId, initialPositionId, initialDebtId, kind, resolvedInitialAsset, session, walletId])

  const fallbackMaxAmount = useMemo(() => {
    if (kind === "borrow" && assetId) {
      const resolvedAssetId = resolveBorrowAssetId(session.state, assetId, marketId)
      return buildHomeBorrowPreview(session.state, walletId, marketId, resolvedAssetId, 0).remainingBorrowPowerUsd
    }
    if (kind === "repay" && debtPosition) {
      return buildHomeRepayPreview(session.state, walletId, debtPosition.id, 0).remainingDebtUsd
    }
    if (kind === "remove") return previewUi?.maxAmount ?? 100
    if (kind === "supply") return getWalletLpBalanceUsd(walletId, marketId)
    return null
  }, [assetId, debtPosition, kind, marketId, previewUi?.maxAmount, session.state, walletId])

  const fallbackBalanceLabel =
    kind === "borrow"
      ? "Available to Borrow"
      : kind === "repay"
        ? "Remaining debt"
        : kind === "remove"
          ? "Removing"
          : undefined
  const fallbackBalanceValue =
    fallbackMaxAmount != null && (kind === "borrow" || kind === "repay")
      ? formatActionUsd(fallbackMaxAmount)
      : undefined

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("configure")
      setOutcome(null)
      return
    }
    if (stage === "configure" && canGoBackToSelect) {
      router.replace(actionPagePath("borrow", kind))
      return
    }
    router.push(closeHref)
  }, [canGoBackToSelect, closeHref, kind, router, stage])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(successUi?.primaryCtaHref ?? dashboardHrefForProduct("borrow"))
      return
    }
    if (stage === "configure") {
      if (!previewUi?.allowed) return
      setStage("review")
      return
    }
    if (stage !== "review") return
    if (!previewUi?.allowed) return

    setOutcome(null)
    setIsPending(true)

    try {
      const safeAmount = parsePositiveActionAmount(amount) ?? 0
      let intent

      if (kind === "borrow") {
        const resolvedAssetId = resolveBorrowAssetId(session.state, assetId, marketId)
        intent = session.createIntent({
          type: "borrow",
          walletId,
          marketId,
          assetId: resolvedAssetId,
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
          percentBps: parseActionPercentBps(percent) ?? 0,
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
          href: dashboardHrefForProduct("borrow"),
          primaryCtaLabel: successDashboardCtaLabel("borrow"),
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
  }, [amount, assetId, closeHref, debtPosition, descriptor.primaryVerb, kind, marketId, percent, previewUi, router, session, stage, successUi, walletId])

  const applyPercent = useCallback(
    (pct: number) => {
      if (kind === "remove") {
        if (pct === 100 && fallbackMaxAmount != null) setPercent(String(fallbackMaxAmount))
        else setPercent(String(pct))
        return
      }
      const maxAmount = previewUi?.maxAmount ?? fallbackMaxAmount
      if (maxAmount != null) {
        setAmount(formatActionInputAmount((maxAmount * pct) / 100))
      }
    },
    [fallbackMaxAmount, kind, previewUi?.maxAmount],
  )

  const shellSubtitle =
    stage === "select"
      ? kind === "repay"
        ? "Choose the debt to repay."
        : kind === "claim"
          ? "Choose rewards to claim."
          : kind === "supply"
            ? "Choose the LP pool you want to pledge."
            : "Choose the asset to borrow."
      : stage === "success" || stage === "processing" || stage === "review"
        ? undefined
        : descriptor.subtitle
  const hideTitle = embedded || stage === "success" || stage === "processing" || stage === "blocked" || stage === "review"

  return (
    <ActionPageShell
      mode={embedded ? "embedded" : "page"}
      title={descriptor.title}
      subtitle={shellSubtitle}
      hideTitle={hideTitle}
      hideClose={embedded}
      closeHref={closeHref}
      simulated={session.readAdapter.mode === "sandbox"}
    >
      {showCollateralContextBar ? (
        <ActionBorrowContextBar
          kind={kind}
          pool={activePool}
          pools={session.collateralPools}
          token={contextToken}
          tokens={kind === "borrow" ? borrowTokens : kind === "repay" ? repayTokens : undefined}
          debts={debts}
          onPoolChange={handlePoolChange}
          onTokenChange={kind === "borrow" || kind === "repay" ? handleContextTokenChange : undefined}
        />
      ) : null}

      {stage === "select" && !embedded ? (
        <ActionSelectStage
          items={selectItems}
          sectionLabel={kind === "supply" ? "Supported pools" : "Available assets"}
          searchPlaceholder={kind === "supply" ? "Search pools" : "Find an asset"}
          emptyTitle={
            kind === "repay"
              ? "No debt found"
              : kind === "claim"
                ? "Nothing to claim"
                : kind === "supply"
                  ? "No LP tokens in your wallet"
                  : "No assets found"
          }
          emptyDescription={
            kind === "repay"
              ? "Borrow first, then repay from here."
              : kind === "claim"
                ? "You have no claimable rewards right now. Supply collateral and earn fees before claiming."
                : kind === "supply"
                  ? "Add liquidity to a supported pool in your wallet before pledging collateral."
                  : "Try adjusting your search"
          }
          onSelect={(id) => {
            if (kind === "repay") {
              const position = debtPositions.find((entry) => entry.id === id)
              if (!position) return
              router.replace(
                actionPagePath("borrow", "repay", {
                  debt: id,
                  ...(position.marketId ? { market: position.marketId } : {}),
                }),
              )
              return
            }
            if (kind === "claim") {
              const claimItem = HOME_CLAIM_POSITIONS.find((entry) => entry.id === id)
              if (!claimItem) return
              router.replace(
                actionPagePath("borrow", "claim", {
                  position: id,
                  market: resolveClaimMarketId(claimItem.poolId),
                }),
              )
              return
            }
            if (kind === "supply") {
              router.replace(actionPagePath("borrow", "supply", { market: id }))
              return
            }
            const resolvedMarket = resolveBorrowMarketForAsset(session, id, selectMarketId)
            router.replace(
              actionPagePath("borrow", "borrow", {
                asset: id,
                ...(resolvedMarket ? { market: resolvedMarket } : {}),
              }),
            )
          }}
        />
      ) : null}

      {stage === "processing" ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} />
      ) : null}

      {stage === "review" && previewUi ? (
        <ActionReviewStage
          title={reviewStageTitle(descriptor.primaryVerb)}
          subtitle="Confirm the details below before signing."
          preview={previewUi}
          primaryLabel={descriptor.primaryVerb}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={kind === "remove" ? percent : amount}
          onAmountChange={kind === "remove" ? setPercent : setAmount}
          preview={previewUi}
          assetSymbol={
            kind === "supply"
              ? (session.state.markets[marketId]?.display.name ?? assetSymbol)
              : supplyPairSymbols
                ? supplyPairSymbols[0]
                : assetSymbol
          }
          borrowSymbol={supplyPairSymbols?.[1]}
          assetOptions={
            kind === "borrow"
              ? borrowAssetOptions
              : kind === "repay"
                ? repayAssetOptions
                : kind === "claim"
                  ? claimAssetOptions
                  : kind === "supply"
                    ? supplyAssetOptions
                    : undefined
          }
          selectedAssetId={
            kind === "repay" ? debtPositionId : kind === "claim" ? claimPositionId : kind === "supply" ? marketId : assetId
          }
          onAssetSelect={(id) => {
            if (kind === "repay") {
              const position = debtPositions.find((entry) => entry.id === id)
              if (!position) return
              setDebtPositionId(id)
              if (position.marketId) setMarketId(position.marketId)
              setAmount("")
              return
            }
            if (kind === "claim") {
              const claimItem = HOME_CLAIM_POSITIONS.find((entry) => entry.id === id)
              if (!claimItem) return
              setClaimPositionId(id)
              setMarketId(resolveClaimMarketId(claimItem.poolId))
              setAmount("")
              return
            }
            if (kind === "supply") {
              setMarketId(id)
              setAmount("")
              return
            }
            setAssetId(resolveBorrowAssetId(session.state, id, selectMarketId))
            setMarketId(resolveBorrowMarketForAsset(session, id, selectMarketId))
            setAmount("")
          }}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          secondaryHref={canGoBackToSelect ? undefined : closeHref}
          canGoBack={canGoBackToSelect}
          isPending={isPending}
          outcome={outcome}
        />
      ) : null}

      {blockedUi ? (
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
