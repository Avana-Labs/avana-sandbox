"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionReceipt, type TransactionReceiptData } from "@/app/components/action-page/transaction-receipt"
import { syntheticBlockFromHash, syntheticNetworkFeeUsdFromHash } from "@/app/lib/action-system/synthetic-receipt"
import { SANDBOX_NETWORK_FEE_USD } from "@/app/lib/action-system/formatters"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useSwapSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { getSwapAsset, type SwapTransactionRecord } from "@/app/lib/swap-system"

const KIND_VERB: Record<string, string> = {
  borrow: "Borrow",
  deposit: "Deposit",
  withdraw: "Withdraw",
  repay: "Repay",
  claim: "Claim",
  multiply: "Multiply",
  deleverage: "Deleverage",
  liquidate: "Liquidate",
}

function prettyKind(kind: string) {
  return KIND_VERB[kind] ?? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`
}

/**
 * Shared swap-receipt builder so the in-session record and the durable Convex row
 * render an identical breakdown. `succeeded` picks the summary line; optional economics
 * are shown only when present (a durable row seeded before this change omits them, and a
 * failed swap has no meaningful min-received / impact).
 */
function buildSwapReceiptData(input: {
  inputSymbol: string
  outputSymbol: string
  inputAmount: number
  outputAmount: number
  amountUsd: number
  hash: string
  dateMs: number
  succeeded: boolean
  failureReason?: string
  provider?: string | null
  networkFeeUsd?: number
  minOutputAmount?: number
  priceImpactPct?: number
  slippageBps?: number
  quoteId?: string
}): TransactionReceiptData {
  const metrics: NonNullable<TransactionReceiptData["metrics"]> = []
  if (input.minOutputAmount !== undefined) {
    metrics.push({
      id: "minimum-received",
      label: "Minimum received",
      value: `${input.minOutputAmount.toLocaleString()} ${input.outputSymbol}`,
    })
  }
  if (input.priceImpactPct !== undefined) {
    metrics.push({ id: "price-impact", label: "Price impact", value: `${input.priceImpactPct.toFixed(2)}%` })
  }
  if (input.slippageBps !== undefined) {
    metrics.push({ id: "slippage", label: "Max slippage", value: `${(input.slippageBps / 100).toFixed(2)}%` })
  }
  return {
    title: `Swap ${input.inputSymbol} for ${input.outputSymbol}`,
    description: input.succeeded
      ? `${input.inputAmount.toLocaleString()} ${input.inputSymbol} swapped for ${input.outputAmount.toLocaleString()} ${input.outputSymbol}.`
      : (input.failureReason ?? "Swap did not complete."),
    symbol: input.inputSymbol,
    amountRowLabel: "Sold",
    amountLabel: `${input.inputAmount.toLocaleString()} ${input.inputSymbol}`,
    amountUsd: input.amountUsd,
    rateLabel: "Received",
    rateValue: `${input.outputAmount.toLocaleString()} ${input.outputSymbol}`,
    marketValue: input.provider ?? null,
    networkFeeUsd: input.networkFeeUsd ?? syntheticNetworkFeeUsdFromHash(input.hash),
    block: syntheticBlockFromHash(input.hash),
    dateMs: input.dateMs,
    hash: input.hash,
    metrics: metrics.length ? metrics : undefined,
    quoteId: input.quoteId,
  }
}

/** Map a stored synthetic transaction (durable Convex row) to the shared receipt shape. */
export function toReceiptData(receipt: {
  at: number
  syntheticTxHash: string
  amountUsd: number
  product?: string
  kind?: string
  status?: string
  marketSlug?: string | null
  assetId?: string | null
  swapInputSymbol?: string
  swapOutputSymbol?: string
  swapInputAmount?: number
  swapOutputAmount?: number
  swapProvider?: string
  swapQuoteId?: string
  swapNetworkFeeUsd?: number
  swapMinOutputAmount?: number
  swapPriceImpactPct?: number
  swapSlippageBps?: number
}): TransactionReceiptData {
  const hash = receipt.syntheticTxHash
  if (receipt.product === "swap") {
    return buildSwapReceiptData({
      inputSymbol: receipt.swapInputSymbol ?? "Asset",
      outputSymbol: receipt.swapOutputSymbol ?? "Asset",
      inputAmount: receipt.swapInputAmount ?? 0,
      outputAmount: receipt.swapOutputAmount ?? 0,
      amountUsd: receipt.amountUsd,
      hash,
      dateMs: receipt.at,
      succeeded: receipt.status !== "failed",
      provider: receipt.swapProvider,
      networkFeeUsd: receipt.swapNetworkFeeUsd,
      minOutputAmount: receipt.swapMinOutputAmount,
      priceImpactPct: receipt.swapPriceImpactPct,
      slippageBps: receipt.swapSlippageBps,
      quoteId: receipt.swapQuoteId,
    })
  }
  // Prefer the traded asset for the icon/title, then fall back to the market slug so a
  // row that only recorded its market (common for lend deposits) still resolves a real
  // token icon instead of the "?" placeholder + a missing-asset 404.
  const symbol = (receipt.assetId ?? receipt.marketSlug ?? "").toUpperCase() || "Asset"
  const verb = receipt.kind ? prettyKind(receipt.kind) : "Transaction"
  return {
    title: symbol !== "Asset" ? `${verb} ${symbol}` : verb,
    symbol,
    amountRowLabel: verb,
    amountUsd: receipt.amountUsd,
    // Market slugs are stored lowercase ("usdc"); show the ticker uppercased ("USDC").
    marketValue: receipt.marketSlug ? receipt.marketSlug.toUpperCase() : null,
    // The review estimate and the receipt read one canonical fee, so a "~$0.03"
    // estimate can no longer confirm as "$0.89" (#F1).
    networkFeeUsd: SANDBOX_NETWORK_FEE_USD,
    block: syntheticBlockFromHash(hash),
    dateMs: receipt.at,
    hash,
  }
}

export function swapTransactionToReceiptData(transaction: SwapTransactionRecord): TransactionReceiptData {
  const inputAsset = getSwapAsset(transaction.inputAssetId)
  const outputAsset = getSwapAsset(transaction.outputAssetId)
  const hash = transaction.swapTransactionHash ?? transaction.approvalTransactionHash ?? transaction.id
  return buildSwapReceiptData({
    inputSymbol: inputAsset?.symbol ?? transaction.inputAssetId.toUpperCase(),
    outputSymbol: outputAsset?.symbol ?? transaction.outputAssetId.toUpperCase(),
    inputAmount: transaction.inputAmount,
    outputAmount: transaction.outputAmount,
    amountUsd: transaction.inputAmount * (inputAsset?.priceUsd ?? 0),
    hash,
    dateMs: transaction.confirmedAt ?? transaction.createdAt,
    succeeded: transaction.status === "confirmed",
    failureReason: transaction.failureReason,
    provider: transaction.provider,
    networkFeeUsd: transaction.networkFeeUsd,
    minOutputAmount: transaction.minimumOutputAmount,
    priceImpactPct: transaction.priceImpactPct,
    slippageBps: transaction.slippageBps,
    quoteId: transaction.quoteId,
  })
}

export function SyntheticTransactionClient({ hash }: { hash: string }) {
  const { t } = useTranslation()
  const swap = useSwapSessionContext()
  const { authedWallet, isSignedIn } = useSiweAuth()
  const receipt = useQuery(
    api.sandbox.transactions.getTransactionByHash,
    isSignedIn && authedWallet ? { wallet: authedWallet, hash } : "skip",
  )
  const swapTransaction = swap.transactionHistory.find(
    (transaction) =>
      transaction.id === hash ||
      transaction.swapTransactionHash === hash ||
      transaction.approvalTransactionHash === hash,
  )

  // When the backend is unreachable the query stays `undefined` forever, leaving an
  // empty card under the title. Time out so the user gets a clear message instead.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (receipt !== undefined) return
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [receipt])

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 py-16">
      <p className="text-sm text-muted-foreground">{t("Avana sandbox")}</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">{t("Synthetic transaction receipt")}</h1>
      {swapTransaction ? (
        <div className="mx-auto mt-8 max-w-md">
          <TransactionReceipt data={swapTransactionToReceiptData(swapTransaction)} />
        </div>
      ) : !isSignedIn ? (
        <p className="mt-8 text-muted-foreground">{t("Sign in with the wallet that created this transaction.")}</p>
      ) : receipt === undefined ? (
        timedOut ? (
          <p className="mt-8 text-muted-foreground">
            {t("This receipt is taking too long to load. It may not be available in this environment.")}
          </p>
        ) : (
          <Skeleton className="skeleton-enter mt-8 h-32 rounded-3xl" />
        )
      ) : receipt === null ? (
        <p className="mt-8 text-muted-foreground">{t("This receipt does not exist for the authenticated wallet.")}</p>
      ) : (
        <div className="mx-auto mt-8 max-w-md">
          <TransactionReceipt data={toReceiptData(receipt)} />
        </div>
      )}
      <Link
        className="mt-8 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
        href="/dashboard"
      >
        {t("Back to dashboard")}
      </Link>
    </main>
  )
}
