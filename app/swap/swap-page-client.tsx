"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"
import { SwapAssetPickerDialog } from "./swap-asset-picker-dialog"
import { ActionFooter } from "@/app/components/action-page/action-amount-card"
import { SWAP_ASSETS, SWAP_CHAIN_ID, getMaxSwapInputAmount, validateSwapInputAmount } from "@/app/lib/swap-system"
import { useSwapSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { useActionNetworkGuard } from "@/app/lib/web3/use-action-network-guard"
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

export function SwapPageClient({ initialFrom, initialTo, origin = "wallet", returnHref = "/" }: SwapPageClientProps) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const swap = useSwapSessionContext()
  const networkGuard = useActionNetworkGuard()
  const swappableAssets = SWAP_ASSETS.filter((asset) => asset.isSwapEnabled && !asset.isLpToken)
  const [inputAssetId, setInputAssetId] = useState(initialFrom ?? "eth")
  const [outputAssetId, setOutputAssetId] = useState(
    initialTo && initialTo !== inputAssetId ? initialTo : fallbackOutput(inputAssetId),
  )
  const [amount, setAmount] = useState("")
  const slippageBps = 50
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
      // Sell USD must match the post-fee/impact FX (quote.exchangeRate), not raw catalog spot.
      amountUsd: quote.estimatedOutputAmount * outputAsset.priceUsd,
      amountUsdLabel: exact(quote.estimatedOutputAmount * outputAsset.priceUsd),
      rateLabel: t("Rate"),
      rateValue: `1 ${inputAsset.symbol} = ${formatAmount(quote.exchangeRate)} ${outputAsset.symbol}`,
      marketLabel: t("Buy"),
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
      blockedReason: networkGuard.blockedReason,
      validationErrors: [],
      warnings: [],
      // Keep the surfaced steps terse and standard — the same short vocabulary the
      // other actions use — and drop the internal "refresh balances" step, which no
      // other action exposes. (#39)
      executionSteps: [
        ...(approvalRequired ? [{ id: "approve", label: `Approve ${inputAsset.symbol}` }] : []),
        { id: "sign", label: t("Confirm in wallet") },
        { id: "submit", label: t("Submit") },
      ],
    }
  }, [
    amount,
    approvalRequired,
    exact,
    inputAsset,
    maxAmount,
    networkGuard.blockedReason,
    outputAsset,
    quote,
    t,
    validation,
  ])

  const submitSwap = useCallback(async () => {
    if (!quote || !previewUi || !validation.valid || isPending) return
    if (networkGuard.isWrongNetwork) return
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
          // Carry the real quote fee so the inline receipt matches the estimate
          // and the permalink receipt instead of a hash-derived amount.
          networkFeeUsd: executionQuote.networkFeeUsd,
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
    networkGuard.isWrongNetwork,
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
      hideTitle={stage === "review" || stage === "success" || isTransactionStage}
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
          <div className="flex flex-col gap-1">
            <SwapAssetField
              label={t("Sell")}
              amount={amount}
              onAmountChange={setAmount}
              assetId={inputAssetId}
              onOpenAssetPicker={() => setPickerSide("input")}
              fiatLabel={exact((Number(amount) || 0) * inputAsset.priceUsd)}
              balanceLabel={formatAmount(maxAmount)}
              onBalanceClick={() => setAmount(String(Number(maxAmount.toFixed(6))))}
              tone="raised"
            />

            <SwapAssetField
              label={t("Buy")}
              amount={quote ? formatAmount(quote.estimatedOutputAmount) : "0"}
              readOnly
              assetId={outputAssetId}
              onOpenAssetPicker={() => setPickerSide("output")}
              fiatLabel={quote ? exact(quote.estimatedOutputAmount * outputAsset.priceUsd) : exact(0)}
              tone="inset"
            />
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
            primaryDisabled={
              Boolean(networkGuard.blockedReason) ||
              !validation.valid ||
              quoteState === "loading" ||
              (!quote && quoteState !== "error")
            }
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
        title={pickerSide === "input" ? "Sell" : "Buy"}
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
  onBalanceClick,
  fiatLabel,
  tone,
  readOnly = false,
}: {
  label: string
  amount: string
  onAmountChange?: (value: string) => void
  assetId: string
  onOpenAssetPicker: () => void
  balanceLabel?: string
  onBalanceClick?: () => void
  fiatLabel: string
  tone: "raised" | "inset"
  readOnly?: boolean
}) {
  const asset = SWAP_ASSETS.find((item) => item.id === assetId)!
  return (
    <SwapStyleField label={label} tone={tone} className="py-3">
      <div className="mt-1.5 flex min-h-10 items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-stretch">
        <div className="min-w-0 flex-1">
          <input
            value={amount}
            readOnly={readOnly}
            onChange={(event) => onAmountChange?.(event.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className={`w-full min-w-0 border-0 bg-transparent p-0 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] outline-none placeholder:text-muted-foreground/60 ${
              amount && amount !== "0" ? "text-foreground" : "text-muted-foreground/60"
            }`}
            placeholder="0"
            aria-label={label}
          />
        </div>
        <button
          type="button"
          onClick={onOpenAssetPicker}
          aria-label={`${label} asset`}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-[14px] font-medium text-foreground hover:bg-surface-hover max-[360px]:self-end"
        >
          <ActionTokenIcon symbol={asset.symbol} className="size-8" />
          <span>{asset.symbol}</span>
          <span aria-hidden className="text-muted-foreground">
            ▾
          </span>
        </button>
      </div>
      <div className="mt-1 flex min-h-5 items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0 truncate text-foreground/60">{fiatLabel}</span>
        {balanceLabel ? (
          <button
            type="button"
            onClick={onBalanceClick}
            className="max-w-[12rem] shrink-0 truncate text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Balance: <span className="text-foreground">{balanceLabel}</span>
          </button>
        ) : null}
      </div>
    </SwapStyleField>
  )
}
