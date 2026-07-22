"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionReceipt, type TransactionReceiptData } from "@/app/components/action-page/transaction-receipt"
import { syntheticBlockFromHash, syntheticNetworkFeeUsdFromHash } from "@/app/lib/action-system/synthetic-receipt"
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

/** Map a stored synthetic transaction to the shared receipt shape. */
function toReceiptData(receipt: {
  at: number
  syntheticTxHash: string
  amountUsd: number
  product?: string
  kind?: string
  marketSlug?: string | null
  assetId?: string | null
}): TransactionReceiptData {
  const hash = receipt.syntheticTxHash
  const symbol = receipt.assetId ? receipt.assetId.toUpperCase() : "Asset"
  const verb = receipt.kind ? prettyKind(receipt.kind) : "Transaction"
  return {
    title: symbol !== "Asset" ? `${verb} ${symbol}` : verb,
    symbol,
    amountRowLabel: verb,
    amountUsd: receipt.amountUsd,
    marketValue: receipt.marketSlug ?? null,
    networkFeeUsd: syntheticNetworkFeeUsdFromHash(hash),
    block: syntheticBlockFromHash(hash),
    dateMs: receipt.at,
    hash,
  }
}

export function swapTransactionToReceiptData(transaction: SwapTransactionRecord): TransactionReceiptData {
  const inputAsset = getSwapAsset(transaction.inputAssetId)
  const outputAsset = getSwapAsset(transaction.outputAssetId)
  const inputSymbol = inputAsset?.symbol ?? transaction.inputAssetId.toUpperCase()
  const outputSymbol = outputAsset?.symbol ?? transaction.outputAssetId.toUpperCase()
  const hash = transaction.swapTransactionHash ?? transaction.approvalTransactionHash ?? transaction.id
  return {
    title: `Swap ${inputSymbol} for ${outputSymbol}`,
    description:
      transaction.status === "confirmed"
        ? `${transaction.inputAmount.toLocaleString()} ${inputSymbol} swapped for ${transaction.outputAmount.toLocaleString()} ${outputSymbol}.`
        : (transaction.failureReason ?? "Swap did not complete."),
    symbol: inputSymbol,
    amountRowLabel: "Sold",
    amountLabel: `${transaction.inputAmount.toLocaleString()} ${inputSymbol}`,
    amountUsd: transaction.inputAmount * (inputAsset?.priceUsd ?? 0),
    rateLabel: "Received",
    rateValue: `${transaction.outputAmount.toLocaleString()} ${outputSymbol}`,
    marketValue: transaction.provider,
    networkFeeUsd: transaction.networkFeeUsd,
    block: syntheticBlockFromHash(hash),
    dateMs: transaction.confirmedAt ?? transaction.createdAt,
    hash,
    metrics: [
      {
        id: "minimum-received",
        label: "Minimum received",
        value: `${transaction.minimumOutputAmount.toLocaleString()} ${outputSymbol}`,
      },
      { id: "price-impact", label: "Price impact", value: `${transaction.priceImpactPct.toFixed(2)}%` },
      { id: "slippage", label: "Max slippage", value: `${(transaction.slippageBps / 100).toFixed(2)}%` },
    ],
    quoteId: transaction.quoteId,
  }
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
