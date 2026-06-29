"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLendSessionContext, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { getWalletBalanceForLendMarket } from "@/app/lib/lend-system/wallet-balances"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import type { ActionBlockedUi, ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor, actionPagePath } from "@/app/lib/action-system/contracts"
import { mapLendDepositPreviewToActionUi, mapLendWithdrawPreviewToActionUi } from "@/app/lib/action-system/adapters/lend-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionNotFound } from "@/app/components/action-page/action-not-found"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"
import { ActionSelectStage } from "@/app/components/action-page/action-select-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { mapPreviewToBlockedUi, blockedUiForMissingWalletAsset } from "@/app/lib/action-system/blocked-ui"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { lendDepositSelectItems, lendWithdrawSelectItems } from "@/app/lib/action-system/resolve-lend-context"
import { formatLendMarketDropdownSublabel, formatLendMarketValueLabel } from "@/app/lib/lend-system/market-labels"
import { formatActionFeeSummary } from "@/app/lib/action-system/formatters"
import { isConfigureVisibleStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"

function isHardBlock(reason: string | null) {
  if (!reason) return false
  const lower = reason.toLowerCase()
  return lower.includes("insufficient") || lower.includes("balance") || lower.includes("unavailable")
}

export function LendActionPageClient({
  kind,
  closeHref = "/lend",
  embedded = false,
  sidebar: _sidebar = false,
  layout = "default",
  initialMarketId,
  initialAmount = "",
}: {
  kind: "deposit" | "withdraw"
  closeHref?: string
  embedded?: boolean
  sidebar?: boolean
  layout?: "default" | "home"
  initialMarketId?: string
  initialAmount?: string
}) {
  const descriptor = getActionDescriptor("lend", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useLendSessionContext()
  const depositItems = useMemo(
    () => (kind === "deposit" ? lendDepositSelectItems(session, walletId) : []),
    [kind, session, walletId],
  )
  const withdrawItems = useMemo(
    () => (kind === "withdraw" ? lendWithdrawSelectItems(session, walletId) : []),
    [kind, session, walletId],
  )
  const [marketId, setMarketId] = useState(() => initialMarketId ?? (kind === "deposit" ? "gho" : ""))
  const [stage, setStage] = useState<ActionStage>(() => {
    if (embedded) return "configure"
    if (kind === "withdraw" && !initialMarketId) return "select"
    if (kind === "deposit" && !initialMarketId) return "select"
    return "configure"
  })
  const [amount, setAmount] = useState(initialAmount)
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [blockedUi, setBlockedUi] = useState<ActionBlockedUi | null>(null)
  const [dismissedBlockedReason, setDismissedBlockedReason] = useState<string | null>(null)
  const [dismissedWalletBlock, setDismissedWalletBlock] = useState(false)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const market = useMemo(
    () => (marketId ? (session.state.markets[marketId] ?? getLendMarketById(marketId)) : null),
    [marketId, session.state.markets],
  )

  const depositAssetOptions = useMemo(() => {
    if (kind !== "deposit") return undefined
    const options = Object.values(session.state.markets)
      .filter((entry) => getWalletBalanceForLendMarket(session.state, walletId, entry) > 0)
      .map((entry) => ({
        id: entry.marketId,
        label: entry.asset.symbol,
        symbol: entry.asset.symbol,
        sublabel: formatLendMarketDropdownSublabel(entry.asset.symbol),
      }))
    return options.length > 1 ? options : undefined
  }, [kind, session.state, walletId])

  useEffect(() => {
    if (embedded || kind !== "withdraw" || initialMarketId || marketId) return
    if (withdrawItems.length === 1) {
      router.replace(actionPagePath("lend", "withdraw", { market: withdrawItems[0]!.id }))
      return
    }
    if (withdrawItems.length > 1) setStage("select")
  }, [embedded, initialMarketId, kind, marketId, router, withdrawItems])

  useEffect(() => {
    if (embedded) return
    if (!initialMarketId) return
    setMarketId(initialMarketId)
    setStage("configure")
  }, [embedded, initialMarketId])

  useEffect(() => {
    if (kind !== "deposit" || !market || stage !== "configure" || dismissedWalletBlock) return
    const walletBalance = getWalletBalanceForLendMarket(session.state, walletId, market)
    if (walletBalance > 0) {
      setBlockedUi(null)
      return
    }
    setBlockedUi(blockedUiForMissingWalletAsset(market.asset.symbol, "deposit"))
    if (!embedded) setStage("blocked")
  }, [dismissedWalletBlock, embedded, kind, market, session.state, stage, walletId])

  useEffect(() => {
    setDismissedWalletBlock(false)
  }, [marketId])

  const position = useMemo(
    () =>
      Object.values(session.state.positions).find(
        (entry) => entry.walletId === walletId && entry.marketId === market?.marketId && entry.status === "active",
      ),
    [market?.marketId, session.state.positions, walletId],
  )

  useEffect(() => {
    if (!market) return
    let cancelled = false
    const parsed = parsePositiveActionAmount(amount)
    if (parsed == null) {
      setPreviewUi(null)
      return
    }

    if (kind === "withdraw" && !position) {
      setPreviewUi({
        allowed: false,
        amountLabel: `${parsed} ${market.asset.symbol}`,
        amountUsdLabel: "≈ $0.00",
        rateLabel: "Withdrawal",
        rateValue: "—",
        marketLabel: "Market",
        marketValue: formatLendMarketValueLabel(market.asset.symbol),
        balanceLabel: "Deposited",
        balanceValue: "0",
        maxAmount: 0,
        metrics: [],
        networkFeeLabel: formatActionFeeSummary(0, 0.03),
        risk: null,
        blockedReason: "No deposited position found for this market.",
        validationErrors: ["No deposited position found for this market."],
        warnings: [],
      })
      return
    }

    const action =
      kind === "deposit"
        ? ({
            type: "deposit" as const,
            walletId,
            marketId: market.marketId,
            depositAmount: parsed,
            walletBalance: getWalletBalanceForLendMarket(session.state, walletId, market),
          } as const)
        : ({
            type: "withdraw" as const,
            walletId,
            marketId: market.marketId,
            positionId: position!.positionId,
            withdrawAmount: parsed,
          } as const)

    void session
      .previewTransaction(session.createIntent(action))
      .then((preview) => {
        if (cancelled) return
        if (kind === "deposit") {
          setPreviewUi(
            mapLendDepositPreviewToActionUi(preview, {
              symbol: market.asset.symbol,
              amount: parsed,
              marketLabel: formatLendMarketValueLabel(market.asset.symbol),
              balanceAmount: getWalletBalanceForLendMarket(session.state, walletId, market),
              rewardsApy: market.rewardsApy,
            }),
          )
          return
        }
        setPreviewUi(
          mapLendWithdrawPreviewToActionUi(preview, {
            symbol: market.asset.symbol,
            amount: parsed,
            marketLabel: formatLendMarketValueLabel(market.asset.symbol),
            balanceAmount: position?.currentSuppliedAmount ?? 0,
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setPreviewUi(null)
      })
    return () => {
      cancelled = true
    }
  }, [amount, kind, market, position, session, walletId])

  useEffect(() => {
    if (!previewUi || previewUi.allowed || stage !== "configure") return
    if (!isHardBlock(previewUi.blockedReason)) return
    if (previewUi.blockedReason === dismissedBlockedReason) return
    const blocked = mapPreviewToBlockedUi({ product: "lend", kind, blockedReason: previewUi.blockedReason })
    if (blocked) {
      setBlockedUi(blocked)
      if (!embedded) setStage("blocked")
    }
  }, [dismissedBlockedReason, embedded, kind, previewUi, stage])

  useEffect(() => {
    setDismissedBlockedReason(null)
  }, [amount, marketId])

  const canGoBackToSelect = useMemo(() => {
    if (embedded) return false
    if (initialMarketId) return false
    if (kind === "withdraw") return withdrawItems.length > 1
    if (kind === "deposit") return depositItems.length > 1
    return false
  }, [depositItems.length, embedded, initialMarketId, kind, withdrawItems.length])
  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("configure")
      setOutcome(null)
      return
    }
    if (stage === "configure" && canGoBackToSelect) {
      router.replace(actionPagePath("lend", kind))
      return
    }
    router.push(closeHref)
  }, [canGoBackToSelect, closeHref, kind, router, stage])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(successUi?.primaryCtaHref ?? dashboardHrefForProduct("lend"))
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
      const parsed = parsePositiveActionAmount(amount)
      if (parsed == null) throw new Error("Enter a valid amount")
      const action =
        kind === "deposit"
          ? {
              type: "deposit" as const,
              walletId,
              marketId: market.marketId,
              depositAmount: parsed,
              walletBalance: getWalletBalanceForLendMarket(session.state, walletId, market),
            }
          : {
              type: "withdraw" as const,
              walletId,
              marketId: market.marketId,
              positionId: position!.positionId,
              withdrawAmount: parsed,
            }
      const intent = session.createIntent(action)
      const preview = await session.previewTransaction(intent)
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? "Action unavailable")

      const simulated = session.readAdapter.mode === "sandbox"
      const result = await runActionSubmitFlow({
        simulated,
        needsAllowance: kind === "deposit",
        onStage: setStage,
        execute: async () => session.executeTransaction(preview.intent),
      })

      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")
      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${parsed.toFixed(4)} ${market.asset.symbol} processed.`,
          receiptHash: result.receipt.hash ?? null,
          metrics: previewUi.metrics,
          href: dashboardHrefForProduct("lend"),
          primaryCtaLabel: successDashboardCtaLabel("lend"),
          preview: previewUi,
          verb: descriptor.primaryVerb,
        }),
      )
      setStage("success")
    } catch (error) {
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unable to sign the transaction",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, descriptor.primaryVerb, isPending, kind, market, position, previewUi, router, session, stage, successUi, walletId])

  if (!market && stage !== "select") {
    return (
      <ActionNotFound
        closeHref={closeHref}
        title="Market unavailable"
        message="We couldn't find that lending market. Pick one from the lend page to continue."
      />
    )
  }

  const hideTitle = embedded || stage === "success" || stage === "processing" || stage === "blocked" || stage === "review"
  const isHomeLayout = embedded && layout === "home"
  const showInlineBlocked = embedded && Boolean(blockedUi) && isConfigureVisibleStage(stage)
  const shellSubtitle =
    stage === "select" && kind === "withdraw"
      ? "Choose the market to withdraw from."
      : stage === "select" && kind === "deposit"
        ? "Choose the asset to deposit."
        : stage === "success" || stage === "processing" || stage === "review"
          ? undefined
          : descriptor.subtitle

  return (
    <ActionPageShell
      mode={embedded ? "embedded" : "page"}
      density={isHomeLayout ? "home" : "default"}
      title={descriptor.title}
      subtitle={shellSubtitle}
      hideTitle={hideTitle}
      hideClose={embedded}
      closeHref={closeHref}
      simulated={session.readAdapter.mode === "sandbox"}
    >
      {stage === "select" && !embedded ? (
        <ActionSelectStage
          items={kind === "withdraw" ? withdrawItems : depositItems}
          sectionLabel={kind === "withdraw" ? "Your positions" : "Supported assets"}
          searchPlaceholder={kind === "withdraw" ? "Find an asset" : "Search assets"}
          emptyTitle={kind === "withdraw" ? "No deposits found" : "No assets in your wallet"}
          emptyDescription={
            kind === "withdraw"
              ? "Deposit first, then withdraw from here."
              : "You need to hold a supported asset in your wallet before you can deposit."
          }
          onSelect={(id) => {
            router.replace(actionPagePath("lend", kind, { market: id }))
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
            setDismissedWalletBlock(true)
            setBlockedUi(null)
            setDismissedBlockedReason(previewUi?.blockedReason ?? null)
          }}
        />
      ) : null}

      {isConfigureVisibleStage(stage) && market && !showInlineBlocked ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={setAmount}
          preview={previewUi}
          assetSymbol={market.asset.symbol}
          assetOptions={depositAssetOptions}
          selectedAssetId={market.marketId}
          onAssetSelect={(id) => {
            setMarketId(id)
            setAmount("")
          }}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          secondaryHref={canGoBackToSelect ? undefined : closeHref}
          canGoBack={canGoBackToSelect}
          isPending={isPending}
          outcome={outcome}
          homeLayout={isHomeLayout}
          hideAssetSelector={isHomeLayout && Boolean(initialMarketId)}
        />
      ) : null}

      {blockedUi && !embedded ? (
        <ActionBlockedDialog
          variant="modal"
          blocked={blockedUi}
          open={stage === "blocked"}
          onClose={() => {
            setDismissedWalletBlock(true)
            setDismissedBlockedReason(previewUi?.blockedReason ?? null)
            setStage("configure")
          }}
        />
      ) : null}
    </ActionPageShell>
  )
}
