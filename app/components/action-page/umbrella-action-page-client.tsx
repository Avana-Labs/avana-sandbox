"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { formatActionFeeSummary } from "@/app/lib/action-system/formatters"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { isConfigureVisibleStage, isProcessingStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"
import { parsePositiveActionAmount } from "@/app/lib/action-system/amount-input"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"

type UmbrellaActionKind = "stake" | "claim" | "cooldown" | "unstake"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUnits(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: Number.isInteger(value) ? 0 : 4 })
}

function previewFor({
  kind,
  amount,
  marketId,
  umbrella,
}: {
  kind: UmbrellaActionKind
  amount: number
  marketId: UmbrellaMarketId
  umbrella: ReturnType<typeof useUmbrellaSessionContext>
}): ActionPreviewUi {
  const market = umbrella.markets[marketId]
  const position = umbrella.positions[marketId]
  const walletBalance = umbrella.walletBalances[marketId] ?? 0
  const activeStake = Math.max(0, position.amount - position.cooldownAmount)
  const maxAmount =
    kind === "stake" ? walletBalance : kind === "cooldown" ? activeStake : kind === "unstake" ? position.cooldownAmount : null
  const amountUsd = kind === "claim" ? position.pendingRewardsUsd : amount * market.priceUsd
  const blockedReason =
    kind === "stake" && amount > walletBalance
      ? `Insufficient ${market.symbol} balance`
      : kind === "cooldown" && amount > activeStake
        ? `Insufficient active ${market.symbol}`
        : kind === "unstake" && amount > position.cooldownAmount
          ? `Insufficient cooled ${market.symbol}`
          : kind === "unstake" && position.cooldownStatus !== "ready"
            ? "Cooldown is not ready"
            : kind === "claim" && position.pendingRewardsUsd <= 0
              ? "No Umbrella rewards to claim"
              : null
  const allowed = kind === "claim" ? !blockedReason : amount > 0 && !blockedReason
  const verb = kind === "cooldown" ? "Start cooldown" : kind === "unstake" ? "Unstake" : kind === "claim" ? "Claim" : "Stake"

  return {
    allowed,
    amountLabel: kind === "claim" ? formatUsd(position.pendingRewardsUsd) : `${formatUnits(amount)} ${market.symbol}`,
    amountUsd,
    amountUsdLabel: formatUsd(amountUsd),
    rateLabel: kind === "claim" ? "Claim total" : "Umbrella APY",
    rateValue: kind === "claim" ? formatUsd(position.pendingRewardsUsd) : `${market.apy.toFixed(2)}%`,
    marketLabel: "Module",
    marketValue: market.asset,
    balanceLabel: kind === "stake" ? "Wallet balance" : kind === "cooldown" ? "Active stake" : "Cooled stake",
    balanceValue:
      kind === "stake"
        ? `${formatUnits(walletBalance)} ${market.symbol}`
        : kind === "cooldown"
          ? `${formatUnits(activeStake)} ${market.symbol}`
          : `${formatUnits(position.cooldownAmount)} ${market.symbol}`,
    maxAmount,
    assetSymbol: market.symbol,
    metrics: [
      { id: "coverage", label: "Coverage", value: market.coverage },
      { id: "total-staked", label: "Market staked", value: formatUsd(market.totalStakedUsd) },
      ...(kind === "cooldown"
        ? [
            { id: "cooldown", label: "Cooldown", value: "20 days" },
            { id: "withdrawal-window", label: "Withdrawal window", value: "2 days" },
          ]
        : []),
    ],
    networkFeeLabel: formatActionFeeSummary(0, 0.03),
    risk:
      kind === "stake" || kind === "cooldown"
        ? { level: "warning", title: "Slashable stake", message: "Umbrella stake remains slashable while active and during cooldown." }
        : null,
    blockedReason,
    validationErrors: blockedReason ? [blockedReason] : [],
    warnings: kind === "unstake" ? ["Withdrawal only succeeds during the open withdrawal window."] : [],
    amountTitle: verb,
  }
}

export function UmbrellaActionPageClient({
  kind,
  closeHref = "/umbrella",
  initialMarketId,
  initialAmount = "",
  embedded = false,
  sidebar = false,
}: {
  kind: UmbrellaActionKind
  closeHref?: string
  initialMarketId?: string
  initialAmount?: string
  embedded?: boolean
  sidebar?: boolean
}) {
  const descriptor = getActionDescriptor("umbrella", kind)
  const router = useRouter()
  const umbrella = useUmbrellaSessionContext()
  const [marketId, setMarketId] = useState<UmbrellaMarketId>(
    initialMarketId && umbrella.marketOrder.includes(initialMarketId as UmbrellaMarketId)
      ? (initialMarketId as UmbrellaMarketId)
      : "gho",
  )
  const [amount, setAmount] = useState(initialAmount)
  const [stage, setStage] = useState<ActionStage>("configure")
  const [isPending, setIsPending] = useState(false)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error"; title: string; message: string } | null>(null)
  const market = umbrella.markets[marketId]
  const position = umbrella.positions[marketId]
  const parsedAmount = parsePositiveActionAmount(amount) ?? 0
  const preview = useMemo(
    () => previewFor({ kind, amount: parsedAmount, marketId, umbrella }),
    [kind, marketId, parsedAmount, umbrella],
  )
  const assetOptions = umbrella.marketOrder.map((id) => ({
    id,
    label: umbrella.markets[id].symbol,
    symbol: umbrella.markets[id].symbol,
    sublabel: `${umbrella.markets[id].apy.toFixed(2)}% APY`,
  }))

  const submit = async () => {
    if (stage === "success") {
      router.push(successUi?.primaryCtaHref ?? dashboardHrefForProduct("umbrella"))
      return
    }
    if (stage === "configure") {
      if (!preview.allowed) return
      setStage("review")
      return
    }
    if (stage !== "review" || isPending || !preview.allowed) return
    setIsPending(true)
    setOutcome(null)
    try {
      const result = await runActionSubmitFlow({
        simulated: true,
        needsAllowance: kind === "stake",
        onStage: setStage,
        execute: async () => {
          const tx: { status: "success" | "failed"; hash: string } =
            kind === "stake"
              ? await umbrella.stake(marketId, parsedAmount)
              : kind === "claim"
                ? await umbrella.claim(marketId)
                : kind === "cooldown"
                  ? await umbrella.startCooldown(marketId, parsedAmount)
                  : await umbrella.unstake(marketId, parsedAmount)
          return { receipt: { status: tx.status, hash: tx.hash } }
        },
      })
      if (result.receipt.status !== "success") throw new Error("Transaction failed")
      setSuccessUi({
        title: `${descriptor.primaryVerb} successful`,
        description: `${preview.amountLabel} processed in ${market.asset}.`,
        receiptHash: result.receipt.hash ?? null,
        metrics: preview.metrics,
        primaryCtaLabel: successDashboardCtaLabel("umbrella"),
        primaryCtaHref: dashboardHrefForProduct("umbrella"),
        secondaryCtaLabel: "Back to Umbrella",
        receiptContext: {
          verb: descriptor.primaryVerb,
          amountUsd: preview.amountUsd,
          amountLabel: preview.amountLabel,
          rateLabel: preview.rateLabel,
          rateValue: preview.rateValue,
          marketValue: preview.marketValue,
        },
      })
      setStage("success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Umbrella action failed"
      setOutcome({ tone: "error", title: "Something went wrong", message })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }

  const back = () => {
    if (stage === "review" || stage === "error") {
      setStage("configure")
      return
    }
    router.push(closeHref)
  }

  const hideTitle = embedded || stage === "success" || isProcessingStage(stage) || stage === "review"
  const amountReadOnly = kind === "claim"

  return (
    <ActionPageShell
      title={descriptor.title}
      subtitle={hideTitle ? undefined : descriptor.subtitle}
      hideTitle={hideTitle}
      closeHref={closeHref}
      mode={embedded ? "embedded" : "page"}
      density={sidebar ? "sidebar" : "default"}
      hideClose={embedded}
      flowHeaderStage={!embedded ? stage : undefined}
      simulated
    >
      {isProcessingStage(stage) ? <ActionProcessingStage verb={descriptor.primaryVerb} preview={preview} closeHref={closeHref} stage={stage} /> : null}
      {stage === "review" ? (
        <ActionReviewStage
          title={reviewStageTitle(descriptor.primaryVerb)}
          subtitle="Confirm the details below before signing."
          preview={preview}
          primaryLabel={descriptor.primaryVerb}
          onPrimary={() => void submit()}
          onSecondary={back}
          primaryPending={isPending}
        />
      ) : null}
      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}
      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={kind === "claim" ? String(position.pendingRewardsUsd) : amount}
          onAmountChange={setAmount}
          preview={preview}
          assetSymbol={market.symbol}
          assetOptions={assetOptions}
          selectedAssetId={marketId}
          onAssetSelect={(id) => {
            setMarketId(id as UmbrellaMarketId)
            setAmount("")
          }}
          onPrimary={() => void submit()}
          onSecondary={back}
          secondaryHref={closeHref}
          isPending={isPending}
          outcome={outcome}
          amountReadOnly={amountReadOnly}
          amountVariant={sidebar ? "raised" : "card"}
          showBalance
          balanceLabel={preview.balanceLabel}
          balanceValue={preview.balanceValue}
          onMax={() => {
            if (preview.maxAmount != null) setAmount(String(preview.maxAmount))
          }}
          singlePrimaryCta={sidebar}
        />
      ) : null}
    </ActionPageShell>
  )
}
