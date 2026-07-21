"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown } from "@/app/components/icons"
import { TokenIcon } from "@/app/components/token-icon"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { SwapAssetPickerDialog } from "./swap-asset-picker-dialog"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"
import { SWAP_ASSETS, SWAP_CHAIN_ID, getMaxSwapInputAmount, validateSwapInputAmount } from "@/app/lib/swap-system"
import { useSwapSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import type { SwapQuote } from "@/app/lib/swap-system"

type SwapPageClientProps = {
  initialFrom?: string
  initialTo?: string
  origin?: string
  returnHref?: string
}

function fallbackOutput(inputAssetId: string) {
  return inputAssetId === "usdc" ? "eth" : "usdc"
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return "0"
  if (value === 0) return "0"
  if (value < 0.0001) return "<0.0001"
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export function SwapPageClient({
  initialFrom,
  initialTo,
  origin = "wallet",
  returnHref = "/dashboard?tab=wallet",
}: SwapPageClientProps) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const swap = useSwapSessionContext()
  const swappableAssets = SWAP_ASSETS.filter((asset) => asset.isSwapEnabled && !asset.isLpToken)
  const [inputAssetId, setInputAssetId] = useState(initialFrom ?? "eth")
  const [outputAssetId, setOutputAssetId] = useState(
    initialTo && initialTo !== inputAssetId ? initialTo : fallbackOutput(inputAssetId),
  )
  const [amount, setAmount] = useState("")
  const [slippageBps, setSlippageBps] = useState(50)
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "valid" | "error">("idle")
  const [quoteRetry, setQuoteRetry] = useState(0)
  const [stage, setStage] = useState<ActionStage>("configure")
  const [isPending, setIsPending] = useState(false)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [pickerSide, setPickerSide] = useState<"input" | "output" | null>(null)
  const [acceptedPriceImpact, setAcceptedPriceImpact] = useState(false)
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  const inputAsset = SWAP_ASSETS.find((asset) => asset.id === inputAssetId) ?? swappableAssets[0]!
  const outputAsset = SWAP_ASSETS.find((asset) => asset.id === outputAssetId) ?? swappableAssets[1]!
  const inputBalance = swap.walletBalances.find(
    (balance) => balance.assetId === inputAsset.id && balance.sourceType === "wallet",
  )
  const maxAmount = inputBalance
    ? getMaxSwapInputAmount(inputBalance, { originProduct: "wallet", chainId: SWAP_CHAIN_ID, outputAssetId })
    : 0
  const validation = useMemo(
    () =>
      inputBalance
        ? validateSwapInputAmount({
            amountText: amount,
            balance: inputBalance,
            context: { originProduct: "wallet", chainId: SWAP_CHAIN_ID, outputAssetId },
          })
        : ({ valid: false, reason: "insufficient_balance", amount: null, maxAmount: 0 } as const),
    [amount, inputBalance, outputAssetId],
  )
  const approvalRequired = validation.valid && swap.requiresApproval(inputAsset.id, validation.amount)
  const priceImpactTone = quote && quote.priceImpactPct >= 3 ? "text-danger" : "text-muted-foreground"
  const getQuote = swap.getQuote

  useEffect(() => {
    if (!validation.valid) {
      setQuote(null)
      setQuoteState("idle")
      return
    }

    let cancelled = false
    setQuoteState("loading")
    const timeout = window.setTimeout(() => {
      void getQuote({
        chainId: SWAP_CHAIN_ID,
        inputAssetId,
        outputAssetId,
        inputAmount: validation.amount,
        slippageBps,
      })
        .then((nextQuote) => {
          if (cancelled) return
          setQuote(nextQuote.status === "valid" ? nextQuote : null)
          setQuoteState(nextQuote.status === "valid" ? "valid" : "error")
        })
        .catch(() => {
          if (!cancelled) setQuoteState("error")
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [getQuote, inputAssetId, outputAssetId, quoteRetry, slippageBps, validation])

  useEffect(() => {
    setOutcome(null)
    setAcceptedPriceImpact(false)
    setStage((current) => (current === "error" ? "configure" : current))
  }, [amount, inputAssetId, outputAssetId, slippageBps])

  const setPercent = (percent: number) => {
    if (maxAmount <= 0) return
    setAmount(String(Number((maxAmount * percent).toFixed(6))))
  }

  const reversePair = () => {
    const nextInput = outputAssetId
    const nextOutput = inputAssetId
    const nextInputBalance = swap.walletBalances.find(
      (balance) => balance.assetId === nextInput && balance.sourceType === "wallet",
    )
    if (!nextInputBalance) return
    setInputAssetId(nextInput)
    setOutputAssetId(nextOutput)
    setAmount("")
    setQuote(null)
  }

  const previewUi = useMemo<ActionPreviewUi | null>(() => {
    if (!quote || !validation.valid) return null
    const receiveLabel = `${formatAmount(quote.estimatedOutputAmount)} ${outputAsset.symbol}`
    return {
      allowed: true,
      quoteId: quote.id,
      amountLabel: `${amount} ${inputAsset.symbol}`,
      amountTitle: t("Sell"),
      amountValue: amount,
      assetLabel: inputAsset.symbol,
      assetSymbol: inputAsset.symbol,
      amountUsd: validation.amount * inputAsset.priceUsd,
      amountUsdLabel: exact(validation.amount * inputAsset.priceUsd),
      rateLabel: t("Rate"),
      rateValue: `1 ${inputAsset.symbol} = ${formatAmount(quote.exchangeRate)} ${outputAsset.symbol}`,
      marketLabel: t("Receive at least"),
      marketValue: receiveLabel,
      balanceLabel: t("Balance"),
      balanceValue: `${formatAmount(maxAmount)} ${inputAsset.symbol}`,
      maxAmount,
      metrics: [
        {
          id: "minimum-received",
          label: t("Minimum received"),
          value: `${formatAmount(quote.minimumOutputAmount)} ${outputAsset.symbol}`,
        },
        {
          id: "price-impact",
          label: t("Price impact"),
          value: `${quote.priceImpactPct.toFixed(2)}%`,
          tone: quote.priceImpactPct >= 3 ? "danger" : "default",
        },
        { id: "provider", label: t("Provider"), value: quote.provider },
      ],
      networkFeeLabel: exact(quote.networkFeeUsd),
      risk:
        quote.priceImpactPct >= 3
          ? {
              level: "danger",
              title: t("Large price difference"),
              message: t("You will receive significantly less than the current market value."),
            }
          : null,
      blockedReason: null,
      validationErrors: [],
      warnings: [],
      executionSteps: [
        ...(approvalRequired ? [{ id: "approve", label: `Approve ${inputAsset.symbol}` }] : []),
        { id: "sign", label: t("Confirm swap in wallet") },
        { id: "submit", label: t("Submit swap") },
        { id: "refresh", label: t("Refresh wallet balances") },
      ],
    }
  }, [amount, approvalRequired, exact, inputAsset, maxAmount, outputAsset, quote, t, validation])

  const submitSwap = useCallback(async () => {
    if (!quote || !previewUi || !validation.valid || isPending) return
    if (quote.priceImpactPct >= 3 && !acceptedPriceImpact) return
    setIsPending(true)
    setOutcome(null)
    try {
      let executionQuote = quote
      if (Date.now() >= quote.expiresAt) {
        const refreshedQuote = await getQuote({
          chainId: SWAP_CHAIN_ID,
          inputAssetId,
          outputAssetId,
          inputAmount: validation.amount,
          slippageBps,
        })
        if (refreshedQuote.status !== "valid") throw new Error(t("Unable to refresh the expired quote."))
        const outputChanged =
          Math.abs(refreshedQuote.estimatedOutputAmount - quote.estimatedOutputAmount) /
            Math.max(quote.estimatedOutputAmount, Number.EPSILON) >
          0.005
        setQuote(refreshedQuote)
        executionQuote = refreshedQuote
        if (outputChanged) {
          setOutcome({ tone: "error", message: t("The quote changed. Review the updated amount before continuing.") })
          setStage("configure")
          return
        }
      }
      const result = await runActionSubmitFlow({
        simulated: true,
        needsAllowance: approvalRequired,
        onStage: setStage,
        execute: async () => {
          if (approvalRequired) {
            const approval = await swap.approve(inputAsset.id, validation.amount)
            if (approval.status !== "approval_confirmed") {
              throw new Error(approval.failureReason ?? t("Approval failed."))
            }
          }
          const transaction = await swap.executeSwap(executionQuote)
          return {
            transaction,
            receipt: {
              status: transaction.status === "confirmed" ? "success" : transaction.status,
              error: transaction.failureReason ?? null,
              hash: transaction.swapTransactionHash ?? null,
            },
          }
        },
      })
      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? t("Swap failed."))
      setSuccessUi({
        quoteId: executionQuote.id,
        title: t("Swap successful."),
        description: `${amount} ${inputAsset.symbol} ${t("swapped for")} ${formatAmount(executionQuote.estimatedOutputAmount)} ${outputAsset.symbol}.`,
        receiptHash: result.receipt.hash,
        metrics: previewUi.metrics,
        primaryCtaLabel: t("View wallet"),
        primaryCtaHref: "/dashboard?tab=wallet",
        secondaryCtaLabel: t("Swap again"),
        receiptContext: {
          verb: t("Sold"),
          amountUsd: validation.amount * inputAsset.priceUsd,
          amountLabel: `${amount} ${inputAsset.symbol}`,
          rateLabel: t("Received"),
          rateValue: `${formatAmount(executionQuote.estimatedOutputAmount)} ${outputAsset.symbol}`,
          marketValue: executionQuote.provider,
        },
      })
      setStage("success")
    } catch (error) {
      setOutcome({ tone: "error", message: error instanceof Error ? error.message : t("Swap failed.") })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [
    acceptedPriceImpact,
    amount,
    approvalRequired,
    getQuote,
    inputAsset,
    inputAssetId,
    isPending,
    outputAsset,
    outputAssetId,
    previewUi,
    quote,
    slippageBps,
    swap,
    t,
    validation,
  ])

  const resetSwap = useCallback(() => {
    setAmount("")
    setQuote(null)
    setSuccessUi(null)
    setOutcome(null)
    setStage("configure")
  }, [])

  const primaryLabel = !inputBalance
    ? "Insufficient balance"
    : !validation.valid
      ? validation.reason === "invalid_amount"
        ? "Enter an amount"
        : "Swap unavailable"
      : quoteState === "loading"
        ? "Loading quote"
        : quoteState === "error"
          ? "Refresh quote"
          : "Review swap"

  const isTransactionStage = [
    "approve_allowance",
    "wallet_sign",
    "processing",
    "submitted",
    "confirmed",
    "refreshing_position",
    "reconciled",
  ].includes(stage)

  return (
    <ActionPageShell
      title="Swap"
      subtitle={`Choose which assets to swap on Ethereum${origin !== "wallet" ? ` · ${origin}` : ""}`}
      closeHref={returnHref}
      flowHeaderStage={stage}
      flowHeaderMobileOnly
      hideTitle={stage === "review" || stage === "success" || isTransactionStage}
      className="lg:pt-10"
    >
      {isTransactionStage ? (
        <ActionProcessingStage verb="Swap" preview={previewUi} closeHref={returnHref} stage={stage} />
      ) : null}

      {stage === "success" && successUi ? (
        <ActionSuccessStage success={successUi} closeHref={returnHref} onSecondary={resetSwap} />
      ) : null}

      {stage === "review" && previewUi ? (
        <ActionReviewStage
          title={t("Review swap")}
          subtitle={t("Confirm the details below before signing.")}
          preview={previewUi}
          primaryLabel={t("Swap")}
          onPrimary={() => void submitSwap()}
          onSecondary={() => setStage("configure")}
          primaryPending={isPending}
          confirmationGate={
            quote && quote.priceImpactPct >= 3
              ? {
                  checked: acceptedPriceImpact,
                  onCheckedChange: setAcceptedPriceImpact,
                  label: t("I understand this swap may result in a significant loss of value."),
                }
              : undefined
          }
        />
      ) : null}

      {stage === "configure" || stage === "error" ? (
        <div className="space-y-4">
          <div className="rounded-radius-xl border border-border bg-card p-4">
            <SwapAssetField
              label={t("Sell")}
              amount={amount}
              onAmountChange={setAmount}
              assetId={inputAssetId}
              onOpenAssetPicker={() => setPickerSide("input")}
              balanceLabel={`${t("Balance")}: ${formatAmount(maxAmount)} ${inputAsset.symbol}`}
              fiatLabel={exact((Number(amount) || 0) * inputAsset.priceUsd)}
            />

            <div className="-my-1 flex justify-center">
              <button
                type="button"
                onClick={reversePair}
                aria-label={t("Reverse swap direction")}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground hover:text-foreground"
              >
                <ArrowDown className="size-4" />
              </button>
            </div>

            <SwapAssetField
              label={t("Receive at least")}
              amount={quote ? formatAmount(quote.estimatedOutputAmount) : "0"}
              readOnly
              assetId={outputAssetId}
              onOpenAssetPicker={() => setPickerSide("output")}
              fiatLabel={quote ? exact(quote.estimatedOutputAmount * outputAsset.priceUsd) : exact(0)}
            />

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[0.25, 0.5, 0.75, 1].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setPercent(percent)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {percent === 1 ? t("Max") : `${percent * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-radius-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-muted-foreground">{t("Max slippage")}</span>
              <select
                value={slippageBps}
                onChange={(event) => setSlippageBps(Number(event.target.value))}
                className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[13px] text-foreground"
              >
                <option value={10}>0.1%</option>
                <option value={50}>0.5%</option>
                <option value={100}>1%</option>
                <option value={300}>3%</option>
              </select>
            </div>
          </div>

          <div className="rounded-radius-xl border border-border bg-card p-4">
            <QuoteRow
              label={t("Rate")}
              value={quote ? `1 ${inputAsset.symbol} = ${formatAmount(quote.exchangeRate)} ${outputAsset.symbol}` : "—"}
            />
            <QuoteRow
              label={t("Minimum received")}
              value={quote ? `${formatAmount(quote.minimumOutputAmount)} ${outputAsset.symbol}` : "—"}
            />
            <QuoteRow
              label={t("Price impact")}
              value={quote ? `${quote.priceImpactPct.toFixed(2)}%` : "—"}
              valueClassName={priceImpactTone}
            />
            <QuoteRow label={t("Network fee")} value={quote ? exact(quote.networkFeeUsd) : "—"} />
            <QuoteRow label={t("Provider")} value={quote?.provider ?? "—"} />
          </div>

          {outcome ? (
            <div
              className={`rounded-radius-xl border p-4 text-[14px] ${
                outcome.tone === "success"
                  ? "border-brand/30 bg-brand/10 text-foreground"
                  : "border-danger/30 bg-danger/10 text-foreground"
              }`}
            >
              {outcome.message}
            </div>
          ) : null}

          <ActionFooter
            primaryLabel={primaryLabel}
            secondaryHref={returnHref}
            primaryDisabled={!validation.valid || quoteState === "loading" || (!quote && quoteState !== "error")}
            onPrimary={() => {
              if (quoteState === "error") {
                setQuoteRetry((current) => current + 1)
                return
              }
              if (previewUi) setStage("review")
            }}
            sticky
          />
        </div>
      ) : null}

      <SwapAssetPickerDialog
        open={pickerSide !== null}
        onOpenChange={(open) => {
          if (!open) setPickerSide(null)
        }}
        title={pickerSide === "input" ? "Sell" : "Receive"}
        assets={swappableAssets}
        balances={swap.walletBalances}
        selectedAssetId={pickerSide === "input" ? inputAssetId : outputAssetId}
        excludedAssetId={pickerSide === "input" ? outputAssetId : inputAssetId}
        onSelect={(assetId) => {
          if (pickerSide === "input") setInputAssetId(assetId)
          if (pickerSide === "output") setOutputAssetId(assetId)
        }}
      />
    </ActionPageShell>
  )
}

function SwapAssetField({
  label,
  amount,
  onAmountChange,
  assetId,
  onOpenAssetPicker,
  balanceLabel,
  fiatLabel,
  readOnly = false,
}: {
  label: string
  amount: string
  onAmountChange?: (value: string) => void
  assetId: string
  onOpenAssetPicker: () => void
  balanceLabel?: string
  fiatLabel: string
  readOnly?: boolean
}) {
  const asset = SWAP_ASSETS.find((item) => item.id === assetId)!
  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span>{label}</span>
        {balanceLabel ? <span>{balanceLabel}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <input
          value={amount}
          readOnly={readOnly}
          onChange={(event) => onAmountChange?.(event.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 font-data text-[32px] font-medium leading-none text-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder="0"
          aria-label={label}
        />
        <button
          type="button"
          onClick={onOpenAssetPicker}
          aria-label={`${label} asset`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-[14px] font-semibold text-foreground"
        >
          <TokenIcon symbol={asset.symbol} size="sm" />
          <span>{asset.symbol}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ▾
          </span>
        </button>
      </div>
      <div className="text-[13px] text-muted-foreground">{fiatLabel}</div>
    </div>
  )
}

function QuoteRow({
  label,
  value,
  valueClassName = "text-foreground",
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-3 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-right font-data text-[13px] font-medium tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  )
}
