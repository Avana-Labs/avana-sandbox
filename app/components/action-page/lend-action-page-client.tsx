"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAvanaIdentity, useLendSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { getWalletBalanceForLendMarket } from "@/app/lib/lend-system/wallet-balances"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor, actionPagePath } from "@/app/lib/action-system/contracts"
import { mapLendDepositPreviewToActionUi, mapLendWithdrawPreviewToActionUi } from "@/app/lib/action-system/adapters/lend-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionSelectStage } from "@/app/components/action-page/action-select-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { useActionNetworkGuard } from "@/app/lib/web3/use-action-network-guard"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { lendDepositSelectItems, lendWithdrawSelectItems } from "@/app/lib/action-system/resolve-lend-context"
import { formatLendMarketDropdownSublabel, formatLendMarketValueLabel } from "@/app/lib/lend-system/market-labels"
import { formatActionFeeSummary } from "@/app/lib/action-system/formatters"
import { isConfigureVisibleStage, isProcessingStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { humanizeBlockedReason } from "@/app/lib/action-system/blocked-reason"

export function LendActionPageClient({
  kind,
  closeHref = "/lend",
  embedded = false,
  sidebar = false,
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
  const { exact } = useCurrency()
  const { t } = useTranslation()
  const { walletId } = useAvanaIdentity()
  const session = useLendSessionContext()
  const priceFor = usePriceFor()
  const depositItems = useMemo(
    () => (kind === "deposit" ? lendDepositSelectItems(session, walletId) : []),
    [kind, session, walletId],
  )
  const withdrawItems = useMemo(
    () => (kind === "withdraw" ? lendWithdrawSelectItems(session, walletId) : []),
    [kind, session, walletId],
  )
  // A lend market is "available" whenever it exists in the catalog or session. An
  // unknown initial id (stale link) is treated as "no initial market" so the user
  // lands on the picker instead of a "Market unavailable" dead-end.
  const validInitialMarketId =
    initialMarketId && (session.state.markets[initialMarketId] ?? getLendMarketById(initialMarketId))
      ? initialMarketId
      : undefined
  const hasInvalidInitialMarket = Boolean(initialMarketId) && !validInitialMarketId
  const [marketId, setMarketId] = useState(() => validInitialMarketId ?? (kind === "deposit" ? "gho" : ""))
  const [stage, setStage] = useState<ActionStage>(() => {
    if (embedded) return "configure"
    if (hasInvalidInitialMarket) return "select"
    if (kind === "withdraw" && !validInitialMarketId) return "select"
    if (kind === "deposit" && !validInitialMarketId) return "select"
    return "configure"
  })
  const [amount, setAmount] = useState(initialAmount)
  // Input stays bound to `amount`; the engine preview below keys off the deferred value so
  // it runs on the settled input, not once per keystroke (the INP lever). See borrow client.
  const deferredAmount = useDeferredValue(amount)
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  // Wrong-network submit gate (read via ref inside handlePrimary; see borrow client).
  const networkGuard = useActionNetworkGuard()
  const networkGuardRef = useRef(networkGuard)
  networkGuardRef.current = networkGuard
  const [isPending, setIsPending] = useState(false)

  const market = useMemo(
    () => (marketId ? (session.state.markets[marketId] ?? getLendMarketById(marketId)) : null),
    [marketId, session.state.markets],
  )
  const assetPriceUsd = market ? (priceFor(market.asset.symbol) ?? market.assetPriceUsd) : 0

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
    if (!validInitialMarketId) return
    setMarketId(validInitialMarketId)
    setStage("configure")
  }, [embedded, validInitialMarketId])

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
    const parsed = parsePositiveActionAmount(deferredAmount)
    if (parsed == null) {
      setPreviewUi(null)
      return
    }

    if (kind === "withdraw" && !position) {
      setPreviewUi({
        allowed: false,
        amountLabel: `${parsed} ${market.asset.symbol}`,
        amountUsdLabel: exact(0),
        rateLabel: t("Withdrawal"),
        rateValue: "—",
        marketLabel: t("Market"),
        marketValue: formatLendMarketValueLabel(market.asset.symbol),
        balanceLabel: t("Deposited"),
        balanceValue: "0",
        maxAmount: 0,
        metrics: [],
        networkFeeLabel: formatActionFeeSummary(0, 0.03),
        risk: null,
        blockedReason: t("No deposited position found for this market."),
        validationErrors: [t("No deposited position found for this market.")],
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
              assetPriceUsd,
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
            assetPriceUsd,
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setPreviewUi(null)
      })
    return () => {
      cancelled = true
    }
  }, [deferredAmount, assetPriceUsd, kind, market, position, session, walletId])

  useEffect(() => {
    // Editing inputs after a failed submit clears the stale error banner and returns to
    // configure so the CTA is actionable again instead of stuck showing the old error.
    setOutcome(null)
    setStage((prev) => (prev === "error" ? "configure" : prev))
  }, [amount, marketId])

  const canGoBackToSelect = useMemo(() => {
    if (embedded) return false
    if (initialMarketId) return false
    if (kind === "withdraw") return withdrawItems.length > 1
    if (kind === "deposit") return depositItems.length > 1
    return false
  }, [depositItems.length, embedded, initialMarketId, kind, withdrawItems.length])
  // Max fills the relevant balance: wallet balance for deposit, max withdrawable
  // for withdraw. Both are already surfaced as preview.maxAmount by the mapper.
  const handleMax = useCallback(() => {
    if (previewUi?.maxAmount == null || previewUi.maxAmount <= 0) return
    setAmount(String(Number(previewUi.maxAmount.toFixed(6))))
  }, [previewUi?.maxAmount])

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
      const parsed = parsePositiveActionAmount(amount)
      if (parsed == null) throw new Error(t("Enter a valid amount"))
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
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? t("Action unavailable"))

      const simulated = session.readAdapter.mode === "sandbox"
      const result = await runActionSubmitFlow({
        simulated,
        needsAllowance: kind === "deposit",
        onStage: setStage,
        execute: async () => session.executeTransaction(preview.intent),
      })

      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? t("Transaction failed"))
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
      const rawMessage = error instanceof Error ? error.message : t("Unable to sign the transaction")
      // Raw backend codes stay in logs; users see plain-language copy (issue #143).
      if (process.env.NODE_ENV !== "production") console.error(rawMessage)
      setOutcome({
        tone: "error",
        title: t("Something went wrong"),
        message: humanizeBlockedReason(rawMessage) ?? t("Unable to sign the transaction"),
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, descriptor.primaryVerb, exact, isPending, kind, market, position, previewUi, router, session, stage, successUi, t, walletId])

  // Never dead-end on "Market unavailable": an unknown id routes to the picker
  // (stage "select") above. This only guards the impossible no-market/non-select
  // case and renders nothing rather than an error card.
  if (!market && stage !== "select") return null

  const hideTitle = embedded || stage === "success" || isProcessingStage(stage) || stage === "review"
  const isHomeLayout = embedded && layout === "home"
  const shellSubtitle =
    stage === "select" && kind === "withdraw"
      ? t("Choose the market to withdraw from.")
      : stage === "select" && kind === "deposit"
        ? t("Choose the asset to deposit.")
        : stage === "success" || isProcessingStage(stage) || stage === "review"
          ? undefined
          : descriptor.subtitle

  return (
    <ActionPageShell
      mode={embedded ? "embedded" : "page"}
      density={sidebar ? "sidebar" : isHomeLayout ? "home" : "default"}
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
          sectionLabel={kind === "withdraw" ? t("Your positions") : t("Supported assets")}
          searchPlaceholder={kind === "withdraw" ? t("Find an asset") : t("Search assets")}
          emptyTitle={kind === "withdraw" ? t("No deposits found") : t("No assets in your wallet")}
          emptyDescription={
            kind === "withdraw"
              ? t("Deposit first, then withdraw from here.")
              : t("You need to hold a supported asset in your wallet before you can deposit.")
          }
          onSelect={(id) => {
            router.replace(actionPagePath("lend", kind, { market: id }))
          }}
        />
      ) : null}

      {isProcessingStage(stage) ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} stage={stage} />
      ) : null}

      {stage === "review" && previewUi ? (
        <ActionReviewStage
          title={reviewStageTitle(descriptor.primaryVerb)}
          subtitle={t("Confirm the details below before signing.")}
          preview={previewUi}
          primaryLabel={descriptor.primaryVerb}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          primaryPending={isPending}
          blockedReason={networkGuard.blockedReason}
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) && market ? (
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
          singlePrimaryCta={sidebar}
          hideAssetSelector={isHomeLayout && Boolean(initialMarketId)}
          showBalance
          onMax={handleMax}
        />
      ) : null}
    </ActionPageShell>
  )
}
