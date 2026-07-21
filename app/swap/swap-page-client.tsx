"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown } from "@/app/components/icons"
import { TokenIcon } from "@/app/components/token-icon"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SWAP_ASSETS, SWAP_CHAIN_ID, getMaxSwapInputAmount, validateSwapInputAmount } from "@/app/lib/swap-system"
import { useSwapSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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

export function SwapPageClient({ initialFrom, initialTo, origin = "wallet", returnHref = "/dashboard?tab=wallet" }: SwapPageClientProps) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const swap = useSwapSessionContext()
  const swappableAssets = SWAP_ASSETS.filter((asset) => asset.isSwapEnabled && !asset.isLpToken)
  const [inputAssetId, setInputAssetId] = useState(initialFrom ?? "eth")
  const [outputAssetId, setOutputAssetId] = useState(initialTo && initialTo !== inputAssetId ? initialTo : fallbackOutput(inputAssetId))
  const [amount, setAmount] = useState("")
  const [slippageBps, setSlippageBps] = useState(50)
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "valid" | "error">("idle")
  const [reviewOpen, setReviewOpen] = useState(false)
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

  const assetOptions = useMemo(
    () =>
      swappableAssets.map((asset) => (
        <option key={asset.id} value={asset.id}>
          {asset.symbol}
        </option>
      )),
    [swappableAssets],
  )

  useEffect(() => {
    setOutcome(null)
    if (!validation.valid) {
      setQuote(null)
      setQuoteState("idle")
      return
    }

    let cancelled = false
    setQuoteState("loading")
    const timeout = window.setTimeout(() => {
      void swap
        .getQuote({
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
  }, [inputAssetId, outputAssetId, slippageBps, swap, validation])

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

  const handlePrimary = async () => {
    if (!validation.valid || !quote) return
    if (approvalRequired) {
      const approval = await swap.approve(inputAsset.id, validation.amount)
      if (approval.status !== "approval_confirmed") {
        setOutcome({ tone: "error", message: approval.failureReason ?? t("Approval failed.") })
      }
      return
    }
    setReviewOpen(true)
  }

  const confirmSwap = async () => {
    if (!quote) return
    const result = await swap.executeSwap(quote)
    setReviewOpen(false)
    setOutcome({
      tone: result.status === "confirmed" ? "success" : "error",
      message: result.status === "confirmed" ? t("Swap successful.") : (result.failureReason ?? t("Swap failed.")),
    })
    if (result.status === "confirmed") {
      setAmount("")
      setQuote(null)
    }
  }

  const primaryLabel = !inputBalance
    ? t("Insufficient balance")
    : !validation.valid
      ? t(validation.reason === "invalid_amount" ? "Enter an amount" : "Swap unavailable")
      : quoteState === "loading"
        ? t("Loading quote")
        : quoteState === "error"
          ? t("Refresh quote")
          : approvalRequired
            ? t("Approve {symbol}").replace("{symbol}", inputAsset.symbol)
            : t("Review swap")

  return (
    <ActionPageShell title="Swap" subtitle={`Choose which assets to swap on Ethereum${origin !== "wallet" ? ` · ${origin}` : ""}`} closeHref={returnHref}>
      <div className="space-y-4">
        <div className="rounded-radius-xl border border-border bg-card p-4">
          <SwapAssetField
            label={t("Sell")}
            amount={amount}
            onAmountChange={setAmount}
            assetId={inputAssetId}
            onAssetChange={(assetId) => {
              setInputAssetId(assetId)
              if (assetId === outputAssetId) setOutputAssetId(fallbackOutput(assetId))
            }}
            assetOptions={assetOptions}
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
            onAssetChange={(assetId) => {
              setOutputAssetId(assetId)
              if (assetId === inputAssetId) setInputAssetId(fallbackOutput(assetId))
            }}
            assetOptions={assetOptions}
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
          <QuoteRow label={t("Rate")} value={quote ? `1 ${inputAsset.symbol} = ${formatAmount(quote.exchangeRate)} ${outputAsset.symbol}` : "—"} />
          <QuoteRow label={t("Minimum received")} value={quote ? `${formatAmount(quote.minimumOutputAmount)} ${outputAsset.symbol}` : "—"} />
          <QuoteRow label={t("Price impact")} value={quote ? `${quote.priceImpactPct.toFixed(2)}%` : "—"} valueClassName={priceImpactTone} />
          <QuoteRow label={t("Network fee")} value={quote ? exact(quote.networkFeeUsd) : "—"} />
          <QuoteRow label={t("Provider")} value={quote?.provider ?? "—"} />
        </div>

        {outcome ? (
          <div
            className={`rounded-radius-xl border p-4 text-[14px] ${
              outcome.tone === "success" ? "border-brand/30 bg-brand/10 text-foreground" : "border-danger/30 bg-danger/10 text-foreground"
            }`}
          >
            {outcome.message}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Link href={returnHref} className={secondaryCtaClass({ className: "w-full" })}>
            {t("Cancel")}
          </Link>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={!validation.valid || quoteState === "loading" || (!quote && quoteState !== "error")}
            className={primaryCtaClass({
              disabled: !validation.valid || quoteState === "loading" || (!quote && quoteState !== "error"),
              className: "w-full",
            })}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Review swap")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[14px]">
            <QuoteRow label={t("Sell")} value={`${amount || "0"} ${inputAsset.symbol}`} />
            <QuoteRow label={t("Receive")} value={quote ? `${formatAmount(quote.estimatedOutputAmount)} ${outputAsset.symbol}` : "—"} />
            <QuoteRow label={t("Minimum received")} value={quote ? `${formatAmount(quote.minimumOutputAmount)} ${outputAsset.symbol}` : "—"} />
            <QuoteRow label={t("Network")} value="Ethereum" />
            <QuoteRow label={t("Destination")} value={t("Wallet")} />
            <button type="button" onClick={confirmSwap} className={primaryCtaClass({ className: "mt-3 w-full" })}>
              {t("Confirm swap")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </ActionPageShell>
  )
}

function SwapAssetField({
  label,
  amount,
  onAmountChange,
  assetId,
  onAssetChange,
  assetOptions,
  balanceLabel,
  fiatLabel,
  readOnly = false,
}: {
  label: string
  amount: string
  onAmountChange?: (value: string) => void
  assetId: string
  onAssetChange: (assetId: string) => void
  assetOptions: React.ReactNode
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
        <label className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-[14px] font-semibold text-foreground">
          <TokenIcon symbol={asset.symbol} size="sm" />
          <select
            value={assetId}
            onChange={(event) => onAssetChange(event.target.value)}
            className="bg-transparent outline-none"
            aria-label={`${label} asset`}
          >
            {assetOptions}
          </select>
        </label>
      </div>
      <div className="text-[13px] text-muted-foreground">{fiatLabel}</div>
    </div>
  )
}

function QuoteRow({ label, value, valueClassName = "text-foreground" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-3 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-right font-data text-[13px] font-medium tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  )
}
